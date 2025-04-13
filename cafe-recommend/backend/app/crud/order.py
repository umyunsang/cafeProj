from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import date, datetime
import pytz
import json

from app.crud.base import CRUDBase
from app.models.order import Order, OrderItem
from app.models.menu import Menu
from app.schemas.order import OrderCreate, OrderUpdate

class CRUDOrder(CRUDBase[Order, OrderCreate, OrderUpdate]):
    def get_by_user(self, db: Session, *, user_id: int) -> List[Order]:
        """사용자 ID로 주문 조회"""
        return db.query(self.model).filter(self.model.user_id == user_id).all()

    def get_by_status(self, db: Session, *, status: str) -> List[Order]:
        """상태로 주문 조회"""
        return db.query(self.model).filter(self.model.status == status).all()

    def create_with_items(
        self, db: Session, *, obj_in: OrderCreate, user_id: int
    ) -> Order:
        """주문 생성"""
        # 총 금액 계산
        total_amount = 0
        order_items = []
        items_data = []
        
        for item in obj_in.items:
            menu_item = db.query(Menu).filter(Menu.id == item.menu_id).first()
            if not menu_item:
                raise ValueError(f"Menu item with id {item.menu_id} not found")
            
            item_total = menu_item.price * item.quantity
            total_amount += item_total
            
            order_items.append(
                OrderItem(
                    menu_id=item.menu_id,
                    quantity=item.quantity,
                    unit_price=menu_item.price,
                    total_price=item_total
                )
            )
            
            items_data.append({
                "menu_id": item.menu_id,
                "menu_name": menu_item.name,
                "quantity": item.quantity,
                "unit_price": menu_item.price,
                "total_price": item_total
            })

        # 주문 생성
        db_obj = Order(
            user_id=user_id,
            total_amount=total_amount,
            status="pending",
            payment_method=obj_in.payment_method,
            items=items_data
        )
        
        db.add(db_obj)
        db.commit()
        
        # OrderItem 연결
        for order_item in order_items:
            order_item.order_id = db_obj.id
            db.add(order_item)
        
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update_status(self, db: Session, *, order_id: int, status: str) -> Optional[Order]:
        """주문 상태 업데이트"""
        order = self.get(db=db, id=order_id)
        if not order:
            return None
        
        order.status = status
        db.add(order)
        db.commit()
        db.refresh(order)
        return order

    def calculate_cart_total(self, db: Session, *, items: List[Dict[str, Any]]) -> Dict[str, Any]:
        """장바구니 금액을 계산합니다."""
        total_amount = 0.0
        cart_items = []
        
        for item in items:
            menu = db.query(Menu).filter(Menu.id == item["menu_id"]).first()
            if not menu:
                continue
            
            quantity = item["quantity"]
            unit_price = menu.price
            total_price = unit_price * quantity
            total_amount += total_price
            
            cart_items.append({
                "menu_id": menu.id,
                "menu_name": menu.name,
                "quantity": quantity,
                "unit_price": unit_price,
                "total_price": total_price
            })
        
        return {
            "items": cart_items,
            "total_amount": total_amount
        }

def create_order(db: Session, order_data: OrderCreate) -> Order:
    """새로운 주문 생성 (주문번호는 결제 완료 시 생성)"""
    
    # KST 시간대 생성
    kst = pytz.timezone('Asia/Seoul')
    now_kst = datetime.now(kst)
    
    # 5. Order 객체 생성 (order_number=None 으로 설정)
    db_order = Order(
        order_number=None, # 주문번호는 결제 완료 시 생성
        status="pending",
        payment_method=order_data.payment_method,
        session_id=order_data.session_id, 
        user_id=getattr(order_data, 'user_id', None),
        delivery_address=getattr(order_data, 'delivery_address', None),
        delivery_request=getattr(order_data, 'delivery_request', None),
        phone_number=getattr(order_data, 'phone_number', None),
        created_at=now_kst
        # total_amount 와 items 는 아래에서 처리
    )
    db.add(db_order)
    db.flush()  # ID 생성을 위해 flush

    total_amount = 0
    order_items_data_for_json = [] # JSON 저장을 위한 데이터
    for item in order_data.items:
        menu_item = db.query(Menu).filter(Menu.id == item.menu_id).first()
        if not menu_item:
            # 메뉴 못 찾으면 롤백하고 에러 발생
            db.rollback()
            raise ValueError(f"Menu item with id {item.menu_id} not found") 
            
        unit_price = item.unit_price if item.unit_price is not None else menu_item.price
        item_total = unit_price * item.quantity
        
        # OrderItem 객체 생성 및 추가
        order_item = OrderItem(
            order_id=db_order.id,
            menu_id=item.menu_id,
            quantity=item.quantity,
            unit_price=unit_price,
            total_price=item_total
        )
        db.add(order_item)
        total_amount += item_total
        
        # JSON 저장용 데이터 구성
        order_items_data_for_json.append({
             "menu_id": item.menu_id,
             "menu_name": menu_item.name,
             "quantity": item.quantity,
             "unit_price": unit_price,
             "total_price": item_total
        })

    # Order 객체에 계산된 총액과 JSON 아이템 목록 업데이트
    db_order.total_amount = total_amount
    db_order.items = json.dumps(order_items_data_for_json, ensure_ascii=False) # ensure_ascii=False 추가 (한글 처리)
    
    try:
        db.commit()
        db.refresh(db_order)
        return db_order
    except Exception as e:
        db.rollback()
        # DB 제약 조건 위반 등 커밋 시 오류 처리 (예: unique constraint)
        raise ValueError(f"Failed to commit order: {str(e)}")

def get_order_by_number(db: Session, order_number: str) -> Optional[Order]:
    """주문번호로 주문 조회"""
    return db.query(Order).filter(Order.order_number == order_number).first()

def update_order_status(db: Session, order_id: int, status: str) -> Optional[Order]:
    """주문 상태 업데이트"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if order:
        order.status = status
        db.commit()
        db.refresh(order)
    return order

order = CRUDOrder(Order) 