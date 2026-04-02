import os
import uuid
from typing import Optional, List
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
from pydantic import BaseModel
from sqlmodel import select
from backend.deps import SessionDep, CurrentUserDep
from backend.models import Agent, AgentStatus
import aiofiles

router = APIRouter(prefix="/api/agents", tags=["agents"])

UPLOAD_DIR = "uploads/avatars"
os.makedirs(UPLOAD_DIR, exist_ok=True)
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


class AgentResponse(BaseModel):
    id: int
    name: str
    url: str
    description: Optional[str]
    tags: Optional[str]
    avatar_path: Optional[str]
    usage_guide: Optional[str]
    status: str
    submitter_id: int
    likes_count: int
    created_at: str


class AgentListResponse(BaseModel):
    items: List[AgentResponse]
    total: int


def _to_response(agent: Agent) -> AgentResponse:
    return AgentResponse(
        id=agent.id,
        name=agent.name,
        url=agent.url,
        description=agent.description,
        tags=agent.tags,
        avatar_path=agent.avatar_path,
        usage_guide=agent.usage_guide,
        status=agent.status.value,
        submitter_id=agent.submitter_id,
        likes_count=agent.likes_count,
        created_at=agent.created_at.isoformat(),
    )


@router.get("", response_model=AgentListResponse)
def list_agents(
    session: SessionDep,
    q: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
):
    page_size = 12
    stmt = select(Agent).where(Agent.status == AgentStatus.approved)
    if q:
        stmt = stmt.where(
            (Agent.name.contains(q)) | (Agent.description.contains(q))
        )
    stmt = stmt.order_by(Agent.likes_count.desc())
    all_items = session.exec(stmt).all()
    total = len(all_items)
    start = (page - 1) * page_size
    items = all_items[start: start + page_size]
    return AgentListResponse(items=[_to_response(a) for a in items], total=total)


@router.get("/{agent_id}", response_model=AgentResponse)
def get_agent(agent_id: int, session: SessionDep):
    agent = session.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return _to_response(agent)


@router.post("", response_model=AgentResponse)
async def create_agent(
    session: SessionDep,
    user_id: CurrentUserDep,
    name: str = Form(...),
    url: str = Form(...),
    description: Optional[str] = Form(default=None),
    tags: Optional[str] = Form(default=None),
    usage_guide: Optional[str] = Form(default=None),
    avatar: Optional[UploadFile] = File(default=None),
):
    avatar_path = None
    if avatar and avatar.filename:
        content = await avatar.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File too large (max 5MB)")
        ext = os.path.splitext(avatar.filename)[1] or ".png"
        filename = f"{uuid.uuid4()}{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        async with aiofiles.open(filepath, "wb") as f:
            await f.write(content)
        avatar_path = filepath

    agent = Agent(
        name=name,
        url=url,
        description=description,
        tags=tags,
        usage_guide=usage_guide,
        avatar_path=avatar_path,
        submitter_id=user_id,
    )
    session.add(agent)
    session.commit()
    session.refresh(agent)
    return _to_response(agent)
