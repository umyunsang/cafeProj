from fastapi import APIRouter, HTTPException, Depends, Cookie, Header, Response, Query
from sqlalchemy.orm import Session, joinedload
from ..database import get_db
from ..models.payment import PaymentConfig
from ..models.order import Order, OrderItem
from ..models.cart import Cart, CartItem
from ..models.menu import Menu
from ..schemas.payment import OrderRequest, PaymentRequest, KakaoPayRequest, OrderItemRequest as PaymentOrderItemRequest, OrderResponse
from ..schemas.order import OrderCreate, OrderItemCreate
import httpx
import json
from urllib.parse import urlencode
from typing import Optional, List
import logging
from ..core.config import settings
import requests
from datetime import datetime
import pytz
from ..crud.order import create_order as crud_create_order, get_order_by_number
import uuid # 멱등성 키를 위해 추가
from fastapi.responses import RedirectResponse

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
async def create_order_route(
    request: OrderRequest,
    response: Response,
    session_id: Optional[str] = Cookie(None),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db)
):
    """주문 생성 API (crud.order 사용)"""
    try:
        # 세션 ID 확인 및 설정
        effective_session_id = x_session_id or session_id
        logging.info(f"Using session ID: {effective_session_id}")
        if not effective_session_id:
            raise HTTPException(status_code=400, detail="세션 ID가 필요합니다.")
        set_session_cookie(response, effective_session_id)
        
        # 결제 설정 확인
        try:
            await get_payment_config(request.payment_method, db)
        except Exception as e:
            logging.error(f"결제 설정 확인 중 오류: {str(e)}")
            raise
            
        # OrderRequest 를 OrderCreate 스키마에 맞게 변환
        order_items_create = [
            OrderItemCreate(menu_id=item.menu_id, quantity=item.quantity)
            for item in request.items
        ]
        
        # OrderCreate 객체 생성
        order_create_data = OrderCreate(
            payment_method=request.payment_method,
            session_id=effective_session_id,
            items=order_items_create,
            # user_id 등 필요한 다른 필드도 request에서 가져와 할당 가능
            # 예: user_id=request.user_id (OrderRequest에 user_id가 있다면)
        )
        
        # crud 함수 호출하여 주문 생성
        created_order = crud_create_order(db=db, order_data=order_create_data)
        
        logging.info(f"주문 생성 성공 (via crud): order_id={created_order.id}, order_number={created_order.order_number}")
        
        # 장바구니 비우기 (주문 성공 후)
        cart = db.query(Cart).filter(Cart.session_id == effective_session_id).first()
        if cart:
             db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
             # 필요 시 Cart 자체도 삭제 or 상태 변경
             # db.delete(cart)
             db.commit()
             logging.info(f"Cart cleared for session {effective_session_id}")
        
        # 생성된 주문의 ID만 반환 (기존 로직 유지)
        return {"order_id": created_order.id} 
        
    except HTTPException as he:
        logging.error(f"HTTP 오류 발생: {he.detail}")
        raise
    except Exception as e:
        logging.error(f"예상치 못한 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=f"예상치 못한 오류가 발생했습니다: {str(e)}")

@router.post("/payment/naver/prepare")
async def prepare_naver_payment(
    request: OrderRequest,
    response: Response,
    session_id: Optional[str] = Cookie(None),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db)
):
    """네이버페이 결제를 위한 주문 정보 생성 및 프론트엔드 SDK 파라미터 반환"""
    effective_session_id = x_session_id or session_id
    if not effective_session_id:
        raise HTTPException(status_code=400, detail="세션 ID가 필요합니다.")

    set_session_cookie(response, effective_session_id)
    
    # 네이버페이 설정 존재 여부 확인 (필요시)
    # await get_payment_config("naver", db)

    # ****** 중복 주문 확인 로직 추가 시작 ******
    logging.info(f"Checking for existing pending Naver Pay order for session: {effective_session_id}")
    existing_pending_order = db.query(Order).filter(
        Order.session_id == effective_session_id,
        Order.payment_method == "naver",
        Order.status == "pending"
    ).order_by(Order.created_at.desc()).first()

    # 기존 pending 주문이 있고, 아이템 내용이 현재 요청과 동일한지 비교 (간단 비교)
    if existing_pending_order:
        # 주의: 아이템 비교 로직은 더 정교해야 할 수 있음 (순서 무관 비교 등)
        current_item_ids_quantities = sorted([(item.menu_id, item.quantity) for item in request.items])
        existing_items_data = []
        try:
            # DB의 items 필드(JSON 문자열) 파싱
            items_json_str = existing_pending_order.items
            if isinstance(items_json_str, str): # 문자열인지 확인 후 파싱
                 existing_items_list = json.loads(items_json_str)
                 existing_items_data = sorted([(item.get('menu_id'), item.get('quantity')) for item in existing_items_list])
            elif isinstance(items_json_str, list): # 이미 리스트 형태일 경우 (이전 저장 방식)
                 existing_items_data = sorted([(item.get('menu_id'), item.get('quantity')) for item in items_json_str])
            # else: None 이거나 다른 타입이면 빈 리스트 유지
        except (json.JSONDecodeError, TypeError) as e:
            logging.warning(f"Error decoding existing order items JSON for order {existing_pending_order.id}: {e}")
            # 아이템 비교 불가 시, 안전하게 새 주문 생성 진행
            existing_pending_order = None # 비교 실패 시 새 주문 생성하도록 리셋

        if existing_pending_order and current_item_ids_quantities == existing_items_data:
            logging.warning(f"Found existing identical pending Naver Pay order {existing_pending_order.id} for session {effective_session_id}. Reusing this order.")
            created_order = existing_pending_order # 기존 주문 사용
        else:
            # 기존 주문이 없거나 내용이 다르면 새로 생성 진행
            existing_pending_order = None 
            logging.info("No identical pending order found, creating a new one.")
    else:
        existing_pending_order = None
        logging.info("No existing pending Naver Pay order found for this session.")
    # ****** 중복 주문 확인 로직 추가 끝 ******

    # 주문 생성 (기존 주문이 없을 경우에만)
    if not existing_pending_order:
        try:
            order_items_create = [
                OrderItemCreate(menu_id=item.menu_id, quantity=item.quantity)
                for item in request.items
            ]
            order_create_data = OrderCreate(
                payment_method="naver", # 결제 수단 명시
                session_id=effective_session_id,
                items=order_items_create,
                total_amount=request.total_amount # 요청 받은 금액 사용
            )
            created_order = crud_create_order(db=db, order_data=order_create_data)
            logging.info(f"새로운 네이버페이 주문 생성됨: Order ID={created_order.id}, Order Number={created_order.order_number}")
        except ValueError as ve:
            db.rollback()
            logging.error(f"주문 생성 중 오류 (ValueError): {str(ve)}")
            raise HTTPException(status_code=400, detail=str(ve))
        except Exception as e:
            db.rollback()
            logging.exception("네이버페이 준비 - 주문 생성 중 예상치 못한 오류 발생")
            raise HTTPException(status_code=500, detail="주문 생성 중 오류 발생")
    
    # --- 여기서부터는 created_order 변수에 기존 주문 또는 새로 생성된 주문이 할당됨 ---
    try:
        # productItems 구성 (SDK 전달용)
        # created_order의 items 는 DB에서 로드 필요 (기존 주문 재사용 시)
        # !! 중요: created_order.items 가 JSON 문자열일 수 있으므로 파싱 필요 !!
        product_items_for_sdk = []
        final_order_items = [] # DB에서 로드하거나 새로 생성된 아이템 객체 저장용

        if created_order.items and isinstance(created_order.items, str):
            try:
                parsed_items = json.loads(created_order.items)
                # JSON 파싱 성공 시, 메뉴 정보 로드를 위해 DB 재조회 필요
                # 여기서는 간단히 파싱된 이름 사용 (정확한 메뉴 이름은 DB 재조회 필요)
                for item_data in parsed_items:
                     product_items_for_sdk.append({
                         "categoryType": "FOOD", "categoryId": "CAFE", 
                         "uid": str(item_data.get('menu_id')),
                         "name": item_data.get('menu_name', 'Unknown'), # 파싱된 이름 사용
                         "count": item_data.get('quantity')
                     })
                # final_order_items 는 이 경우 비워둠 (DB 재조회 안 했으므로)
            except json.JSONDecodeError:
                 logging.error(f"Failed to parse items JSON for order {created_order.id}")
                 # 파싱 실패 시 빈 리스트 사용
        elif created_order.order_items: # OrderItem 객체들이 로드되어 있는 경우 (새로 생성된 경우)
             final_order_items = created_order.order_items
             for item in final_order_items:
                 product_items_for_sdk.append({
                     "categoryType": "FOOD", "categoryId": "CAFE", 
                     "uid": str(item.menu.id), "name": item.menu.name, "count": item.quantity,
                 })
        
        # productName 구성 시 final_order_items 또는 product_items_for_sdk 사용
        product_name = "주문 상품" # 기본값
        if product_items_for_sdk:
            first_item_name = product_items_for_sdk[0].get('name', '상품')
            item_count = len(product_items_for_sdk)
            product_name = f"{first_item_name}" + (f" 외 {item_count - 1}건" if item_count > 1 else "")
        
        # SDK 파라미터 구성
        sdk_params = {
            "merchantUserKey": effective_session_id,
            "merchantPayKey": str(created_order.id), # 우리 시스템 주문 ID
            "productName": product_name,
            "totalPayAmount": int(created_order.total_amount), 
            "taxScopeAmount": int(created_order.total_amount),
            "taxExScopeAmount": 0,
            "returnUrl": f"{settings.FRONTEND_URL}/payments/naver/callback", 
            "productItems": product_items_for_sdk
        }
        
        logging.info(f"네이버페이 SDK 파라미터 생성 완료 (Order ID: {created_order.id}): {sdk_params}")

        # SDK 파라미터 반환
        return sdk_params

    except Exception as e:
        # 기존 주문 재사용 시에도 SDK 파라미터 생성 중 오류 발생 가능
        logging.exception(f"네이버페이 준비 - SDK 파라미터 생성 중 예상치 못한 오류 발생 (Order ID: {created_order.id})")
        raise HTTPException(status_code=500, detail="결제 준비 중 오류 발생")

