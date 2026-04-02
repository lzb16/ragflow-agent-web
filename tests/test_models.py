from sqlmodel import Session, select
from backend.database import engine, create_db_and_tables
from backend.models import User, Agent, Comment, Like, AgentStatus


def test_create_user():
    create_db_and_tables()
    with Session(engine) as session:
        user = User(username="alice", email="alice@example.com", password_hash="hash")
        session.add(user)
        session.commit()
        session.refresh(user)
        assert user.id is not None
        assert user.is_admin is False


def test_create_agent():
    create_db_and_tables()
    with Session(engine) as session:
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


def test_like_unique_constraint():
    create_db_and_tables()
    with Session(engine) as session:
        user = User(username="carol", email="carol@example.com", password_hash="hash")
        session.add(user)
        session.commit()

        agent = Agent(name="Agent2", url="http://example.com/s2", submitter_id=user.id)
        session.add(agent)
        session.commit()

        like1 = Like(agent_id=agent.id, user_id=user.id)
        session.add(like1)
        session.commit()

        import pytest
        from sqlalchemy.exc import IntegrityError
        with pytest.raises(IntegrityError):
            like2 = Like(agent_id=agent.id, user_id=user.id)
            session.add(like2)
            session.commit()
