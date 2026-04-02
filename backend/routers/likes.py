from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlmodel import select
from backend.deps import SessionDep, CurrentUserDep
from backend.models import Agent, Like

router = APIRouter(tags=["likes"])


class LikeResponse(BaseModel):
    likes_count: int
    liked: bool


@router.post("/api/agents/{agent_id}/like", response_model=LikeResponse)
def toggle_like(agent_id: int, session: SessionDep, user_id: CurrentUserDep):
    agent = session.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    existing = session.exec(
        select(Like).where(Like.agent_id == agent_id, Like.user_id == user_id)
    ).first()

    if existing:
        session.delete(existing)
        agent.likes_count = max(0, agent.likes_count - 1)
        liked = False
    else:
        like = Like(agent_id=agent_id, user_id=user_id)
        session.add(like)
        agent.likes_count += 1
        liked = True

    session.add(agent)
    session.commit()
    session.refresh(agent)
    return LikeResponse(likes_count=agent.likes_count, liked=liked)
