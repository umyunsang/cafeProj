"""
테스트를 위한 공통 fixture를 제공하는 conftest.py 파일입니다.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app


# 테스트용 인메모리 SQLite 데이터베이스 생성
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    """
    테스트용 데이터베이스 세션 제공
    """
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """
    테스트 클라이언트 제공
    """
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def test_request_factory():
    """
    테스트용 요청 객체 팩토리 생성
    """
    from fastapi import Request
    from fastapi.testclient import TestClient

    def _create_request(method="GET", url="/", headers=None, client_host="127.0.0.1"):
        """테스트용 요청 객체 생성"""
        client = TestClient(app)
        scope = {
            "type": "http",
            "method": method,
            "path": url.split("?")[0],
            "headers": [(k.lower().encode(), v.encode()) for k, v in (headers or {}).items()],
            "client": ("127.0.0.1", 123) if not client_host else (client_host, 123),
        }
        
        if "?" in url:
            scope["query_string"] = url.split("?")[1].encode()
        
        request = Request(scope)
        return request
    
    return _create_request 