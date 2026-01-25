# python-sidecar/src/repositories/chat_repository.py
from sqlmodel import Session, delete, select
from typing import List, Optional
from src.models.chat import ChatSession, ChatMessage

class ChatRepository:
    """
    Repository for managing conversational history (Sessions and Messages).
    """
    
    def __init__(self, session: Session):
        self.session = session

    # --- SESSION ---
    def get_or_create_default_session(self, paper_id: str) -> ChatSession:
        """
        Retrieves the default chat session for a paper, creating one if it doesn't exist.

        Args:
            paper_id (str): The ArXiv ID.

        Returns:
            ChatSession: The active chat session.
            
        ## Note
            Currently, the app supports a single linear chat history per paper.
            This method ensures a session always exists before adding messages.
        """
        statement = select(ChatSession).where(ChatSession.paper_id == paper_id)
        session = self.session.exec(statement).first()
        
        if not session:
            session = ChatSession(paper_id=paper_id, title=f"Chat about {paper_id}")
            self.session.add(session)
            self.session.commit()
            self.session.refresh(session)
            
        return session

    # --- MESSAGES ---
    def add_message(self, session_id: int, role: str, content: str, refs: str = None) -> ChatMessage:
        """
        Appends a new message to a specific session.

        Args:
            session_id (int): ID of the ChatSession.
            role (str): 'user' or 'assistant'.
            content (str): The text content.
            refs (str, optional): JSON string of cited section IDs.

        Returns:
            ChatMessage: The created message.
        """
        msg = ChatMessage(session_id=session_id, role=role, content=content, references_json=refs)
        self.session.add(msg)
        self.session.commit()
        self.session.refresh(msg)
        return msg

    def get_history(self, session_id: int, limit: int = 10) -> List[ChatMessage]:
        """
        Retrieves the most recent messages for context injection.

        Args:
            session_id (int): The session ID.
            limit (int): Maximum number of messages to retrieve.

        Returns:
            List[ChatMessage]: List of messages sorted chronologically.
        """
        statement = select(ChatMessage).where(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc())
        all_msgs = self.session.exec(statement).all()
        return all_msgs[-limit:] # Lấy limit tin mới nhất
    
    def delete_history(self, paper_id: str):
        """
        Hard deletes all chat history associated with a paper.

        This performs a cascade delete manually:
        1. Find all sessions for the paper.
        2. Delete all messages in those sessions.
        3. Delete the sessions.

        Args:
            paper_id (str): The ArXiv ID.
        """
        # 1. Find related sessions
        statement = select(ChatSession).where(ChatSession.paper_id == paper_id)
        sessions = self.session.exec(statement).all()
        
        for session in sessions:
            # 2. Delete messages belonging to the session
            # (Manual deletion ensures cleanup even if DB cascade is not configured)
            delete_msgs = delete(ChatMessage).where(ChatMessage.session_id == session.id)
            self.session.exec(delete_msgs)
            
            # 3. Delete the session itself
            self.session.delete(session)
            
        self.session.commit()