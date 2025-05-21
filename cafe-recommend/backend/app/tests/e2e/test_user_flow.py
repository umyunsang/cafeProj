"""
사용자 흐름에 대한 E2E 테스트
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app


def test_complete_order_flow(client: TestClient):
    """
    주문 완료 전체 과정에 대한 E2E 테스트
    """
    # 1. 메뉴 목록 조회
    menu_response = client.get("/api/menu")
    assert menu_response.status_code == 200
    menus = menu_response.json()
    
    # 메뉴가 존재하는지 확인
    if not menus or not isinstance(menus, list) or len(menus) == 0:
        pytest.skip("메뉴가 없어서 테스트를 건너뜁니다.")
    
    # 첫 번째 메뉴 ID 획득
    menu_id = menus[0].get("id")
    assert menu_id, "메뉴에 ID가 없습니다."
    
    # 2. 메뉴 상세 정보 조회
    detail_response = client.get(f"/api/menu/{menu_id}")
    assert detail_response.status_code == 200
    menu_detail = detail_response.json()
    assert menu_detail["id"] == menu_id
    
    # 3. 장바구니에 추가
    cart_add_response = client.post(
        "/api/cart/items",
        json={"menu_id": menu_id, "quantity": 2, "options": {}}
    )
    assert cart_add_response.status_code == 200
    
    # 4. 장바구니 조회
    cart_response = client.get("/api/cart")
    assert cart_response.status_code == 200
    cart = cart_response.json()
    assert len(cart["items"]) > 0
    
    # 5. 주문 생성
    order_response = client.post(
        "/api/order",
        json={
            "customer_name": "테스트 사용자",
            "contact": "010-1234-5678",
            "items": cart["items"]
        }
    )
    assert order_response.status_code == 200
    order = order_response.json()
    order_id = order["id"]
    
    # 6. 주문 상태 확인
    order_status_response = client.get(f"/api/order/{order_id}")
    assert order_status_response.status_code == 200
    order_status = order_status_response.json()
    assert order_status["id"] == order_id


def test_menu_recommendation_flow(client: TestClient):
    """
    AI 메뉴 추천 흐름에 대한 E2E 테스트
    """
    # 1. 메뉴 추천 요청
    recommendation_response = client.post(
        "/api/chat/recommendation",
        json={"message": "달콤한 커피 추천해주세요", "preferences": {"sweet": True, "hot": True}}
    )
    assert recommendation_response.status_code == 200
    recommendation = recommendation_response.json()
    
    # 응답 형식 확인
    assert "message" in recommendation
    assert "recommendations" in recommendation
    assert isinstance(recommendation["recommendations"], list)
    
    # 추천 메뉴가 있는지 확인
    if not recommendation["recommendations"]:
        pytest.skip("추천 메뉴가 없어서 테스트를 건너뜁니다.")
    
    # 2. 첫 번째 추천 메뉴의 상세 정보 조회
    menu_id = recommendation["recommendations"][0]["id"]
    detail_response = client.get(f"/api/menu/{menu_id}")
    assert detail_response.status_code == 200
    
    # 3. 장바구니에 추가
    cart_add_response = client.post(
        "/api/cart/items",
        json={"menu_id": menu_id, "quantity": 1, "options": {}}
    )
    assert cart_add_response.status_code == 200
    
    # 4. 장바구니 확인
    cart_response = client.get("/api/cart")
    assert cart_response.status_code == 200
    cart = cart_response.json()
    
    # 추가한 메뉴가 장바구니에 있는지 확인
    found = False
    for item in cart["items"]:
        if item["menu_id"] == menu_id:
            found = True
            break
    
    assert found, "추가한 메뉴가 장바구니에 없습니다." 