@router.get("/payment/naver/callback")
async def verify_and_approve_naver_payment(
    # 네이버페이 리다이렉션 쿼리 파라미터
    resultCode: Optional[str] = Query(None), 
    paymentId: Optional[str] = Query(None), # 네이버페이 결제번호 (승인 API 호출 시 필요)
    merchantPayId: Optional[str] = Query(None), # 우리 주문 ID (DB 조회용)
    reserveId: Optional[str] = Query(None), # 결제 예약 ID (보조 확인용)
    # ... 기타 네이버페이가 전달하는 파라미터 ...
    db: Session = Depends(get_db)
):
    """네이버페이 결제 콜백 수신 및 최종 승인 요청 API"""
    logging.info(f"네이버페이 결제 콜백 수신: resultCode={resultCode}, paymentId={paymentId}, merchantPayId={merchantPayId}, reserveId={reserveId}")

    # 1. 콜백 결과 및 파라미터 유효성 검사
    if resultCode != "Success" or not paymentId or not merchantPayId:
        logging.error(f"네이버페이 결제 실패 또는 필수 파라미터 누락: resultCode={resultCode}, paymentId={paymentId}, merchantPayId={merchantPayId}")
        # 실패 시 사용자에게 안내 페이지 리다이렉션 권장
        # return RedirectResponse(url=f"/payments/fail?reason=naver_callback_fail&code={resultCode}")
        raise HTTPException(status_code=400, detail=f"결제 실패 또는 잘못된 요청 (Code: {resultCode})")

    # 2. 주문 정보 조회 (merchantPayId 사용)
    try:
        order_id_int = int(merchantPayId)
    except ValueError:
        raise HTTPException(status_code=400, detail="잘못된 주문 ID 형식")

    order = db.query(Order).filter(Order.id == order_id_int).first()
    if not order:
        logging.error(f"주문을 찾을 수 없음: merchantPayId={merchantPayId}")
        raise HTTPException(status_code=404, detail="주문을 찾을 수 없음")

    # 3. 주문 상태 확인 (이미 처리되었거나, 잘못된 상태인지)
    if order.status == "paid":
        logging.warning(f"이미 처리된 주문입니다: Order ID={order.id}")
        # 성공 페이지 리다이렉션
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/payments/success?order_id={order.id}")
    elif order.status != "pending":
        logging.error(f"처리할 수 없는 주문 상태: Order ID={order.id}, Status={order.status}")
        raise HTTPException(status_code=400, detail="처리할 수 없는 주문 상태")
    
    # 4. (선택적) reserveId 일치 확인 - 준비 단계에서 저장했다면
    # if order.payment_key != reserveId:
    #     logging.error(f"네이버페이 예약번호 불일치: DB={order.payment_key}, Callback={reserveId}")
    #     raise HTTPException(status_code=400, detail="결제 정보 불일치 (reserveId)")

    # 5. 네이버페이 결제 승인 API 호출 (★ 중요: 실제 API 확인 필수 ★)
    try:
        # 결제 승인 API URL (가이드라인 기반 -> curl 예시 기반으로 수정)
        if not settings.NAVER_PAY_PARTNER_ID: # 파트너 ID 존재 여부 확인은 유지
            raise ValueError("네이버페이 파트너 ID가 설정되지 않았습니다.")
            
        # URL 경로에 파트너 ID 대신 'naverpay-partner' 사용 (curl 예시 기반)
        approve_url = f"{settings.NAVER_PAY_API_URL}/naverpay-partner/naverpay/payments/v2.2/apply/payment"
        
        # 멱등성 키 생성
        idempotency_key = str(uuid.uuid4())
        
        # !!! 디버깅 로그 추가: 사용되는 설정 값 확인 !!!
        logging.info(f"[DEBUG] Naver Pay API Call Params: URL={approve_url}, PartnerID={settings.NAVER_PAY_PARTNER_ID}, ClientID={settings.NAVER_PAY_CLIENT_ID}, ChainID={settings.NAVER_PAY_CHAIN_ID}")

        headers = {
            "X-Naver-Client-Id": settings.NAVER_PAY_CLIENT_ID,
            "X-Naver-Client-Secret": settings.NAVER_PAY_CLIENT_SECRET,
            "X-NaverPay-Chain-Id": settings.NAVER_PAY_CHAIN_ID,
            "X-NaverPay-Idempotency-Key": idempotency_key,
            "Content-Type": "application/x-www-form-urlencoded" # 가이드라인은 form-urlencoded
        }
        
        # 요청 데이터 (paymentId 만 필요)
        data = { "paymentId": paymentId }
        
        logging.info(f"네이버페이 결제 승인 요청 ({approve_url}): Headers={headers}, Data={data}")

        async with httpx.AsyncClient(timeout=60.0) as client: # 타임아웃 60초 권장
            approve_response = await client.post(approve_url, headers=headers, data=data)
            
            try:
                 approve_data = approve_response.json()
                 logging.info(f"네이버페이 결제 승인 응답 ({approve_response.status_code}): {approve_data}")
            except Exception:
                 logging.error(f"네이버페이 승인 응답 JSON 파싱 실패: {approve_response.text}", exc_info=True)
                 approve_data = None
                 
            # 409 Conflict 처리 (멱등성)
            if approve_response.status_code == 409:
                logging.warning(f"네이버페이 승인 멱등성 키 중복 요청. 이전 응답 재처리 시도.")
                pass # 아래 로직에서 approve_data 사용
            elif approve_response.status_code == 200: # 성공 응답 처리
                 pass # 아래 검증 로직 진행
            else: # 200, 409 외 다른 상태 코드는 실패로 간주
                 error_message = approve_data.get("message") if approve_data else "API 응답 오류"
                 logging.error(f"네이버페이 결제 승인 API 호출 실패 ({approve_response.status_code}): {error_message}")
                 # 주문 상태를 'failed'로 변경하는 것을 고려
                 order.status = "payment_failed"
                 db.commit()
                 raise HTTPException(status_code=400, detail=f"결제 승인 실패: {error_message}")

            # 6. 승인 응답 검증 (API 응답 구조 확인 후 수정 필요)
            if approve_data and approve_data.get("code") == "Success":
                payment_detail = approve_data.get("body", {}).get("detail", {})
                paid_amount = int(payment_detail.get("totalPayAmount", 0))
                admission_state = payment_detail.get("admissionState") # 예시: "SUCCESS"

                # 최종 검증: 상태 SUCCESS 이고 금액 일치
                if admission_state == "SUCCESS" and paid_amount == int(order.total_amount):
                    logging.info("네이버페이 결제 최종 승인 및 검증 성공.")
                    
                    # --- 주문 번호 생성 (paid 상태 업데이트 직전) ---
                    seoul_tz = pytz.timezone('Asia/Seoul')
                    today_str = datetime.now(seoul_tz).strftime('%Y%m%d')
                    # 마지막 주문 조회 시 with_for_update() 추가 (동시성 제어 시도)
                    last_order_today = db.query(Order).filter(Order.order_number.like(f"{today_str}-%")).order_by(Order.order_number.desc()).with_for_update().first()
                    next_seq = 1
                    if last_order_today and last_order_today.order_number:
                        try:
                            last_seq = int(last_order_today.order_number.split('-')[-1])
                            next_seq = last_seq + 1
                        except (ValueError, IndexError):
                            logging.warning(f"이전 주문 번호 형식 오류: {last_order_today.order_number}")
                            pass
                    new_order_number = f"{today_str}-{next_seq:03d}"
                    order.order_number = new_order_number
                    logging.info(f"새 주문 번호 생성: {new_order_number}")
                    # --- 주문 번호 생성 끝 ---
                    
                    # 주문 상태 업데이트
                    order.status = "paid"
                    order.payment_key = paymentId # 최종 paymentId로 업데이트
                    # 필요시 상세 정보 저장
                    # order.payment_details = json.dumps(payment_detail, ensure_ascii=False)
                    db.commit()
                    db.refresh(order)
                    logging.info(f"주문 상태 'paid'로 업데이트 성공: Order ID={order.id}")
                    
                    # 장바구니 비우기 (최종 성공 시점에)
                    cart = db.query(Cart).filter(Cart.session_id == order.session_id).first()
                    if cart:
                        db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
                        db.commit()
                        logging.info(f"Cart cleared for session {order.session_id} after successful payment.")
                        
                    # 성공 페이지로 리다이렉트
                    return RedirectResponse(url=f"{settings.FRONTEND_URL}/payments/success?order_id={order.id}")
                else:
                    # 승인은 되었으나 상태/금액 불일치
                    logging.error(f"네이버페이 결제 승인 후 검증 실패: Status={admission_state}, AmountMatch={paid_amount == int(order.total_amount)}")
                    # 문제 상황 -> 취소 또는 수동 확인 필요
                    # 예: await call_naver_cancel_api(paymentId, "검증 실패 (상태/금액 불일치)")
                    raise HTTPException(status_code=400, detail="결제 검증 실패 (상태 또는 금액 불일치)")
            else:
                 # 승인 API 자체가 실패한 경우 (위에서 처리됨, 여기 도달하면 로직 오류)
                 error_message = approve_data.get("message") if approve_data else "승인 API 응답 오류"
                 logging.error(f"네이버페이 결제 승인 실패 (code!=Success): {error_message}")
                 raise HTTPException(status_code=400, detail=f"결제 승인에 실패했습니다: {error_message}")

    except httpx.HTTPStatusError as e:
        error_text = e.response.text
        logging.error(f"네이버페이 승인 API 오류 (HTTP Status {e.response.status_code}): {error_text}")
        if e.response.status_code == 401:
             raise HTTPException(status_code=401, detail="네이버페이 인증 정보가 잘못되었습니다.")
        raise HTTPException(status_code=e.response.status_code, detail=f"결제 승인 통신 오류 ({e.response.status_code})")
    except Exception as verify_err:
        logging.exception("네이버페이 결제 승인 중 예상치 못한 오류")
        # 오류 발생 시 주문 상태 업데이트 고려 (예: 'payment_failed')
        order.status = "payment_failed"
        db.commit()
        raise HTTPException(status_code=500, detail=f"결제 승인 중 오류 발생: {str(verify_err)}")

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
    """카카오페이 결제 완료 처리 및 주문 정보 반환"""
    config = await get_payment_config("kakao", db)
    
    # 주문 정보 조회 (order_number 포함)
    db_order = db.query(Order).options(
        joinedload(Order.order_items).joinedload(OrderItem.menu) # 아이템 정보 로드
    ).filter(Order.id == order_id).first()
    
    if not db_order:
        raise HTTPException(status_code=404, detail="주문을 찾을 수 없습니다.")
        
    if db_order.payment_key != tid:
         logging.warning(f"TID 불일치: 요청 TID={tid}, 주문 TID={db_order.payment_key}")
         # 실제로는 더 엄격한 오류 처리가 필요할 수 있음
         raise HTTPException(status_code=400, detail="결제 정보가 일치하지 않습니다.")

    # 카카오페이 결제 승인 요청
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.KAKAO_PAY_API_URL}/v1/payment/approve",
                headers={
                    "Authorization": f"KakaoAK {settings.KAKAO_ADMIN_KEY}",
                    "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
                },
                data={
                    "cid": "TC0ONETIME",
                    "tid": tid,
                    "partner_order_id": str(db_order.id), # 문자열로 변환
                    "partner_user_id": db_order.session_id, # 주문에 저장된 세션 ID 사용
                    "pg_token": pg_token
                }
            )
            
            approval_data = response.json()
            logging.info(f"카카오페이 결제 승인 응답: {approval_data}")
            
            if response.status_code != 200:
                logging.error(f"카카오페이 결제 승인 실패: {approval_data}")
                # 주문 상태를 'failed' 등으로 업데이트하는 로직 추가 고려
                db_order.status = "payment_failed"
                db.commit()
                raise HTTPException(status_code=400, detail=f"카카오페이 결제 승인 실패: {approval_data.get('msg', 'Unknown error')}")

            # --- 주문 번호 생성 (paid 상태 업데이트 직전) ---
            seoul_tz = pytz.timezone('Asia/Seoul')
            today_str = datetime.now(seoul_tz).strftime('%Y%m%d')
            # 마지막 주문 조회 시 with_for_update() 추가 (동시성 제어 시도)
            last_order_today = db.query(Order).filter(Order.order_number.like(f"{today_str}-%")).order_by(Order.order_number.desc()).with_for_update().first()
            next_seq = 1
            if last_order_today and last_order_today.order_number:
                try:
                    last_seq = int(last_order_today.order_number.split('-')[-1])
                    next_seq = last_seq + 1
                except (ValueError, IndexError):
                    logging.warning(f"이전 주문 번호 형식 오류: {last_order_today.order_number}")
                    pass
            new_order_number = f"{today_str}-{next_seq:03d}"
            db_order.order_number = new_order_number # 변수명 db_order 사용
            logging.info(f"새 주문 번호 생성: {new_order_number}")
            # --- 주문 번호 생성 끝 ---
            
            # 주문 상태 업데이트 (예: paid)
            db_order.status = "paid"
            # 필요 시 카카오페이 응답에서 추가 정보 저장 (예: aid)
            # db_order.payment_details = approval_data 
            db.commit()
            db.refresh(db_order) # 업데이트된 정보 로드
            logging.info(f"주문 ID {order_id} 상태 'paid'로 업데이트 완료")
            
            # --- 응답 객체 생성 --- 
            # OrderItem 정보를 OrderItemResponse 스키마에 맞게 변환 (별도 리스트로)
            order_items_data = [
                {
                    "id": item.id,
                    "menu_id": item.menu_id,
                    "menu_name": item.menu.name if item.menu else "알 수 없음",
                    "quantity": item.quantity,
                    "unit_price": item.unit_price,
                    "total_price": item.total_price
                } 
                for item in db_order.order_items
            ]
            
            # 최종적으로 반환할 OrderResponse 객체 생성 (스키마 직접 사용)
            final_order_response = OrderResponse(
                id=db_order.id,
                order_number=db_order.order_number,
                user_id=db_order.user_id,
                total_amount=db_order.total_amount,
                status=db_order.status,
                payment_method=db_order.payment_method,
                payment_key=db_order.payment_key,
                session_id=db_order.session_id,
                delivery_address=db_order.delivery_address,
                delivery_request=db_order.delivery_request,
                phone_number=db_order.phone_number,
                created_at=db_order.created_at.isoformat() if db_order.created_at else None,
                updated_at=db_order.updated_at.isoformat() if db_order.updated_at else None,
                items=order_items_data # 변환된 아이템 데이터 사용
            )

            # 성공 응답 반환 (스키마 객체를 dict로 변환하여 전달)
            # Pydantic v1: .dict(), Pydantic v2: .model_dump()
            # 프로젝트의 Pydantic 버전에 맞춰 사용해야 함 (v2 가정)
            return {"status": "success", "message": "결제가 성공적으로 완료되었습니다.", "order": final_order_response.model_dump()}

    except Exception as e:
        db.rollback() # 오류 발생 시 롤백
        logging.exception(f"카카오페이 결제 완료 처리 중 오류 발생 (Order ID: {order_id}): {str(e)}")
        # 주문 상태를 'failed' 등으로 업데이트하는 로직 추가 고려
        try:
            fail_order = db.query(Order).filter(Order.id == order_id).first()
            if fail_order and fail_order.status == "pending":
                fail_order.status = "payment_failed"
                db.commit()
        except Exception as db_err:
             logging.error(f"주문 상태 업데이트 실패 (Order ID: {order_id}): {db_err}")
             
        raise HTTPException(status_code=500, detail=f"결제 완료 처리 중 오류 발생: {str(e)}")

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
    logging.info(f"[DEBUG] Checking session for Order ID {order_id}. Request Session: '{effective_session_id}', DB Order Session: '{order.session_id}'")
    if order.session_id != effective_session_id:
        logging.warning(f"Session ID mismatch for order {order.id}. Access denied.")
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
        order_number=order.order_number,
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

