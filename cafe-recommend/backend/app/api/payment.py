from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
import requests
from app.database import get_db
from app.core.config import settings
from app.core.auth import get_current_user
from app.models.user import User
from app.models.order import Order
from app.crud.order import CRUDOrder
from app.schemas.payment import (
    NaverPayRequest,
    NaverPayResponse,
    KakaoPayRequest,
    KakaoPayResponse,
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
    current_user: User = Depends(get_current_user)
):
    """네이버페이 결제 요청을 생성합니다."""
    order = crud_order.get(db=db, id=payment_data.order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to pay for this order")
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
    current_user: User = Depends(get_current_user)
):
    """카카오페이 결제 요청을 생성합니다."""
    order = crud_order.get(db=db, id=payment_data.order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to pay for this order")
    if order.status != "pending":
        raise HTTPException(status_code=400, detail="Order is not in pending status")

    try:
        # 카카오페이 결제 요청 생성
        headers = {
            "Authorization": f"KakaoAK {KAKAO_ADMIN_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "cid": "TC0ONETIME",
            "partner_order_id": f"order_{order.id}",
            "partner_user_id": str(current_user.id),
            "item_name": f"주문 #{order.id}",
            "quantity": 1,
            "total_amount": int(order.total_amount),
            "vat_amount": int(order.total_amount * 0.1),
            "tax_free_amount": 0,
            "approval_url": f"{settings.FRONTEND_URL}/payments/kakao/complete",
            "cancel_url": f"{settings.FRONTEND_URL}/payments/cancel",
            "fail_url": f"{settings.FRONTEND_URL}/payments/fail"
        }

        response = requests.post(
            f"{KAKAO_PAY_API_URL}/v1/payment/ready",
            headers=headers,
            json=payload
        )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create Kakao Pay payment"
            )

        payment_data = response.json()
        return KakaoPayResponse(
            payment_id=payment_data["tid"],
            order_id=order.id,
            payment_url=payment_data["next_redirect_pc_url"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/payments/naver/complete")
async def complete_naver_payment(
    payment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
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
    pg_token: str,
    tid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """카카오페이 결제를 완료하고 주문 상태를 업데이트합니다."""
    try:
        # 카카오페이 결제 승인
        headers = {
            "Authorization": f"KakaoAK {KAKAO_ADMIN_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "cid": "TC0ONETIME",
            "tid": tid,
            "partner_order_id": f"order_{order.id}",
            "partner_user_id": str(current_user.id),
            "pg_token": pg_token
        }

        response = requests.post(
            f"{KAKAO_PAY_API_URL}/v1/payment/approve",
            headers=headers,
            json=payload
        )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to approve Kakao Pay payment"
            )

        payment_data = response.json()
        if payment_data["status"] == "SUCCESS_PAYMENT":
            # 주문 상태를 'paid'로 업데이트
            order_id = int(payment_data["partner_order_id"].split("_")[1])
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

@router.get("/payments/{payment_id}", response_model=PaymentStatus)
async def get_payment_status(
    payment_id: str,
    payment_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
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
    current_user: User = Depends(get_current_user)
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