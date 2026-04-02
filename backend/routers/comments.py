from typing import List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlmodel import select
from backend.deps import SessionDep, CurrentUserDep, CurrentUserFullDep
from backend.models import Agent, Comment, User

router = APIRouter(tags=["comments"])


class CommentRequest(BaseModel):
    content: str


class CommentResponse(BaseModel):
    id: int
    content: str
    agent_id: int
    user_id: int
    username: str
    created_at: str


def _to_response(comment: Comment, session) -> CommentResponse:
    user = session.get(User, comment.user_id)
    return CommentResponse(
        id=comment.id,
        content=comment.content,
        agent_id=comment.agent_id,
        user_id=comment.user_id,
        username=user.username if user else "已注销用户",
        created_at=comment.created_at.isoformat(),
    )


@router.get("/api/agents/{agent_id}/comments", response_model=List[CommentResponse])
def list_comments(agent_id: int, session: SessionDep):
    agent = session.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    comments = session.exec(
        select(Comment).where(Comment.agent_id == agent_id).order_by(Comment.created_at)
    ).all()
    return [_to_response(c, session) for c in comments]


@router.post("/api/agents/{agent_id}/comments", response_model=CommentResponse)
def create_comment(agent_id: int, req: CommentRequest, session: SessionDep, user_id: CurrentUserDep):
    agent = session.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    comment = Comment(content=req.content, agent_id=agent_id, user_id=user_id)
    session.add(comment)
    session.commit()
    session.refresh(comment)
    return _to_response(comment, session)


@router.put("/api/agents/{agent_id}/comments/{comment_id}", response_model=CommentResponse)
def update_comment(
    agent_id: int,
    comment_id: int,
    req: CommentRequest,
    session: SessionDep,
    user_id: CurrentUserDep,
):
    comment = session.get(Comment, comment_id)
    if not comment or comment.agent_id != agent_id:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not allowed")
    comment.content = req.content
    session.add(comment)
    session.commit()
    session.refresh(comment)
    return _to_response(comment, session)


@router.delete("/api/agents/{agent_id}/comments/{comment_id}", status_code=204)
def delete_comment(
    agent_id: int,
    comment_id: int,
    session: SessionDep,
    current_user: CurrentUserFullDep,
):
    user_id, is_admin = current_user
    comment = session.get(Comment, comment_id)
    if not comment or comment.agent_id != agent_id:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != user_id and not is_admin:
        raise HTTPException(status_code=403, detail="Not allowed")
    session.delete(comment)
    session.commit()
