from datetime import datetime
from enum import Enum
from typing import Optional
from sqlmodel import Field, SQLModel, UniqueConstraint


class AgentStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    is_admin: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Agent(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    url: str
    description: Optional[str] = None
    tags: Optional[str] = None
    avatar_path: Optional[str] = None
    usage_guide: Optional[str] = None
    status: AgentStatus = Field(default=AgentStatus.pending)
    submitter_id: int = Field(foreign_key="user.id")
    likes_count: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Comment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    content: str
    agent_id: int = Field(foreign_key="agent.id")
    user_id: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Like(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("agent_id", "user_id"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    agent_id: int = Field(foreign_key="agent.id")
    user_id: int = Field(foreign_key="user.id")
