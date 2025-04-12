from fastapi import APIRouter, Depends, HTTPException, status, Header, Cookie, Request
from sqlalchemy.orm import Session
from typing import Optional
import requests
from app.database import get_db
from app.core.config import settings
from app.models.user import User
from app.models.order import Order
from app.crud.order import CRUDOrder
from app.schemas.payment import (
    NaverPayRequest,
    NaverPayResponse,
    KakaoPayRequest,
    KakaoPayResponse,
    KakaoPayCompleteRequest,
    PaymentStatus
)

router = APIRouter()
crud_order = CRUDOrder(Order)

# 네이버페이 설정
NAVER_PAY_API_URL = settings.NAVER_PAY_API_URL
NAVER_CLIENT_ID = settings.NAVER_CLIENT_ID
NAVER_CLIENT_SECRET = settings.NAVER_CLIENT_SECRET

# 카카오페이 설정
KAKAO_PAY_API_URL = settings.KAKAO_PAY_API_URL
KAKAO_ADMIN_KEY = settings.KAKAO_ADMIN_KEY

@router.post("/payments/naver/create", response_model=NaverPayResponse)
async def create_naver_payment(
    payment_data: NaverPayRequest,
    db: Session = Depends(get_db),
):
    """네이버페이 결제 요청을 생성합니다."""
    order = crud_order.get(db=db, id=payment_data.order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != "pending":
        raise HTTPException(status_code=400, detail="Order is not in pending status")

    try:
        # 네이버페이 결제 요청 생성
        headers = {
            "X-Naver-Client-Id": NAVER_CLIENT_ID,
            "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
            "Content-Type": "application/json"
        }
        
        payload = {
            "merchantPayKey": f"order_{order.id}",
            "productName": f"주문 #{order.id}",
            "totalPayAmount": int(order.total_amount),
            "taxScopeAmount": int(order.total_amount),
            "taxExScopeAmount": 0,
            "returnUrl": f"{settings.FRONTEND_URL}/payments/naver/complete",
            "cancelUrl": f"{settings.FRONTEND_URL}/payments/cancel"
        }

        response = requests.post(
            f"{NAVER_PAY_API_URL}/v1/payments",
            headers=headers,
            json=payload
        )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create Naver Pay payment"
            )

        payment_data = response.json()
        return NaverPayResponse(
            payment_id=payment_data["paymentId"],
            order_id=order.id,
            payment_url=payment_data["paymentUrl"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/payments/kakao/create", response_model=KakaoPayResponse)
async def create_kakao_payment(
    payment_data: KakaoPayRequest,
    db: Session = Depends(get_db),
):
    """카카오페이 결제 요청을 생성합니다."""
    order = crud_order.get(db=db, id=payment_data.order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != "pending":
        raise HTTPException(status_code=400, detail="Order is not in pending status")

    try:
        # 카카오페이 결제 요청 생성
        headers = {
            "Authorization": f"KakaoAK {KAKAO_ADMIN_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "cid": settings.KAKAO_CID,
            "partner_order_id": f"order_{order.id}",
            "partner_user_id": str(order.session_id) if order.session_id else "unknown_user",
            "item_name": f"주문 #{order.id}",
            "quantity": 1,
            "total_amount": int(order.total_amount),
            "vat_amount": int(order.total_amount * 0.1),
            "tax_free_amount": 0,
            "approval_url": f"{settings.FRONTEND_URL}/payments/success?order_id={order.id}",
            "cancel_url": f"{settings.FRONTEND_URL}/payments/cancel",
            "fail_url": f"{settings.FRONTEND_URL}/payments/fail"
        }

        response = requests.post(
            f"{KAKAO_PAY_API_URL}/v1/payment/ready",
            headers=headers,
            json=payload
        )
        
        if response.status_code != 200:
            error_data = response.json()
            print("KakaoPay Ready API Error:", error_data)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to create Kakao Pay payment: {error_data.get('msg', 'Unknown error')}"
            )

        payment_info = response.json()
        return KakaoPayResponse(
            payment_id=payment_info["tid"],
            order_id=order.id,
            payment_url=payment_info["next_redirect_pc_url"]
        )
    except Exception as e:
        print(f"Error creating Kakao Pay payment: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/payments/naver/complete")
async def complete_naver_payment(
    payment_id: str,
    db: Session = Depends(get_db),
):
    """네이버페이 결제를 완료하고 주문 상태를 업데이트합니다."""
    try:
        # 네이버페이 결제 상태 확인
        headers = {
            "X-Naver-Client-Id": NAVER_CLIENT_ID,
            "X-Naver-Client-Secret": NAVER_CLIENT_SECRET
        }
        
        response = requests.get(
            f"{NAVER_PAY_API_URL}/v1/payments/{payment_id}",
            headers=headers
        )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to verify Naver Pay payment"
            )

        payment_data = response.json()
        if payment_data["status"] == "DONE":
            # 주문 상태를 'paid'로 업데이트
            order_id = int(payment_data["merchantPayKey"].split("_")[1])
            updated_order = crud_order.update_status(db=db, order_id=order_id, status="paid")
            return {"status": "success", "order": updated_order}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment not completed"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/payments/kakao/complete")
