from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from sqlmodel import select
from backend.deps import SessionDep, AdminDep
from backend.models import Agent, AgentStatus
from backend.routers.agents import AgentResponse, AgentListResponse, _to_response

router = APIRouter(prefix="/api/admin", tags=["admin"])


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
