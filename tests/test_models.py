import pytest
from sqlmodel import Session, select, create_engine, SQLModel
from sqlmodel.pool import StaticPool
from backend.models import User, Agent, Comment, Like, AgentStatus


@pytest.fixture(autouse=True)
def test_engine(monkeypatch):
    """每个测试使用独立的内存数据库"""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    monkeypatch.setattr("backend.database.engine", engine)
    yield engine
    SQLModel.metadata.drop_all(engine)


def test_create_user(test_engine):
    with Session(test_engine) as session:
        user = User(username="alice", email="alice@example.com", password_hash="hash")
        session.add(user)
        session.commit()
        session.refresh(user)
        assert user.id is not None
        assert user.is_admin is False


def test_create_agent(test_engine):
    with Session(test_engine) as session:
        user = User(username="bob", email="bob@example.com", password_hash="hash")
        session.add(user)
        session.commit()

        agent = Agent(name="Test Agent", url="http://example.com/share", submitter_id=user.id)
        session.add(agent)
        session.commit()
        session.refresh(agent)
        assert agent.id is not None
        assert agent.status == AgentStatus.pending
        assert agent.likes_count == 0


def test_like_unique_constraint(test_engine):
    with Session(test_engine) as session:
        user = User(username="carol", email="carol@example.com", password_hash="hash")
        session.add(user)
        session.commit()

        agent = Agent(name="Agent2", url="http://example.com/s2", submitter_id=user.id)
        session.add(agent)
        session.commit()

        like1 = Like(agent_id=agent.id, user_id=user.id)
        session.add(like1)
        session.commit()

        import pytest as pt
        from sqlalchemy.exc import IntegrityError
        with pt.raises(IntegrityError):
            like2 = Like(agent_id=agent.id, user_id=user.id)
            session.add(like2)
            session.commit()
