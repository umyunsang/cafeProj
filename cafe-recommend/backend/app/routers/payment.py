from fastapi import APIRouter, HTTPException, Depends, Cookie, Header, Response, Query
from sqlalchemy.orm import Session, joinedload
from ..database import get_db
from ..models.payment import PaymentConfig
from ..models.order import Order, OrderItem
from ..models.cart import Cart, CartItem
from ..models.menu import Menu
from ..schemas.payment import OrderRequest, PaymentRequest, KakaoPayRequest, OrderItemRequest, OrderResponse
from ..schemas.order import OrderResponse as OrderSchemaResponse
import httpx
import json
from urllib.parse import urlencode
from typing import Optional, List
import logging
from ..core.config import settings
import requests
from datetime import datetime
import pytz

router = APIRouter()

async def get_payment_config(provider: str, db: Session):
    config = db.query(PaymentConfig).filter(PaymentConfig.provider == provider).first()
    if not config or not config.is_active:
        raise HTTPException(status_code=400, detail=f"{provider} 결제가 설정되지 않았습니다.")
    return config

def set_session_cookie(response: Response, session_id: str):
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        secure=True,
        samesite='strict',
        path="/",
        max_age=3600 * 24 * 7  # 7일 유효
    )

@router.post("/order")
async def create_order(
    request: OrderRequest,
    response: Response,
    session_id: Optional[str] = Cookie(None),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db)
):
    """주문 생성 API"""
    try:
        # 세션 ID 확인 (쿠키 또는 헤더에서)
        effective_session_id = x_session_id or session_id
        logging.info(f"쿠키 세션 ID: {session_id}")
        logging.info(f"헤더 세션 ID: {x_session_id}")
        logging.info(f"사용할 세션 ID: {effective_session_id}")
        
        if not effective_session_id:
            raise HTTPException(status_code=400, detail="세션 ID가 필요합니다.")
        
        # 세션 쿠키 설정
        set_session_cookie(response, effective_session_id)
        
        # 결제 설정 확인
        try:
            config = await get_payment_config(request.payment_method, db)
        except Exception as e:
            logging.error(f"결제 설정 확인 중 오류: {str(e)}")
            raise
        
        # 장바구니 조회
        cart = db.query(Cart).filter(Cart.session_id == effective_session_id).first()
        if not cart:
            raise HTTPException(status_code=400, detail="장바구니가 없습니다.")
        
        # 장바구니 아이템 조회 (메뉴 정보 포함)
        cart_items = (
            db.query(CartItem)
            .options(joinedload(CartItem.menu))
            .filter(CartItem.cart_id == cart.id)
            .all()
        )
        if not cart_items:
            raise HTTPException(status_code=400, detail="장바구니가 비어있습니다.")
        
        logging.info(f"장바구니 아이템: {len(cart_items)}개")
        
        try:
            # KST 시간대 객체 생성
            kst = pytz.timezone('Asia/Seoul')
            now_kst = datetime.now(kst)

            # 실제 주문 생성 시 created_at 설정
            order = Order(
                total_amount=request.total_amount,
                payment_method=request.payment_method,
                status="pending",
                session_id=effective_session_id,
                created_at=now_kst # KST 시간으로 설정
            )
            db.add(order)
            db.flush()  # order.id를 얻기 위해 flush
            
            # 주문 아이템 생성
            for item in request.items:
                order_item = OrderItem(
                    order_id=order.id,
                    menu_id=item.menu_id,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    total_price=item.total_price
                )
                db.add(order_item)
            
            # 장바구니 비우기
            for item in cart_items:
                db.delete(item)
            
            db.commit()
            db.refresh(order)
            
            logging.info(f"주문 생성 성공: order_id={order.id}")
            return {"order_id": order.id}
        except Exception as e:
            db.rollback()
            logging.error(f"주문 생성 중 오류 발생: {str(e)}")
            raise HTTPException(status_code=500, detail=f"주문을 생성하는 중 오류가 발생했습니다: {str(e)}")
    except HTTPException as he:
        logging.error(f"HTTP 오류 발생: {he.detail}")
        raise
    except Exception as e:
        logging.error(f"예상치 못한 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=f"예상치 못한 오류가 발생했습니다: {str(e)}")

@router.post("/payment/naver")
async def process_naver_payment(
    request: PaymentRequest,
    db: Session = Depends(get_db)
):
    """네이버페이 결제 처리 API"""
    config = await get_payment_config("naver", db)
    
    try:
        # 네이버페이 결제 요청
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://dev.apis.naver.com/naverpay-partner/naverpay/payments/v2/apply",
                headers={
                    "X-NaverPay-Chain-Id": config.client_id,
                    "X-NaverPay-Client-Secret": config.client_secret,
                },
                json={
                    "orderId": request.order_id,
                    # 여기에 필요한 결제 정보 추가
                }
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(status_code=400, detail="네이버페이 결제 요청 실패")
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/payment/kakao")
async def process_kakao_payment(
    request: KakaoPayRequest,
    response: Response,
    session_id: Optional[str] = Cookie(None),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db)
):
    """카카오페이 결제 처리 API"""
    effective_session_id = x_session_id or session_id
    if not effective_session_id:
        raise HTTPException(status_code=400, detail="세션 ID가 필요합니다.")
    
    # 세션 쿠키 설정
    set_session_cookie(response, effective_session_id)
    
    config = await get_payment_config("kakao", db)
    
    # 주문 정보 조회
    try:
        order_id = int(request.order_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="잘못된 주문 ID 형식입니다.")
        
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="주문을 찾을 수 없습니다.")
    
    try:
        # 카카오페이 결제 요청
        async with httpx.AsyncClient() as client:
            # 요청 데이터 준비
            request_data = {
                "cid": "TC0ONETIME",  # 테스트용 CID
                "partner_order_id": str(order.id),
                "partner_user_id": effective_session_id,
                "item_name": request.item_name,
                "quantity": request.quantity,
                "total_amount": str(request.total_amount),
                "tax_free_amount": "0",
                "approval_url": f"{settings.FRONTEND_URL}/payments/success?order_id={order.id}&tid=",
                "cancel_url": f"{settings.FRONTEND_URL}/payments/cancel",
                "fail_url": f"{settings.FRONTEND_URL}/payments/fail"
            }
            
            logging.info(f"카카오페이 결제 요청 데이터: {request_data}")
            
            # URL 인코딩된 데이터로 요청
            encoded_data = urlencode(request_data)
            
            response = await client.post(
                f"{settings.KAKAO_PAY_API_URL}/v1/payment/ready",
                headers={
                    "Authorization": f"KakaoAK {settings.KAKAO_ADMIN_KEY}",
                    "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
                },
                content=encoded_data.encode('utf-8')
            )
            
            if response.status_code == 200:
                response_data = response.json()
                # 응답 데이터 상세 로깅 추가
                logging.info(f"카카오페이 결제 응답 원본: {response.text}") 
                logging.info(f"파싱된 카카오페이 응답 데이터: {response_data}")
                next_url = response_data.get("next_redirect_pc_url")
                logging.info(f"수신된 next_redirect_pc_url: {next_url}")
                
                # 주문 정보 업데이트
                tid = response_data.get("tid")
                if not tid:
                    logging.error("카카오페이 응답에 tid가 없습니다.")
                    raise HTTPException(status_code=500, detail="카카오페이 처리 중 오류 발생: tid 누락")
                
                order.payment_key = tid
                db.commit()
                
                # 카카오페이 API 응답 형식 그대로 반환
                return response_data
            else:
                error_response = response.json()
                logging.error(f"카카오페이 결제 요청 실패: {error_response}")
                raise HTTPException(
                    status_code=400,
                    detail=f"카카오페이 결제 요청 실패: {error_response}"
                )
                
    except Exception as e:
        logging.error(f"카카오페이 결제 요청 중 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/payment/kakao/complete")
