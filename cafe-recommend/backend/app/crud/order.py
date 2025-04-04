from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

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

order = CRUDOrder(Order) 