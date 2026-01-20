from pydantic import BaseModel

class SummaryRequest(BaseModel):
    text: str
    language: str = "English"

class SummaryResponse(BaseModel):
    summary: str