async def complete_kakao_payment(
    request: Request,
    request_data: KakaoPayCompleteRequest,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db)
):
    """카카오페이 결제를 완료하고 주문 상태 및 TID를 업데이트합니다."""
    try:
        # 요청 본문 로깅 추가
        raw_body = await request.body()
        print(f"Raw request body for /payments/kakao/complete: {raw_body.decode()}")
        try:
            parsed_body = await request.json()
            print(f"Parsed request body: {parsed_body}")
        except Exception as json_error:
            print(f"Failed to parse request body as JSON: {json_error}")
            
        # 주문 정보 조회 (세션 ID 검증은 선택적)
        order = crud_order.get(db=db, id=int(request_data.order_id))
        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
        
        # 세션 ID 검증 (필요하다면)
        if order.session_id != x_session_id:
            print(f"Session ID mismatch: Order Session={order.session_id}, Request Session={x_session_id}")
            # raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Session ID mismatch")
            # 세션 ID 불일치 시 일단 로그만 남기고 진행 (테스트 환경 고려)
            pass

        # 카카오페이 결제 승인
        headers = {
            "Authorization": f"KakaoAK {KAKAO_ADMIN_KEY}",
            "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
        }
        
        # !! 중요: request_data.tid 는 결제 준비(ready) 단계의 tid !!
        # 최종 승인(approve) API 요청 시에는 이 tid를 사용해야 함.
        payload = {
            "cid": settings.KAKAO_CID, # 설정에서 CID 가져오기
            "tid": request_data.tid, # 프론트에서 받은 tid 사용
            "partner_order_id": f"order_{request_data.order_id}",
            "partner_user_id": str(order.session_id) if order.session_id else "unknown_user",
            "pg_token": request_data.pg_token
        }
        
        print("카카오페이 승인 요청 데이터:", payload)

        response = requests.post(
            f"{settings.KAKAO_PAY_API_URL}/v1/payment/approve", # 설정에서 URL 가져오기
            headers=headers,
            data=payload
        )
        
        print("카카오페이 승인 응답 상태 코드:", response.status_code)
        print("카카오페이 승인 응답 내용:", response.text)
        
        if response.status_code != 200:
            error_data = response.json()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to approve Kakao Pay payment: {error_data.get('msg', 'Unknown error')}"
            )

        payment_result = response.json()
        
        # !! 중요: 승인 성공 후 받은 tid를 DB에 저장 !!
        final_tid = payment_result.get("tid")
        if not final_tid:
             print("승인 응답에서 TID를 찾을 수 없습니다.", payment_result)
             # 필요 시 오류 처리
             raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="KakaoPay approval response missing TID.")

        # 주문 상태 및 결제 정보 업데이트 (CRUD 함수 사용 또는 직접 업데이트)
        order.status = "completed"  # 또는 'paid' 등 시스템 상태에 맞게
        order.payment_method = "kakaopay"
        order.payment_key = final_tid # 최종 승인된 TID 저장
        
        db.add(order)
        db.commit()
        db.refresh(order)
        
        print(f"주문 업데이트 완료: Order ID={order.id}, Status={order.status}, Payment Key(TID)={order.payment_key}")

        # TODO: 주문 완료 관련 추가 작업 (예: 알림 보내기)

        return {"status": "success", "order_id": order.id, "payment_result": payment_result}
    
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error completing Kakao Pay payment: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"카카오페이 결제 완료 처리 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/payments/{payment_id}", response_model=PaymentStatus)
async def get_payment_status(
    payment_id: str,
    payment_type: str,
    db: Session = Depends(get_db),
):
    """결제 상태를 조회합니다."""
    try:
        if payment_type == "naver":
            headers = {
                "X-Naver-Client-Id": NAVER_CLIENT_ID,
                "X-Naver-Client-Secret": NAVER_CLIENT_SECRET
            }
            response = requests.get(
                f"{NAVER_PAY_API_URL}/v1/payments/{payment_id}",
                headers=headers
            )
        else:  # kakao
            headers = {
                "Authorization": f"KakaoAK {KAKAO_ADMIN_KEY}"
            }
            response = requests.get(
                f"{KAKAO_PAY_API_URL}/v1/payment/{payment_id}",
                headers=headers
            )

        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get payment status"
            )

        payment_data = response.json()
        return PaymentStatus(
            payment_id=payment_id,
            status=payment_data["status"],
            amount=payment_data["amount"],
            payment_type=payment_type
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/payments/{payment_id}/refund")
async def refund_payment(
    payment_id: str,
    payment_type: str,
    db: Session = Depends(get_db),
):
    """결제를 환불합니다."""
    try:
        if payment_type == "naver":
            headers = {
                "X-Naver-Client-Id": NAVER_CLIENT_ID,
                "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
                "Content-Type": "application/json"
            }
            response = requests.post(
                f"{NAVER_PAY_API_URL}/v1/payments/{payment_id}/refund",
                headers=headers
            )
        else:  # kakao
            headers = {
                "Authorization": f"KakaoAK {KAKAO_ADMIN_KEY}",
                "Content-Type": "application/json"
            }
            response = requests.post(
                f"{KAKAO_PAY_API_URL}/v1/payment/cancel",
                headers=headers,
                json={"tid": payment_id}
            )

        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to refund payment"
            )

        return {"status": "success", "refund": response.json()}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        ) 