async def complete_kakao_payment(
    tid: str = Query(...),
    pg_token: str = Query(...),
    order_id: int = Query(...),
    db: Session = Depends(get_db)
):
    """
    카카오페이 결제 완료 처리를 합니다.
    """
    try:
        # 주문 조회
        order = db.query(Order).filter(Order.id == order_id).options(joinedload(Order.user)).first() # User 정보도 함께 로드
        if not order:
            raise HTTPException(status_code=404, detail="주문을 찾을 수 없습니다.")

        # 결제 승인 요청
        headers = {
            "Authorization": f"KakaoAK {settings.KAKAO_ADMIN_KEY}",
            "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
        }

        # partner_user_id를 order.session_id로 수정
        partner_user_id_to_send = order.session_id
        if not partner_user_id_to_send:
             # 만약 session_id가 없는 비정상적인 경우 처리 (예: 오래된 주문)
             # 또는 회원 주문 시 user_id를 사용해야 할 경우 추가 로직 필요
             # 현재는 session_id가 항상 있다고 가정
             logging.warning(f"Order {order_id}에 session_id가 없습니다. anonymous로 대체합니다.")
             partner_user_id_to_send = "anonymous" # 혹은 다른 기본값 설정

        data = {
            "cid": "TC0ONETIME",  # 테스트용 코드
            "tid": tid,
            "partner_order_id": str(order_id),
            "partner_user_id": partner_user_id_to_send, # 수정된 부분
            "pg_token": pg_token
        }

        logging.info(f"카카오페이 결제 승인 요청 데이터: {data}") # 데이터 로깅 추가

        response = requests.post(
            f"{settings.KAKAO_PAY_API_URL}/v1/payment/approve", # KAKAO_PAY_API_URL 사용
            headers=headers,
            data=data
        )

        if response.status_code != 200:
            error_detail = response.text
            try:
                error_json = response.json()
                error_detail = error_json.get("msg", error_detail) # 카카오 에러 메시지 추출 시도
            except json.JSONDecodeError:
                pass # JSON 파싱 실패 시 원본 텍스트 사용
            logging.error(f"카카오페이 결제 승인 실패 (상태 코드: {response.status_code}): {error_detail}")
            raise HTTPException(status_code=400, detail=f"결제 승인에 실패했습니다: {error_detail}")

        # 결제 완료 후 주문 상태 업데이트
        order.status = "paid"  # 결제 완료 상태로 변경
        order.payment_key = tid  # 결제 고유 번호 저장
        db.commit()
        db.refresh(order) # 변경사항을 order 객체에 반영

        logging.info(f"카카오페이 결제 승인 및 주문 업데이트 성공: order_id={order.id}")

        # 업데이트된 주문 정보를 로드하고 OrderResponse 스키마로 변환하여 반환
        # 주문 아이템과 메뉴 정보를 함께 로드
        updated_order = db.query(Order).options(
            joinedload(Order.order_items).joinedload(OrderItem.menu)
        ).filter(Order.id == order_id).first()

        if not updated_order:
             # 혹시 모를 에러 처리
             logging.error(f"결제 완료 후 주문 정보를 다시 로드하는데 실패했습니다: order_id={order_id}")
             raise HTTPException(status_code=500, detail="결제는 완료되었으나 주문 정보를 가져오는데 실패했습니다.")

        order_items_response = [
            {
                "id": item.id,
                "order_id": item.order_id,
                "menu_id": item.menu_id,
                "menu_name": item.menu.name if item.menu else "알 수 없음",
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "total_price": item.total_price
            } 
            for item in updated_order.order_items
        ]

        # OrderSchemaResponse 사용 (기존 OrderResponse와 이름 충돌 방지)
        response_data = OrderSchemaResponse(
            id=updated_order.id,
            user_id=updated_order.user_id,
            total_amount=updated_order.total_amount,
            status=updated_order.status,
            payment_method=updated_order.payment_method,
            payment_key=updated_order.payment_key,
            session_id=updated_order.session_id,
            delivery_address=updated_order.delivery_address,
            delivery_request=updated_order.delivery_request,
            phone_number=updated_order.phone_number,
            created_at=updated_order.created_at,
            updated_at=updated_order.updated_at,
            items=order_items_response
        )

        # 이제 주문 정보를 포함하여 반환
        return {"status": "success", "message": "결제가 완료되었습니다.", "order": response_data.model_dump()}
    except HTTPException as he:
        logging.error(f"결제 완료 처리 중 HTTP 오류 발생: {he.detail}")
        raise he
    except Exception as e:
        logging.exception(f"카카오페이 결제 완료 처리 중 예외 발생: {str(e)}") # 스택 트레이스 로깅
        raise HTTPException(status_code=500, detail="결제 완료 처리 중 오류가 발생했습니다.")

@router.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: int,
    session_id: Optional[str] = Cookie(None),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db)
):
    """특정 주문 정보 조회 API"""
    effective_session_id = x_session_id or session_id
    if not effective_session_id:
        raise HTTPException(status_code=400, detail="세션 ID가 필요합니다.")

    order = db.query(Order).options(
        joinedload(Order.order_items).joinedload(OrderItem.menu)
    ).filter(Order.id == order_id).first()

    if not order:
        raise HTTPException(status_code=404, detail="주문을 찾을 수 없습니다.")

    # 세션 ID 검증 (해당 주문이 현재 세션 사용자의 주문인지 확인)
    if order.session_id != effective_session_id:
        raise HTTPException(status_code=403, detail="해당 주문에 대한 접근 권한이 없습니다.")

    # OrderItem 정보를 OrderItemResponse 스키마에 맞게 변환
    order_items_response = [
        {
            "id": item.id,
            "menu_id": item.menu_id,
            "menu_name": item.menu.name if item.menu else "알 수 없음",
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "total_price": item.total_price
        } 
        for item in order.order_items
    ]

    # OrderResponse 반환 시 .isoformat() 제거
    return OrderResponse(
        id=order.id,
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
        items=order_items_response
    ) 