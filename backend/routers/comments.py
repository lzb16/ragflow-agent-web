from typing import List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlmodel import select
from backend.deps import SessionDep, CurrentUserDep
from backend.models import Agent, Comment

router = APIRouter(tags=["comments"])


class CommentRequest(BaseModel):
    content: str


class CommentResponse(BaseModel):
    id: int
    content: str
    agent_id: int
    user_id: int
    created_at: str


@router.get("/api/agents/{agent_id}/comments", response_model=List[CommentResponse])
def list_comments(agent_id: int, session: SessionDep):
    agent = session.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    comments = session.exec(
        select(Comment).where(Comment.agent_id == agent_id).order_by(Comment.created_at)
    ).all()
    return [
        CommentResponse(
            id=c.id, content=c.content, agent_id=c.agent_id,
            user_id=c.user_id, created_at=c.created_at.isoformat()
        )
        for c in comments
    ]


@router.post("/api/agents/{agent_id}/comments", response_model=CommentResponse)
def create_comment(agent_id: int, req: CommentRequest, session: SessionDep, user_id: CurrentUserDep):
    agent = session.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    comment = Comment(content=req.content, agent_id=agent_id, user_id=user_id)
    session.add(comment)
    session.commit()
    session.refresh(comment)
    return CommentResponse(
        id=comment.id, content=comment.content, agent_id=comment.agent_id,
        user_id=comment.user_id, created_at=comment.created_at.isoformat()
    )
