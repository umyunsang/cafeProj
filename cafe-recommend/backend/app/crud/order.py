from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import func, desc, and_, or_, text
from datetime import date, datetime, timedelta
import pytz
import json
import logging

from app.crud.base import CRUDBase
from app.models.order import Order, OrderItem
from app.models.menu import Menu
from app.schemas.order import OrderCreate, OrderUpdate

class CRUDOrder(CRUDBase[Order, OrderCreate, OrderUpdate]):
    def get_by_user(self, db: Session, *, user_id: int, skip: int = 0, limit: int = 100) -> Tuple[List[Order], int]:
        """사용자 ID로 주문 조회 - 페이지네이션과 전체 결과 수 추가"""
        # 쿼리 최적화: 전체 결과 수 계산
        total = db.query(func.count(self.model.id)).filter(self.model.user_id == user_id).scalar()
        
        # 주문 조회 최적화: 주문 관련 아이템 한 번에 로딩
        orders = db.query(self.model)\
            .filter(self.model.user_id == user_id)\
            .order_by(desc(self.model.created_at))\
            .offset(skip)\
            .limit(limit)\
            .all()
            
        return orders, total

    def get_by_session(self, db: Session, *, session_id: str, skip: int = 0, limit: int = 100) -> Tuple[List[Order], int]:
        """세션 ID로 주문 조회 - 세션 기반 사용자 추적용"""
        # 쿼리 최적화: 전체 결과 수 계산
        total = db.query(func.count(self.model.id)).filter(self.model.session_id == session_id).scalar()
        
        # 주문 조회 최적화: 주문 관련 데이터 한 번에 로딩
        orders = db.query(self.model)\
            .filter(self.model.session_id == session_id)\
            .order_by(desc(self.model.created_at))\
            .offset(skip)\
            .limit(limit)\
            .all()
            
        return orders, total

    def get_by_status(self, db: Session, *, status: str, skip: int = 0, limit: int = 100) -> Tuple[List[Order], int]:
        """상태로 주문 조회 - 관리자용 주문 관리 기능"""
        # 쿼리 최적화: 전체 결과 수 계산
        total = db.query(func.count(self.model.id)).filter(self.model.status == status).scalar()
        
        # 주문 조회 최적화: 최신 주문 먼저 표시
        orders = db.query(self.model)\
            .filter(self.model.status == status)\
            .order_by(desc(self.model.created_at))\
            .offset(skip)\
            .limit(limit)\
            .all()
            
        return orders, total

    def get_orders_with_items(self, db: Session, *, skip: int = 0, limit: int = 100, 
                             status: Optional[str] = None, 
                             date_from: Optional[datetime] = None,
                             date_to: Optional[datetime] = None) -> Tuple[List[Order], int]:
        """주문 목록 조회 - 필터링, 페이지네이션, 정렬 지원"""
        query = db.query(self.model)
        count_query = db.query(func.count(self.model.id))
        
        # 필터 적용
        if status:
            query = query.filter(self.model.status == status)
            count_query = count_query.filter(self.model.status == status)
            
        if date_from:
            query = query.filter(self.model.created_at >= date_from)
            count_query = count_query.filter(self.model.created_at >= date_from)
            
        if date_to:
            query = query.filter(self.model.created_at <= date_to)
            count_query = count_query.filter(self.model.created_at <= date_to)
        
        # 전체 결과 수
        total = count_query.scalar()
        
        # 정렬 및 페이지네이션
        orders = query.order_by(desc(self.model.created_at)).offset(skip).limit(limit).all()
        
        return orders, total

    def create_with_items(
        self, db: Session, *, obj_in: OrderCreate, user_id: int
    ) -> Order:
        """주문 생성 - 트랜잭션 처리 개선"""
        try:
            # 총 금액 계산
            total_amount = 0
            order_items = []
            items_data = []
            
            # 메뉴 ID 목록 생성 - 단일 쿼리로 모든 메뉴 정보 가져오기
            menu_ids = [item.menu_id for item in obj_in.items]
            menus = {
                menu.id: menu for menu in 
                db.query(Menu).filter(Menu.id.in_(menu_ids)).all()
            }
            
            for item in obj_in.items:
                menu_item = menus.get(item.menu_id)
                if not menu_item:
                    # 로그 추가: 메뉴 아이템을 찾지 못한 경우
                    logging.error(f"CRUDOrder: Menu item with id {item.menu_id} not found in preloaded menus dict. obj_in: {obj_in}")
                    raise ValueError(f"Menu item with id {item.menu_id} not found")
                
                # 로그 추가: 조회된 메뉴 아이템 정보 확인
                logging.info(f"CRUDOrder: Fetched menu_item: id={menu_item.id}, name='{menu_item.name}', price={menu_item.price}, for requested menu_id={item.menu_id}")

                item_total = menu_item.price * item.quantity
                total_amount += item_total
                
                # 로그 추가: OrderItem 생성 직전 값 확인
                logging.info(f"CRUDOrder.create_with_items: Preparing OrderItem - Menu ID: {item.menu_id}, Menu Name: '{menu_item.name}', Menu Price: {menu_item.price}, Quantity: {item.quantity}, Calculated Unit Price: {menu_item.price}, Calculated Item Total: {item_total}")

                # OrderItem 생성 시 unit_price 명시적 할당
                db_item = OrderItem(
                    order_id=db_obj.id,
                    menu_id=item.menu_id,
                    quantity=item.quantity,
                    unit_price=menu_item.price,  # unit_price에 menu_item.price 할당
                    total_price=item_total,
                    # menu_name=menu_item.name, # menu_name은 OrderItem 모델에 직접 필드가 없으므로 menu 관계를 통해 가져옴
                )
                db_items.append(db_item)
                
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
                items=json.dumps(items_data, ensure_ascii=False)
            )
            
            db.add(db_obj)
            db.flush()  # ID 생성
            
            # OrderItem 연결
            for order_item in order_items:
                order_item.order_id = db_obj.id
                db.add(order_item)
            
            # 주문 카운트 업데이트 - 단일 쿼리로 여러 메뉴 업데이트
            for menu_id, quantity in [(item.menu_id, item.quantity) for item in obj_in.items]:
                db.execute(
                    text("UPDATE menus SET order_count = order_count + :qty WHERE id = :menu_id"),
                    {"qty": quantity, "menu_id": menu_id}
                )
                
            db.commit()
            db.refresh(db_obj)
            return db_obj
            
        except Exception as e:
            db.rollback()
            raise ValueError(f"Failed to create order: {str(e)}")

    def update_status(self, db: Session, *, order_id: int, status: str) -> Optional[Order]:
        """주문 상태 업데이트 - 효율적인 업데이트 쿼리 사용"""
        # 단일 쿼리로 업데이트하고 결과 반환 (select + update 분리 대신)
        result = db.execute(
            text("UPDATE orders SET status = :status WHERE id = :order_id RETURNING id"),
            {"status": status, "order_id": order_id}
        ).fetchone()
        
        if not result:
            return None
            
        db.commit()
        return self.get(db=db, id=order_id)

    def get_recent_orders(self, db: Session, *, days: int = 30, status: Optional[str] = None) -> List[Order]:
        """최근 주문 조회 - 날짜 범위 필터링"""
        query = db.query(self.model)
        
        # 날짜 필터링
        date_from = datetime.now() - timedelta(days=days)
        query = query.filter(self.model.created_at >= date_from)
        
        # 상태 필터링
        if status:
            query = query.filter(self.model.status == status)
            
        return query.order_by(desc(self.model.created_at)).all()

    def get_daily_stats(self, db: Session, *, date_from: Optional[date] = None, date_to: Optional[date] = None) -> List[Dict]:
        """일별 주문 통계 - 효율적인 집계 쿼리 사용"""
        # 기본 날짜 범위 설정 (지난 30일)
        if not date_from:
            date_from = (datetime.now() - timedelta(days=30)).date()
        if not date_to:
            date_to = datetime.now().date()
            
        # Raw SQL 쿼리로 통계 집계 최적화
        stats = db.execute(
            text("""
            SELECT 
                DATE(created_at) as order_date,
                COUNT(*) as order_count,
                SUM(total_amount) as total_sales
            FROM 
                orders
            WHERE 
                DATE(created_at) BETWEEN :date_from AND :date_to
                AND status != 'cancelled'
            GROUP BY 
                DATE(created_at)
            ORDER BY 
                order_date
            """),
            {"date_from": date_from, "date_to": date_to}
        ).fetchall()
        
        return [
            {"date": row[0], "count": row[1], "sales": float(row[2])}
            for row in stats
        ]

    def calculate_cart_total(self, db: Session, *, items: List[Dict[str, Any]]) -> Dict[str, Any]:
        """장바구니 금액을 계산합니다."""
        # 메뉴 아이디 목록 준비
        menu_ids = [item["menu_id"] for item in items]
        
        # 단일 쿼리로 모든 메뉴 정보 가져오기
        menus = {
            menu.id: menu for menu in 
            db.query(Menu).filter(Menu.id.in_(menu_ids)).all()
        }
        
        total_amount = 0.0
        cart_items = []
        
        for item in items:
            menu = menus.get(item["menu_id"])
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
    try:
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

        # 메뉴 ID 목록 생성 - 단일 쿼리로 모든 메뉴 정보 가져오기
        menu_ids = [item.menu_id for item in order_data.items]
        menus = {
            menu.id: menu for menu in 
            db.query(Menu).filter(Menu.id.in_(menu_ids)).all()
        }

        total_amount = 0
        order_items_data_for_json = [] # JSON 저장을 위한 데이터
        order_items = [] # 트랜잭션 최적화를 위해 일괄 추가
        
        for item in order_data.items:
            menu_item = menus.get(item.menu_id)
            if not menu_item:
                # 메뉴 못 찾으면 롤백하고 에러 발생
                db.rollback()
                raise ValueError(f"Menu item with id {item.menu_id} not found") 
                
            unit_price = item.unit_price if item.unit_price is not None else menu_item.price
            item_total = unit_price * item.quantity
            
            # 로그 추가: OrderItem 생성 직전 값 확인
            logging.info(f"CRUDOrder.create_order: Preparing OrderItem - Menu ID: {item.menu_id}, Menu Name: '{menu_item.name}', Menu Price: {menu_item.price}, Quantity: {item.quantity}, Calculated Unit Price: {unit_price}, Calculated Item Total: {item_total}")

            # OrderItem 객체 생성 및 추가
            order_items.append(
                OrderItem(
                    order_id=db_order.id,
                    menu_id=item.menu_id,
                    quantity=item.quantity,
                    unit_price=unit_price,
                    total_price=item_total
                )
            )
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
        
        # 일괄 추가로 쿼리 수 최적화
        db.bulk_save_objects(order_items)
        
        # 주문 카운트 업데이트 - 단일 쿼리로 여러 메뉴 업데이트
        menu_qty_pairs = [(item.menu_id, item.quantity) for item in order_data.items]
        for menu_id, quantity in menu_qty_pairs:
            db.execute(
                text("UPDATE menus SET order_count = order_count + :qty WHERE id = :menu_id"),
                {"qty": quantity, "menu_id": menu_id}
            )
        
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

