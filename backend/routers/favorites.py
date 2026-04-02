from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlmodel import select
from backend.deps import SessionDep, CurrentUserDep
from backend.models import Agent, Favorite

router = APIRouter(tags=["favorites"])


class FavoriteResponse(BaseModel):
    favorited: bool


@router.post("/api/favorites/{agent_id}", response_model=FavoriteResponse)
def toggle_favorite(agent_id: int, session: SessionDep, user_id: CurrentUserDep):
    agent = session.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    existing = session.exec(
        select(Favorite).where(
            Favorite.agent_id == agent_id, Favorite.user_id == user_id
        )
    ).first()

    if existing:
        session.delete(existing)
        session.commit()
        return FavoriteResponse(favorited=False)
    else:
        fav = Favorite(agent_id=agent_id, user_id=user_id)
        session.add(fav)
        session.commit()
        return FavoriteResponse(favorited=True)


@router.get("/api/favorites/me", response_model=list[int])
def list_my_favorites(session: SessionDep, user_id: CurrentUserDep):
    rows = session.exec(
        select(Favorite.agent_id).where(Favorite.user_id == user_id)
    ).all()
    return list(rows)
