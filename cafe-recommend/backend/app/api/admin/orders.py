from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from app.database import get_db
from app.models.order import Order, OrderItem
from app.schemas.order import AdminOrderResponse, AdminOrderItemResponse, OrderItemStatusUpdate
from app.core.auth import get_current_admin
from app.models.user import User
import logging
import httpx
from app.core.config import settings

router = APIRouter()

# 카카오페이 API 엔드포인트 및 Admin 키 (설정 파일에서 로드)
KAKAO_PAY_API_URL = "https://kapi.kakao.com/v1/payment/cancel"
KAKAO_ADMIN_KEY = settings.KAKAO_ADMIN_KEY

async def call_kakaopay_cancel_api(tid: str, cancel_amount: int, cancel_tax_free_amount: int):
    """카카오페이 결제 취소 API를 호출합니다."""
    if not KAKAO_ADMIN_KEY:
        logging.error("카카오 Admin 키가 설정되지 않았습니다.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="카카오페이 설정을 확인해주세요.")

    headers = {
        "Authorization": f"KakaoAK {KAKAO_ADMIN_KEY}",
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    }
    payload = {
        "cid": settings.KAKAO_CID, # 가맹점 코드 추가 (설정에서 가져옴)
        "tid": tid,
        "cancel_amount": cancel_amount,
        "cancel_tax_free_amount": cancel_tax_free_amount,
        # 필요한 경우 추가 파라미터: payload_etc 등
    }
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(KAKAO_PAY_API_URL, headers=headers, data=payload)
            response.raise_for_status()  # 2xx 외 상태 코드에 대해 예외 발생
            
            result = response.json()
            logging.info(f"카카오페이 취소 성공: TID={tid}, 응답={result}")
            # 응답에서 취소 관련 정보 확인 가능 (예: result['status'] == 'CANCEL_PAYMENT')
            if result.get('status') != 'CANCEL_PAYMENT':
                 logging.warning(f"카카오페이 취소 응답 상태 확인 필요: {result}")
                 # 특정 조건에서는 예외를 발생시킬 수도 있음

            return result

    except httpx.HTTPStatusError as e:
        logging.error(f"카카오페이 취소 API 오류 (HTTP Status): {e.response.status_code}, 응답: {e.response.text}")
        error_detail = f"카카오페이 취소 중 오류가 발생했습니다. (응답 코드: {e.response.status_code})"
        try:
            # 카카오 에러 메시지 파싱 시도
            error_data = e.response.json()
            msg = error_data.get('msg', '')
            code = error_data.get('code', None)
            if msg:
                error_detail = f"카카오페이 취소 실패: {msg} (코드: {code})"
        except Exception:
            pass # 파싱 실패 시 기본 메시지 사용
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=error_detail)
    except Exception as e:
        logging.exception(f"카카오페이 취소 API 호출 중 예외 발생: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="카카오페이 통신 중 오류가 발생했습니다.")

@router.get("/orders", response_model=List[AdminOrderResponse])
async def get_all_orders(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """모든 주문 목록을 조회합니다. (관리자 전용)"""
    try:
        # 모든 주문 조회 (최신 주문부터 정렬)
        orders = db.query(Order).options(
            joinedload(Order.order_items).joinedload(OrderItem.menu)
        ).order_by(Order.created_at.desc()).all()
        
        # 주문 목록을 AdminOrderResponse 형식으로 변환
        result = []
        for order in orders:
            # 주문 아이템 정보를 AdminOrderItemResponse 형식으로 변환
            order_items = [
                AdminOrderItemResponse(
                    id=item.id,
                    order_id=item.order_id,
                    menu_id=item.menu_id,
                    menu_name=item.menu.name if item.menu else "메뉴 정보 없음",
                    quantity=item.quantity or 0,
                    unit_price=item.unit_price if item.unit_price is not None else 0.0,
                    total_price=item.total_price if item.total_price is not None else 0.0,
                    status=item.status or "unknown",
                    created_at=item.created_at,
                    updated_at=item.updated_at
                )
                for item in order.order_items
            ]
            
            # 주문 정보를 AdminOrderResponse 형식으로 변환
            result.append(AdminOrderResponse(
                id=order.id,
                order_number=str(order.id),
                user_id=order.user_id,
                total_amount=order.total_amount if order.total_amount is not None else 0.0,
                status=order.status or "unknown",
                payment_method=order.payment_method,
                payment_key=order.payment_key,
                session_id=order.session_id,
                delivery_address=order.delivery_address,
                delivery_request=order.delivery_request,
                phone_number=order.phone_number,
                created_at=order.created_at,
                updated_at=order.updated_at,
                items=order_items
            ))
        
        return result
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
    current_admin: User = Depends(get_current_admin)
):
    """특정 주문의 상세 정보를 조회합니다. (관리자 전용)"""
    try:
        # 주문 조회
        order = db.query(Order).options(
            joinedload(Order.order_items).joinedload(OrderItem.menu)
        ).filter(Order.id == order_id).first()
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="주문을 찾을 수 없습니다."
            )
        
        # 주문 아이템 정보를 AdminOrderItemResponse 형식으로 변환
        order_items = [
            AdminOrderItemResponse(
                id=item.id,
                order_id=item.order_id,
                menu_id=item.menu_id,
                menu_name=item.menu.name if item.menu else "알 수 없음",
                quantity=item.quantity,
                unit_price=item.unit_price,
                total_price=item.total_price,
                status=item.status,
                created_at=item.created_at,
                updated_at=item.updated_at
            )
            for item in order.order_items
        ]
        
        # 주문 정보를 AdminOrderResponse 형식으로 변환
        return AdminOrderResponse(
            id=order.id,
            order_number=str(order.id),
            user_id=order.user_id,
            total_amount=order.total_amount,
            status=order.status,
            payment_method=order.payment_method,
            payment_key=order.payment_key,
            session_id=order.session_id,
            delivery_address=order.delivery_address,
            delivery_request=order.delivery_request,
            phone_number=order.phone_number,
            created_at=order.created_at,
            updated_at=order.updated_at,
            items=order_items
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"주문 조회 중 오류 발생: {str(e)}")
        import traceback
        traceback.print_exc()
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
    current_admin: User = Depends(get_current_admin)
):
    """주문 항목의 상태를 업데이트하고, 필요한 경우 카카오페이 취소를 처리합니다."""
    logging.info(f"--- 주문 항목 상태 업데이트 시작: Order ID={order_id}, Item ID={item_id}, New Status={status_update.status} ---")
    
    try:
        # 1. 주문 항목과 주문 정보 함께 조회
        logging.debug(f"DB에서 OrderItem 조회 시작: Item ID={item_id}, Order ID={order_id}")
        order_item = db.query(OrderItem).options(joinedload(OrderItem.order)).filter(
            OrderItem.id == item_id,
            OrderItem.order_id == order_id
        ).first()

        if not order_item:
            logging.warning(f"주문 항목을 찾을 수 없음: Item ID={item_id}, Order ID={order_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="주문 항목을 찾을 수 없습니다."
            )
        
        order = order_item.order
        logging.debug(f"주문 항목 및 주문 정보 로드 완료: Item Status={order_item.status}, Order Status={order.status}, Payment Method={order.payment_method}, Payment Key={order.payment_key}")

        # 이미 처리된 상태면 변경하지 않음
        if order_item.status == status_update.status:
             logging.warning(f"주문 항목 {item_id}은(는) 이미 {status_update.status} 상태입니다. 업데이트 건너뜀.")
             # 현재 상태 그대로 반환
             return await get_order_by_id(order_id, db, current_admin)

        # 2. 상태가 'cancelled' 인 경우 카카오페이 환불 로직 추가
        kakaopay_cancelled = False
        if status_update.status == 'cancelled':
            logging.info(f"취소 요청 확인됨. 카카오페이 환불 조건 검사 시작.")
            # 3. 환불 조건 확인
            # !! 중요: order.status 조건을 시스템의 실제 결제 완료 상태에 맞게 조정해야 할 수 있습니다. !!
            is_kakaopay = order.payment_method == 'kakao'
            has_tid = bool(order.payment_key) # TID 존재 여부
            is_paid = order.status in ['completed', 'paid'] # 'paid' 등 다른 완료 상태 포함 가능성 고려
            is_item_pending = order_item.status == 'pending'
            
            logging.debug(f"환불 조건 검사 결과: is_kakaopay={is_kakaopay}, has_tid={has_tid}, is_paid={is_paid} (Order Status: {order.status}), is_item_pending={is_item_pending} (Item Status: {order_item.status})")
            
            can_cancel_kakaopay = is_kakaopay and has_tid and is_paid and is_item_pending

            if can_cancel_kakaopay:
                logging.info(f"카카오페이 취소 조건 충족: Order ID={order_id}, Item ID={item_id}, TID={order.payment_key}")
                try:
                    # 4. 취소 금액 계산 (비과세 금액은 0으로 가정)
                    # !! 중요: total_price가 아닌 unit_price * quantity 로 계산하는 것이 더 정확할 수 있습니다. !!
                    # cancel_amount = int((order_item.unit_price or 0) * (order_item.quantity or 0))
                    cancel_amount = int(order_item.total_price or 0) # 현재는 total_price 사용
                    cancel_tax_free_amount = 0
                    logging.debug(f"취소 금액 계산: cancel_amount={cancel_amount}, cancel_tax_free_amount={cancel_tax_free_amount}")
                    
                    if cancel_amount <= 0:
                        logging.warning(f"취소 금액이 0 이하입니다 (Item ID: {item_id}). 카카오페이 취소를 진행하지 않습니다.")
                    else:
                        # 5. 카카오페이 취소 API 호출
                        logging.info(f"카카오페이 취소 API 호출 시작: TID={order.payment_key}")
                        await call_kakaopay_cancel_api(
                            tid=order.payment_key, # None이 아님을 위에서 확인
                            cancel_amount=cancel_amount,
                            cancel_tax_free_amount=cancel_tax_free_amount
                        )
                        kakaopay_cancelled = True
                        logging.info(f"카카오페이 취소 API 호출 성공 (Item ID: {item_id})")

                except HTTPException as http_exc:
                    logging.error(f"카카오페이 취소 API 호출 실패 (HTTPException): {http_exc.detail}")
                    raise http_exc 
                except Exception as e:
                    logging.exception(f"카카오페이 취소 처리 중 예상치 못한 오류 (Item ID: {item_id})")
                    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="카카오페이 취소 처리 중 오류가 발생했습니다.")
            else:
                logging.info(f"카카오페이 취소 조건 미충족 또는 불필요 (Item ID: {item_id}). DB 상태만 업데이트합니다.")

        # 6. 데이터베이스 상태 업데이트
        logging.debug(f"데이터베이스 상태 업데이트 시도: Item ID={item_id}, New Status={status_update.status}")
        order_item.status = status_update.status
        db.commit()
        db.refresh(order_item)
        db.refresh(order)
        logging.info(f"주문 항목 상태 DB 업데이트 성공: Item ID={item_id}, New Status={status_update.status}, Kakaopay Cancelled={kakaopay_cancelled}")

        # 7. 업데이트된 주문 정보 반환
        logging.debug(f"업데이트된 주문 정보 반환 시작: Order ID={order_id}")
        updated_order = await get_order_by_id(order_id, db, current_admin)
        logging.info(f"--- 주문 항목 상태 업데이트 완료: Order ID={order_id}, Item ID={item_id} --- ")
        return updated_order

    except HTTPException as http_exc:
        # 예상된 HTTP 예외 처리
        logging.warning(f"HTTP 예외 발생: {http_exc.status_code} - {http_exc.detail}")
        raise http_exc
    except Exception as e:
        # 예상치 못한 전체 예외 처리
        logging.exception(f"주문 항목 상태 업데이트 중 최상위 오류 발생 (Order ID: {order_id}, Item ID: {item_id})", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="주문 항목 상태 업데이트 중 심각한 오류가 발생했습니다."
        ) 