def get_order_with_items(db: Session, order_id: int) -> Optional[Order]:
    """주문과 주문 항목을 함께 조회 - 조인 쿼리 최적화"""
    return db.query(Order).filter(Order.id == order_id).first()

def update_order_status(db: Session, order_id: int, status: str) -> Optional[Order]:
    """주문 상태 업데이트 - 효율적인 업데이트 쿼리 사용"""
    # 단일 쿼리로 업데이트
    result = db.execute(
        text("UPDATE orders SET status = :status WHERE id = :order_id RETURNING id"),
        {"status": status, "order_id": order_id}
    ).fetchone()
    
    if not result:
        return None
        
    db.commit()
    
    # 업데이트된 주문 반환
    return db.query(Order).filter(Order.id == order_id).first()

def get_pending_orders(db: Session) -> List[Order]:
    """처리 대기 중인 주문 목록 조회 - 인덱스 활용 최적화"""
    return db.query(Order).filter(Order.status == "pending").order_by(Order.created_at).all()

def search_orders(db: Session, *, search_term: str, skip: int = 0, limit: int = 100) -> Tuple[List[Order], int]:
    """주문 검색 기능 - 여러 필드 기반 검색 및 페이지네이션"""
    search_pattern = f"%{search_term}%"
    
    # 주문번호, 전화번호, 주소에서 검색
    search_filter = or_(
        Order.order_number.like(search_pattern),
        Order.phone_number.like(search_pattern),
        Order.delivery_address.like(search_pattern)
    )
    
    # 전체 결과 수
    total = db.query(func.count(Order.id)).filter(search_filter).scalar()
    
    # 검색 결과
    orders = db.query(Order).filter(search_filter).order_by(desc(Order.created_at)).offset(skip).limit(limit).all()
    
    return orders, total

order = CRUDOrder(Order) 