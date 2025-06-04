from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from app.database import get_db
from app.models.order import Order, OrderItem
from app.schemas.order import AdminOrderResponse, AdminOrderItemResponse, OrderItemStatusUpdate, OrderStatusUpdate
from app.api.deps import get_current_active_admin, get_db
from app.models.admin import Admin
import logging
import httpx
from app.core.config import settings
from app.routers.payment import cancel_naver_payment, cancel_kakao_payment
from app.api.admin.realtime import broadcast_order_event
import asyncio
from datetime import datetime, timedelta

router = APIRouter()

# 카카오페이 API 설정 (config.py에서 직접 사용)
# KAKAO_PAY_API_URL = "https://kapi.kakao.com/v1/payment/cancel" # 이전 설정 삭제
# KAKAO_ADMIN_KEY = settings.KAKAO_ADMIN_KEY # 이전 설정 삭제

async def call_kakaopay_cancel_api(tid: str, cancel_amount: int, cancel_tax_free_amount: int):
    """카카오페이 결제 취소 API를 호출합니다. (새 API 명세 적용)"""
    if not settings.KAKAO_SECRET_KEY_DEV: # settings에서 직접 참조
        logging.error("카카오 Secret Key (dev)가 설정되지 않았습니다.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="카카오페이 설정을 확인해주세요.")

    # URL 결합 시 이중 슬래시 방지
    base_url = str(settings.KAKAO_PAY_API_URL).rstrip('/')
    actual_cancel_url = f"{base_url}/online/v1/payment/cancel"

    headers = {
        "Authorization": f"SECRET_KEY {settings.KAKAO_SECRET_KEY_DEV}", # 새 인증 방식
        "Content-Type": "application/json", # Content-Type 문서 규격에 맞게 수정
    }
    payload = {
        "cid": settings.KAKAO_CID,
        "tid": tid,
        "cancel_amount": cancel_amount,
        "cancel_tax_free_amount": cancel_tax_free_amount,
    }
    try:
        async with httpx.AsyncClient() as client:
            logging.info(f"카카오페이 취소 요청: URL={actual_cancel_url}, Headers={headers}, Payload={payload}")
            response = await client.post(actual_cancel_url, headers=headers, json=payload) # json= 사용
            
            response_data = response.json() # 응답은 항상 json으로 시도
            logging.info(f"카카오페이 취소 응답 ({response.status_code}): {response_data}")

            response.raise_for_status()  # 2xx 외 상태 코드에 대해 예외 발생
            
            # 성공 시 (API 문서에 따라 성공 기준을 명확히 해야 함)
            # 예시: 카카오페이 취소 성공 시 응답에 "status": "CANCEL_PAYMENT" 등이 포함될 수 있음 (새 API 문서 확인 필요)
            # 여기서는 HTTP 200이고, error_code가 없으면 성공으로 간주
            if response.status_code == 200 and not response_data.get("error_code") and not response_data.get("code"):
                logging.info(f"카카오페이 취소 성공 (TID: {tid}): {response_data}")
                return response_data
            else:
                # API 레벨에서 오류 응답을 준 경우
                error_msg = response_data.get("error_message", response_data.get("msg", "알 수 없는 카카오페이 오류"))
                error_code_val = response_data.get("error_code", response_data.get("code"))
                logging.error(f"카카오페이 취소 API 오류 응답: {error_msg} (코드: {error_code_val})")
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"카카오페이 취소 실패: {error_msg} (코드: {error_code_val})")

    except httpx.HTTPStatusError as e:
        # HTTP 상태 코드가 2xx가 아닌 경우
        error_detail = f"카카오페이 취소 중 오류 발생 (HTTP Status: {e.response.status_code})"
        try:
            error_data = e.response.json()
            msg = error_data.get('error_message', error_data.get('msg', ''))
            code = error_data.get('error_code', error_data.get('code'))
            if msg:
                error_detail = f"카카오페이 취소 실패: {msg} (코드: {code})"
            logging.error(f"카카오페이 취소 API 오류 (HTTPStatusError): {error_detail}, 응답 본문: {e.response.text}")
        except Exception:
            logging.error(f"카카오페이 취소 API 오류 (HTTPStatusError), 응답 파싱 불가: {e.response.text}")
            pass # 파싱 실패 시 기본 메시지 사용
        raise HTTPException(status_code=e.response.status_code, detail=error_detail)
    except Exception as e:
        logging.exception(f"카카오페이 취소 API 호출 중 예외 발생: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="카카오페이 통신 중 알 수 없는 오류가 발생했습니다.")

@router.get("/orders", response_model=List[AdminOrderResponse])
async def get_all_orders(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_active_admin)
):
    """모든 주문 목록을 조회합니다. (관리자 전용)"""
    try:
        query = db.query(Order).options(
            joinedload(Order.order_items).joinedload(OrderItem.menu)
        )
        
        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, "%Y-%m-%d")
                query = query.filter(Order.created_at >= start_date_obj)
                if end_date:
                    end_date_obj = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1) - timedelta(seconds=1)
                    query = query.filter(Order.created_at <= end_date_obj)
                else:
                    end_date_obj = start_date_obj + timedelta(days=1) - timedelta(seconds=1)
                    query = query.filter(Order.created_at <= end_date_obj)
            except ValueError as e:
                logging.warning(f"날짜 파싱 오류: {e}")
        
        if status_filter:
            statuses = [s.strip() for s in status_filter.split(',') if s.strip()]
            if statuses:
                query = query.filter(Order.status.in_(statuses))

        query = query.order_by(Order.created_at.desc())
        orders = query.all()
        
        return [serialize_order(order) for order in orders]
    except Exception as e:
        logging.exception(f"관리자 주문 목록 조회 중 오류 발생: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="서버 내부 오류가 발생했습니다."
        )