# 네이버페이 결제 취소 엔드포인트
@router.post("/naver/cancel/{order_id}", response_model=OrderResponse)
async def cancel_naver_payment(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # 네이버페이 paymentId 확인 (결제 완료 시 payment_key에 저장된 값 사용)
    if not order.payment_key:
        raise HTTPException(status_code=400, detail="Naver Pay paymentId (payment_key) not found for this order")

    # 상태 확인: 이미 취소되었거나, 'paid' 상태가 아니면 취소 불가 (정책에 따라 조정)
    if order.status == "CANCELLED":
        raise HTTPException(status_code=400, detail="Order already cancelled")
    if order.status != "paid": # 'paid' 상태일 때만 취소 가능하도록 제한 (예시)
        logging.warning(f"Cancellation attempt on order {order_id} with status {order.status}")
        raise HTTPException(status_code=400, detail=f"Order status '{order.status}' cannot be cancelled. Only 'paid' orders can be cancelled.")

    # 네이버페이 설정값 확인
    if not settings.NAVER_PAY_PARTNER_ID or not settings.NAVER_PAY_CLIENT_ID or not settings.NAVER_PAY_CLIENT_SECRET or not settings.NAVER_PAY_CHAIN_ID:
        logging.error("Naver Pay configuration missing in settings.")
        raise HTTPException(status_code=500, detail="Naver Pay configuration is incomplete.")

    # 네이버페이 취소 API URL (수정: 경로에서 파트너 ID 제거)
    cancel_url = f"{settings.NAVER_PAY_API_URL}/naverpay-partner/naverpay/payments/v1/cancel"

    # 멱등성 키 생성
    idempotency_key = str(uuid.uuid4())

    headers = {
        "X-Naver-Client-Id": settings.NAVER_PAY_CLIENT_ID,
        "X-Naver-Client-Secret": settings.NAVER_PAY_CLIENT_SECRET,
        "X-NaverPay-Chain-Id": settings.NAVER_PAY_CHAIN_ID, # 체인 ID 추가
        "X-NaverPay-Idempotency-Key": idempotency_key, # 멱등성 키 추가
        "Content-Type": "application/x-www-form-urlencoded", # Content-Type 변경
    }

    # 요청 데이터 (form-urlencoded)
    payload = {
        "paymentId": order.payment_key, # payment_key 사용
        "cancelAmount": int(order.total_amount), # 전체 취소 가정 (정수형)
        "cancelReason": "사용자 요청", # 취소 사유
        "cancelRequester": "2", # 필수: 가맹점 관리자
        "taxScopeAmount": int(order.total_amount), # 필수: 과세 대상 금액 (전체 금액으로 가정)
        "taxExScopeAmount": 0, # 필수: 면세 대상 금액 (0으로 가정)
        # "environmentDepositAmount": 0, # 필요시 추가
        # "doCompareRest": 0, # 필요시 추가
        # "expectedRestAmount": 0 # 필요시 추가
    }

    try:
        # 타임아웃 60초 설정
        async with httpx.AsyncClient(timeout=60.0) as client:
            logging.info(f"--- Naver Pay Cancel Request ---")
            logging.info(f"URL: {cancel_url}")
            logging.info(f"Headers: {headers}")
            logging.info(f"Payload (data): {payload}") # payload 로깅
            
            # json= 대신 data= 사용
            response = await client.post(cancel_url, headers=headers, data=payload)

            try:
                cancel_data = response.json()
                logging.info(f"--- Naver Pay Cancel Response (Status: {response.status_code}) ---")
                logging.info(f"Body: {json.dumps(cancel_data, ensure_ascii=False)}")
            except json.JSONDecodeError:
                logging.error(f"Naver Pay Cancel Response: Failed to decode JSON (Status: {response.status_code}). Body: {response.text}")
                cancel_data = None
                
            # 409 Conflict 처리 (멱등성 키 중복 시) - API 문서상 명시는 없으나 방어 코드
            if response.status_code == 409:
                logging.warning(f"Naver Pay Cancel: Idempotency key conflict. Assuming previous success or retry needed.")
                # 필요시 이전 상태를 확인하거나, 특정 코드를 반환하여 재시도 유도
                # 여기서는 일단 오류로 처리
                raise HTTPException(status_code=409, detail="Cancellation request conflict (idempotency). Please check status or retry later.")
                
            # HTTP 상태 코드 에러 발생 시 예외 발생
            response.raise_for_status() 

            # 네이버페이 API 응답 코드 확인 (성공: 200 OK + code: Success)
            if response.status_code == 200 and cancel_data and cancel_data.get("code") == "Success":
                cancel_body = cancel_data.get("body", {})
                pay_hist_id = cancel_body.get("payHistId") # 취소 결제 번호
                
                order.status = "CANCELLED"
                # 필요시 취소 관련 정보 저장 (예: 취소 트랜잭션 ID)
                # order.cancel_transaction_id = pay_hist_id 
                db.commit()
                db.refresh(order)
                logging.info(f"Order {order.id} cancelled successfully. Naver Pay Cancel ID: {pay_hist_id}")
                
                # OrderResponse 생성 시 from_orm 사용 (기존 코드 스타일 유지)
                # items 필드는 로드되지 않았으므로, 기본 정보만 반환하거나 필요시 로드 로직 추가 필요
                # 여기서는 필요한 기본 필드만 채워서 반환 (get_order 함수와 다름)
                return OrderResponse(
                    id=order.id,
                    order_number=order.order_number,
                    user_id=order.user_id,
                    total_amount=order.total_amount,
                    status=order.status,
                    payment_method=order.payment_method,
                    payment_key=order.payment_key, # paymentId는 유지될 수 있음
                    session_id=order.session_id,
                    created_at=order.created_at,
                    updated_at=order.updated_at,
                    items=[] # items는 여기서 로드 안함
                )
            else:
                # 네이버페이 API 자체 에러 처리 (문서 기반 코드값 활용)
                error_code = cancel_data.get("code", "Unknown Error Code") if cancel_data else f"HTTP_{response.status_code}" # HTTP 상태 코드도 포함
                error_message = cancel_data.get("message", "No message in response body") if cancel_data else "No response body"
                logging.error(f"Naver Pay cancellation failed for Order {order.id}. Code: {error_code}, Message: {error_message}, Full Response: {json.dumps(cancel_data) if cancel_data else response.text}") # 상세 오류 로깅
                
                # 특정 오류 코드에 따른 분기 처리 (예시)
                if error_code == "AlreadyCanceled":
                    raise HTTPException(status_code=400, detail="Order already fully cancelled on Naver Pay.")
                elif error_code == "OverRemainAmount":
                     raise HTTPException(status_code=400, detail="Cancellation amount exceeds remaining balance on Naver Pay.")
                elif error_code == "InvalidPaymentId":
                    raise HTTPException(status_code=400, detail="Invalid Naver Pay Payment ID provided.")
                # ... 기타 오류 코드 처리 ...
                else:
                    # 일반적인 실패 메시지 또는 구체적인 메시지 사용
                    detail_message = f"Naver Pay cancellation failed: {error_code} - {error_message}"
                    raise HTTPException(status_code=400, detail=detail_message) # 500 대신 400으로 변경하여 클라이언트 오류임을 명시

    except httpx.HTTPStatusError as e:
        # HTTP 오류 처리 (4xx, 5xx)
        error_body = "Unknown error" 
        try:
            error_body = e.response.text # 오류 본문 읽기 시도
        except Exception:
            pass
        logging.error(f"HTTP error calling Naver Pay cancel API for Order {order.id}: {e.response.status_code} - {error_body}")
        # 401 Unauthorized 등 특정 상태 코드 처리 강화 가능
        if e.response.status_code == 401:
             raise HTTPException(status_code=401, detail="Naver Pay authorization failed. Check Client ID/Secret.")
        raise HTTPException(status_code=e.response.status_code, detail=f"Failed to communicate with Naver Pay cancel API: Status {e.response.status_code}, Response: {error_body}")
    except Exception as e:
        # 기타 예외
        logging.exception(f"An unexpected error occurred during Naver Pay cancellation for Order {order.id}")
        raise HTTPException(status_code=500, detail=f"An internal server error occurred during cancellation: {str(e)}") 

# 카카오페이 결제 취소 엔드포인트 함수 (order.py에서 호출됨)
async def cancel_kakao_payment(order_id: int, db: Session = Depends(get_db)) -> OrderResponse:
    """카카오페이 결제를 취소합니다. (order.py의 관리자 엔드포인트에서 호출됨)"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # 카카오페이 tid (결제 준비 시 payment_key에 저장됨) 확인
    if not order.payment_key or order.payment_method != "kakao":
        raise HTTPException(status_code=400, detail="Kakao Pay TID (payment_key) not found or invalid payment method for this order")

    # 상태 확인
    if order.status == "CANCELLED":
        raise HTTPException(status_code=400, detail="Order already cancelled")
    if order.status != "paid": # 'paid' 상태일 때만 취소 가능하도록 제한 (정책에 따라 조정)
        logging.warning(f"Kakao Pay cancellation attempt on order {order_id} with status {order.status}")
        raise HTTPException(status_code=400, detail=f"Order status '{order.status}' cannot be cancelled. Only 'paid' orders can be cancelled.")

    # 카카오페이 설정 확인
    if not settings.KAKAO_PAY_API_URL or not settings.KAKAO_ADMIN_KEY:
        logging.error("Kakao Pay configuration missing in settings.")
        raise HTTPException(status_code=500, detail="Kakao Pay configuration is incomplete.")

    # 카카오페이 취소 API URL
    cancel_url = f"{settings.KAKAO_PAY_API_URL}/v1/payment/cancel"

    headers = {
        "Authorization": f"KakaoAK {settings.KAKAO_ADMIN_KEY}",
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
    }

    # 요청 데이터 (전체 금액 취소 가정)
    payload = {
        "cid": "TC0ONETIME",  # 테스트 CID, 실제 서비스 시 발급받은 CID 사용
        "tid": order.payment_key,
        "cancel_amount": int(order.total_amount), # 취소 금액 (정수)
        "cancel_tax_free_amount": 0 # 비과세 금액 (0으로 가정)
        # 필요시 "cancel_vat_amount": 부가세 금액 추가 (cancel_amount의 1/11)
        # 필요시 "payload": 사용자 정의 데이터 추가
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client: # 카카오페이는 보통 30초
            logging.info(f"--- Kakao Pay Cancel Request ---")
            logging.info(f"URL: {cancel_url}")
            logging.info(f"Headers: {headers}")
            # form-urlencoded 데이터는 문자열로 로깅하는 것이 더 명확할 수 있음
            encoded_payload = urlencode(payload)
            logging.info(f"Payload (encoded): {encoded_payload}")
            
            response = await client.post(cancel_url, headers=headers, data=payload)
            
            try:
                cancel_data = response.json()
                logging.info(f"--- Kakao Pay Cancel Response (Status: {response.status_code}) ---")
                logging.info(f"Body: {json.dumps(cancel_data, ensure_ascii=False)}")
            except json.JSONDecodeError:
                logging.error(f"Kakao Pay Cancel Response: Failed to decode JSON (Status: {response.status_code}). Body: {response.text}")
                cancel_data = None
                
            # 응답 상태 코드 확인
            response.raise_for_status() # 200 외 상태 코드 시 예외 발생
            
            # 카카오페이 취소 성공 응답 확인 (응답 본문의 status 필드 등 확인 필요 - API 문서 기준)
            # 예시: 카카오페이 취소 성공 시 응답에 "status": "CANCEL_PAYMENT" 등이 포함될 수 있음
            if cancel_data and cancel_data.get("status") == "CANCEL_PAYMENT":
                cancelled_amount = cancel_data.get("canceled_amount", {}).get("total", 0)
                # 필요시 취소 금액 검증: if cancelled_amount != int(order.total_amount):
                
                order.status = "CANCELLED"
                # 필요시 취소 관련 정보 저장
                # order.cancel_details = json.dumps(cancel_data, ensure_ascii=False)
                db.commit()
                db.refresh(order)
                logging.info(f"Order {order.id} cancelled successfully via Kakao Pay. Cancelled Amount: {cancelled_amount}")
                
                # OrderResponse 반환 (네이버페이 취소와 동일한 형식)
                return OrderResponse(
                    id=order.id,
                    order_number=order.order_number,
                    user_id=order.user_id,
                    total_amount=order.total_amount,
                    status=order.status,
                    payment_method=order.payment_method,
                    payment_key=order.payment_key,
                    session_id=order.session_id,
                    created_at=order.created_at,
                    updated_at=order.updated_at,
                    items=[] # items는 로드 안함
                )
            else:
                # 카카오페이 API에서 취소 실패 응답을 준 경우
                error_msg = cancel_data.get("msg", "Unknown Kakao Pay cancel error") if cancel_data else "Invalid response body"
                logging.error(f"Kakao Pay cancellation failed for Order {order.id}: {error_msg}")
                # 이미 취소된 경우 등의 특정 에러 코드 처리 가능
                # if cancel_data.get("code") == -780: # 예시 코드
                #     raise HTTPException(status_code=400, detail="Already cancelled on Kakao Pay.")
                raise HTTPException(status_code=400, detail=f"Kakao Pay cancellation failed: {error_msg}")

    except httpx.HTTPStatusError as e:
        # HTTP 오류 (4xx, 5xx)
        error_body = "Unknown error" 
        try:
            error_body = e.response.text # 오류 본문 읽기 시도
        except Exception:
            pass
        logging.error(f"HTTP error calling Kakao Pay cancel API for Order {order.id}: {e.response.status_code} - {error_body}")
        # 401 등 특정 오류 처리
        if e.response.status_code == 401:
            raise HTTPException(status_code=401, detail="Kakao Pay authorization failed.")
        raise HTTPException(status_code=e.response.status_code, detail=f"Failed to communicate with Kakao Pay cancel API: Status {e.response.status_code}")
    except Exception as e:
        # 기타 예외
        logging.exception(f"An unexpected error occurred during Kakao Pay cancellation for Order {order.id}")
        raise HTTPException(status_code=500, detail=f"An internal server error occurred during Kakao Pay cancellation: {str(e)}") 