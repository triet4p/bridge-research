# python-sidecar/src/repositories/chat_repository.py
from sqlmodel import Session, delete, select
from typing import List, Optional
from src.models.chat import ChatSession, ChatMessage

class ChatRepository:
    def __init__(self, session: Session):
        self.session = session

    # --- SESSION ---
    def get_or_create_default_session(self, paper_id: str) -> ChatSession:
        """
        Lấy session mặc định cho bài báo (đơn giản hóa cho Phase này).
        Sau này có thể hỗ trợ nhiều session.
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
        msg = ChatMessage(session_id=session_id, role=role, content=content, references_json=refs)
        self.session.add(msg)
        self.session.commit()
        self.session.refresh(msg)
        return msg

    def get_history(self, session_id: int, limit: int = 10) -> List[ChatMessage]:
        """Lấy N tin nhắn gần nhất để làm context cho AI"""
        statement = select(ChatMessage).where(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc())
        # Lưu ý: Cần lấy tất cả rồi slice cuối, hoặc order desc limit rồi reverse
        # Ở đây lấy đơn giản:
        all_msgs = self.session.exec(statement).all()
        return all_msgs[-limit:] # Lấy limit tin mới nhất
    
    def delete_history(self, paper_id: str):
        """Xóa toàn bộ session và message của bài báo"""
        # 1. Tìm các session liên quan
        statement = select(ChatSession).where(ChatSession.paper_id == paper_id)
        sessions = self.session.exec(statement).all()
        
        for session in sessions:
            # 2. Xóa messages của session đó
            # (SQLAlchemy thường có cascade delete nếu config relationship, 
            # nhưng xóa thủ công ở đây cho chắc nếu chưa config)
            delete_msgs = delete(ChatMessage).where(ChatMessage.session_id == session.id)
            self.session.exec(delete_msgs)
            
            # 3. Xóa session
            self.session.delete(session)
            
        self.session.commit()