@router.get("/orders/{order_id}", response_model=AdminOrderResponse)
async def get_order_by_id(
    order_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_active_admin)
):
    """특정 주문의 상세 정보를 조회합니다. (관리자 전용)"""
    try:
        order = db.query(Order).options(
            joinedload(Order.order_items).joinedload(OrderItem.menu)
        ).filter(Order.id == order_id).first()
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="주문을 찾을 수 없습니다."
            )
        
        return serialize_order(order)
    except HTTPException:
        raise
    except Exception as e:
        logging.exception(f"주문 조회 중 오류 발생 (Order ID: {order_id}): {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"주문을 조회하는 중 오류가 발생했습니다: {str(e)}"
        )

@router.put("/orders/{order_id}/items/{item_id}/status", response_model=AdminOrderResponse)
async def update_order_item_status(
    order_id: int,
    item_id: int,
    status_update: OrderItemStatusUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_active_admin)
):
    """주문 항목의 상태를 업데이트하고, 필요한 경우 PG사 결제 취소를 처리합니다."""
    logging.info(f"--- 주문 항목 상태 업데이트 시작: Order ID={order_id}, Item ID={item_id}, New Status={status_update.status} ---")
    
    async def handle_pg_cancellation(order: Order, order_item_to_cancel: OrderItem):
        logging.info(f"PG사 결제 취소 처리 시작: Order ID={order.id}, Item ID={order_item_to_cancel.id}")
        if order.payment_method == "kakaopay" and order.payment_key:
            logging.info(f"카카오페이 결제 취소 호출: TID={order.payment_key}, Amount={order_item_to_cancel.total_price}")
            cancel_result = await call_kakaopay_cancel_api(
                tid=order.payment_key,
                cancel_amount=int(order_item_to_cancel.total_price),
                cancel_tax_free_amount=0
            )
            logging.info(f"카카오페이 부분 취소 성공 (Item ID: {order_item_to_cancel.id})")

        elif order.payment_method == "naverpay" and order.payment_key:
            logging.info(f"네이버페이 결제 취소 호출: Key={order.payment_key}, Amount={order_item_to_cancel.total_price}")
            cancel_result = await cancel_naver_payment(
                payment_key=order.payment_key,
                cancel_reason="상품 부분 취소",
                cancel_amount=int(order_item_to_cancel.total_price),
                db=db
            )
            if isinstance(cancel_result, dict) and cancel_result.get("code") != "Success":
                 logging.error(f"네이버페이 부분 취소 실패: {cancel_result.get('message')}")
                 return False
            logging.info(f"네이버페이 부분 취소 성공 (Item ID: {order_item_to_cancel.id})")
        else:
            logging.warning(f"지원하지 않는 결제 수단이거나 결제 키가 없습니다: {order.payment_method}")
            return True 
        return True

    try:
        logging.debug(f"DB에서 OrderItem 조회 시작: Item ID={item_id}, Order ID={order_id}")
        order_item = db.query(OrderItem).options(joinedload(OrderItem.order).joinedload(Order.order_items).joinedload(OrderItem.menu)).filter(
            OrderItem.id == item_id,
            OrderItem.order_id == order_id
        ).first()

        if not order_item:
            logging.warning(f"주문 항목을 찾을 수 없음: Item ID={item_id}, Order ID={order_id}")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="주문 항목을 찾을 수 없습니다.")

        order = order_item.order
        original_item_status = order_item.status
        new_item_status = status_update.status

        logging.info(f"주문 항목 상태 변경 시도: Item ID={item_id}, Current Status={original_item_status}, New Status={new_item_status}")

        order_item.status = new_item_status
        order_item.updated_at = datetime.utcnow()
        
        pg_cancelled_successfully = True
        if new_item_status == "cancelled" and original_item_status != "cancelled":
            logging.info(f"주문 항목 취소됨 (Item ID: {item_id}). PG사 결제 취소 시작.")
            if order.status not in ["pending_payment", "failed"]:
                pg_cancelled_successfully = await handle_pg_cancellation(order, order_item)
                if not pg_cancelled_successfully:
                    logging.error(f"PG사 결제 취소 실패 (Item ID: {item_id}). 주문 항목 상태는 {new_item_status}로 유지됨.")
            else:
                logging.info(f"미결제 또는 실패한 주문 항목 취소 (Item ID: {item_id}). PG사 결제 취소 불필요.")

        all_items_cancelled = all(item.status == "cancelled" for item in order.order_items)
        any_item_active = any(item.status not in ["cancelled", "completed", "refunded"] for item in order.order_items)

        if all_items_cancelled:
            order.status = "cancelled"
            logging.info(f"모든 주문 항목이 취소되어 주문 전체 상태를 'cancelled'로 변경 (Order ID: {order.id})")
        elif not any_item_active and any(item.status == "completed" for item in order.order_items):
            if all(item.status in ["completed", "refunded"] for item in order.order_items):
                 order.status = "completed"
                 logging.info(f"모든 활성 주문 항목이 완료/환불되어 주문 전체 상태를 'completed'로 변경 (Order ID: {order.id})")
        # 다른 주문 상태 로직은 여기에 추가 (예: 부분 완료 등)
        # ...

        db.commit()
        db.refresh(order_item)
        db.refresh(order) # order 객체도 refresh

        # 주문 상태 변경 이벤트 브로드캐스트
        updated_order_data = serialize_order(order) # 전체 주문 정보 사용
        asyncio.create_task(broadcast_order_event(event_type="order_update", order_data=updated_order_data))
        logging.info(f"주문 항목 상태 업데이트 완료 및 이벤트 브로드캐스트: Order ID={order.id}, Item ID={item_id}")

        return serialize_order(order)
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logging.exception(f"주문 항목 상태 업데이트 중 오류 발생 (Item ID: {item_id}, Order ID: {order_id}): {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="주문 항목 상태 업데이트 중 오류가 발생했습니다.")

@router.put("/orders/{order_id}/status", response_model=AdminOrderResponse)
async def update_order_status(
    order_id: int,
    status_update: OrderStatusUpdate, 
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_active_admin)
):
    """주문 전체의 상태를 업데이트합니다. (관리자 전용)"""
    logging.info(f"--- 주문 전체 상태 업데이트 시작: Order ID={order_id}, New Status={status_update.status} ---")
    
    order = db.query(Order).options(joinedload(Order.order_items)).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="주문을 찾을 수 없습니다.")

    original_order_status = order.status
    new_order_status = status_update.status
    logging.info(f"주문 전체 상태 변경 시도: Order ID={order.id}, Current Status={original_order_status}, New Status={new_order_status}")

    order.status = new_order_status
    order.updated_at = datetime.utcnow()

    # 주문 전체가 취소되는 경우, 모든 주문 항목도 취소 처리 및 PG사 취소 로직 필요
    if new_order_status == "cancelled" and original_order_status != "cancelled":
        logging.info(f"주문 전체가 'cancelled'로 변경됨 (Order ID: {order.id}). 모든 항목 취소 및 PG 처리 시작.")
        all_items_pg_cancelled = True
        # PG사 취소는 원래 주문 상태가 'paid', 'preparing', 'ready_for_pickup', 'served' 등 결제가 완료된 상태였을 때만 진행
        if original_order_status not in ["pending_payment", "failed", "cancelled"]:
            # 모든 주문 항목 상태를 'cancelled'로 변경
            for item in order.order_items:
                if item.status != "cancelled":
                    item.status = "cancelled"
                    item.updated_at = datetime.utcnow()
            
            # order.payment_method의 실제 내용 (repr) 및 바이트까지 로깅
            payment_method_repr = repr(order.payment_method) if order.payment_method else "None"
            payment_method_bytes = order.payment_method.encode('utf-8', 'backslashreplace') if order.payment_method else b"None"
            logging.info(f"[PG 취소 조건 CHECK START] Order ID: {order.id}, Method RAW: {payment_method_repr}, Method BYTES: {payment_method_bytes}, Key: '{order.payment_key}' (Type: {type(order.payment_key)})")

            # .strip()을 사용하여 payment_method 값의 앞뒤 공백 제거 후 비교
            is_kakaopay_method = order.payment_method.strip() == "kakao" if order.payment_method else False
            has_payment_key = bool(order.payment_key) # Checks if payment_key is not None and not an empty string

            logging.info(f"[PG 상세 조건 검사] Order ID: {order.id}, is_kakaopay_method: {is_kakaopay_method}, has_payment_key: {has_payment_key}")

            if is_kakaopay_method and has_payment_key:
                logging.info(f"==> KakaoPay cancel block entered. Order ID: {order.id}")
                logging.info(f"카카오페이 전체 주문 취소 준비: Order ID={order.id}, TID={order.payment_key}, Amount={order.total_amount}, PaymentMethod={order.payment_method}")
                try:
                    logging.info(f"call_kakaopay_cancel_api 호출 직전 (Order ID: {order.id})")
                    await call_kakaopay_cancel_api(
                        tid=order.payment_key,
                        cancel_amount=int(order.total_amount),
                        cancel_tax_free_amount=0
                    )
                    logging.info(f"카카오페이 전체 주문 취소 성공 (Order ID: {order.id}) - call_kakaopay_cancel_api 반환 후")
                    all_items_pg_cancelled = True
                except HTTPException as e:
                    all_items_pg_cancelled = False
                    logging.error(f"카카오페이 전체 주문 취소 실패 (Order ID: {order.id}): {e.detail}")
            # .strip()을 사용하여 payment_method 값의 앞뒤 공백 제거 후 비교
            elif order.payment_method.strip() == "naver" if order.payment_method else False and has_payment_key:
                logging.info(f"==> NaverPay cancel block entered. Order ID: {order.id}")
                logging.info(f"네이버페이 전체 주문 취소 준비: Order ID={order.id}, Key={order.payment_key}, Amount={order.total_amount}, PaymentMethod={order.payment_method}")
                try:
                    logging.info(f"cancel_naver_payment 호출 직전 (Order ID: {order.id})")
                    cancel_result = await cancel_naver_payment(
                        payment_key=order.payment_key,
                        cancel_reason="관리자 전체 주문 취소",
                        cancel_amount=int(order.total_amount),
                        db=db
                    )
                    if isinstance(cancel_result, dict) and cancel_result.get("code") == "Success":
                        logging.info(f"네이버페이 전체 주문 취소 성공 (Order ID: {order.id})")
                        all_items_pg_cancelled = True
                    else:
                        all_items_pg_cancelled = False
                        logging.error(f"네이버페이 전체 주문 취소 API 응답 실패: {cancel_result.get('message') if isinstance(cancel_result, dict) else '알 수 없는 오류'}")
                except HTTPException as e:
                    all_items_pg_cancelled = False
                    logging.error(f"네이버페이 전체 주문 취소 실패 (Order ID: {order.id}): {e.detail}")
            else:
                logging.info(f"==> No PG cancel or specific condition not met. Order ID: {order.id}, Method: {order.payment_method}, Key Present: {has_payment_key}")
                logging.warning(f"지원되는 PG사(kakaopay, naverpay)가 아니거나 payment_key가 없거나 조건 불일치로 PG 취소를 진행하지 않음: Order ID={order.id}, Method={order.payment_method}")
                all_items_pg_cancelled = True # PG 취소 대상이 아니므로 성공으로 간주

            if not all_items_pg_cancelled:
                logging.error(f"PG사 전체 주문 취소에 실패했습니다 (Order ID: {order.id}). 주문 상태는 {new_order_status}로 유지되나 확인 필요.")
        else:
            logging.info(f"미결제, 실패, 또는 이미 취소된 주문입니다 (Order ID: {order.id}, Original Status: {original_order_status}). PG사 결제 취소 불필요.")

    db.commit()
    db.refresh(order)
    
    # 주문 상태 변경 이벤트 브로드캐스트
    updated_order_data = serialize_order(order)
    asyncio.create_task(broadcast_order_event(event_type="order_update", order_data=updated_order_data))
    logging.info(f"주문 전체 상태 업데이트 완료 및 이벤트 브로드캐스트: Order ID={order.id}")
    
    return serialize_order(order)

def serialize_order_item(item: OrderItem) -> AdminOrderItemResponse:
    menu_name_str = "알 수 없는 메뉴"
    if item.menu and item.menu.name:
        menu_name_str = item.menu.name
    
    return AdminOrderItemResponse(
        id=item.id,
        menu_id=item.menu_id,
        menu_name=menu_name_str,
        quantity=item.quantity,
        unit_price=item.unit_price,
        total_price=item.total_price,
        status=item.status,
        created_at=item.created_at
    )

def serialize_order(order: Order) -> AdminOrderResponse:
    # order_number가 None인 경우 기본값 제공
    order_number = order.order_number or f"ORD-{order.id:06d}"
    
    return AdminOrderResponse(
        id=order.id,
        user_id=None,
        items=[serialize_order_item(item) for item in order.order_items],
        total_amount=order.total_amount,
        status=order.status,
        payment_method=order.payment_method,
        created_at=order.created_at,
        order_number=order_number
    ) 