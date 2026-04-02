from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import select
from backend.deps import SessionDep, AdminDep
from backend.models import Agent, AgentStatus, User
from backend.routers.agents import AgentResponse, AgentListResponse, _to_response

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ── Agent 审核 ──────────────────────────────────────────────

@router.get("/agents", response_model=AgentListResponse)
def list_agents_admin(
    session: SessionDep,
    _admin: AdminDep,
    status: Optional[str] = Query(default=None),
):
    stmt = select(Agent)
    if status:
        try:
            stmt = stmt.where(Agent.status == AgentStatus(status))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
    stmt = stmt.order_by(Agent.created_at.desc())
    items = session.exec(stmt).all()
    return AgentListResponse(items=[_to_response(a) for a in items], total=len(items))


@router.post("/agents/{agent_id}/approve", response_model=AgentResponse)
def approve_agent(agent_id: int, session: SessionDep, _admin: AdminDep):
    agent = session.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    agent.status = AgentStatus.approved
    session.add(agent)
    session.commit()
    session.refresh(agent)
    return _to_response(agent)


@router.post("/agents/{agent_id}/reject", response_model=AgentResponse)
def reject_agent(agent_id: int, session: SessionDep, _admin: AdminDep):
    agent = session.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    agent.status = AgentStatus.rejected
    session.add(agent)
    session.commit()
    session.refresh(agent)
    return _to_response(agent)


@router.delete("/agents/{agent_id}", status_code=204)
def delete_agent(agent_id: int, session: SessionDep, _admin: AdminDep):
    agent = session.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    session.delete(agent)
    session.commit()


# ── 用户管理 ────────────────────────────────────────────────

class UserAdminResponse(BaseModel):
    id: int
    username: str
    email: str
    is_admin: bool
    created_at: str


class UserAdminListResponse(BaseModel):
    items: list[UserAdminResponse]
    total: int


class SetAdminRequest(BaseModel):
    is_admin: bool


@router.get("/users", response_model=UserAdminListResponse)
def list_users(session: SessionDep, current_admin_id: AdminDep):
    users = session.exec(select(User).order_by(User.created_at.desc())).all()
    items = [
        UserAdminResponse(
            id=u.id,
            username=u.username,
            email=u.email,
            is_admin=u.is_admin,
            created_at=u.created_at.isoformat(),
        )
        for u in users
    ]
    return UserAdminListResponse(items=items, total=len(items))


@router.patch("/users/{user_id}/set-admin", response_model=UserAdminResponse)
def set_admin(
    user_id: int,
    req: SetAdminRequest,
    session: SessionDep,
    current_admin_id: AdminDep,
):
    if user_id == current_admin_id:
        raise HTTPException(status_code=400, detail="Cannot change your own admin status")
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_admin = req.is_admin
    session.add(user)
    session.commit()
    session.refresh(user)
    return UserAdminResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        is_admin=user.is_admin,
        created_at=user.created_at.isoformat(),
    )
