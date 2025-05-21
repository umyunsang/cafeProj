from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List, Dict, Any, AsyncGenerator
from datetime import datetime, timedelta
import asyncio
import json
from sse_starlette.sse import EventSourceResponse
from app.api.deps import get_current_admin_ws, get_current_admin_sse
import sqlite3
from app.core.config import settings as app_settings

from app.models.order import Order, OrderItem
from app.models.admin import Admin

router = APIRouter()

# 연결된 WebSocket 및 SSE 클라이언트 관리를 위한 클래스
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.sse_event_queues: List[asyncio.Queue] = [] # SSE 클라이언트용 이벤트 큐

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"WebSocket client disconnected: {websocket.client}")

    async def send_personal_message(self, message: Dict, websocket: WebSocket):
        try:
            await websocket.send_json(message)
        except Exception as e:
            print(f"Error sending personal message to {websocket.client}: {e}")
            # self.disconnect(websocket) # 메시지 전송 실패 시 연결 끊기 고려

    async def broadcast_to_websockets(self, message: Dict):
        # WebSocket 브로드캐스트 시에는 JSON 직렬화된 문자열이 아닌 dict를 그대로 전송
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Error broadcasting to WebSocket {connection.client}: {e}")
                # self.disconnect(connection) # 브로드캐스트 실패 시 해당 연결 끊기 고려

    # SSE 관련 메서드
    async def add_sse_client(self, queue: asyncio.Queue):
        self.sse_event_queues.append(queue)
        print(f"SSE client added. Total SSE clients: {len(self.sse_event_queues)}")

    def remove_sse_client(self, queue: asyncio.Queue):
        if queue in self.sse_event_queues:
            self.sse_event_queues.remove(queue)
            print(f"SSE client removed. Total SSE clients: {len(self.sse_event_queues)}")

    async def broadcast_to_sse(self, event_data: Dict):
        # SSE에는 "event: <event_name>\ndata: <json_string>\n\n" 형식으로 보내야 함
        # 여기서는 event_data가 이미 {'event': '...', 'data': {...}} 형태의 dict라고 가정하고
        # order_event_generator에서 json.dumps로 한번만 직렬화함.
        message_str = json.dumps(event_data) # 전체를 JSON 문자열로 만듦
        for queue in self.sse_event_queues:
            try:
                await queue.put(message_str) # generator에서 yield 할 문자열을 큐에 넣음
            except Exception as e:
                print(f"Error putting message to SSE queue: {e}")

manager = ConnectionManager()

@router.websocket("/realtime-sales")
async def websocket_endpoint(
    websocket: WebSocket, 
    current_admin: Admin = Depends(get_current_admin_ws)
):
    if not current_admin:
        print("WebSocket endpoint: current_admin is None, connection likely closed by dependency.")
        return

    if not current_admin.is_superuser:
        print(f"WebSocket endpoint: User {current_admin.email} is not an admin. Closing connection.")
        await websocket.close(code=4003, reason="User is not an admin")
        return

    await manager.connect(websocket)
    print(f"WebSocket client connected: {websocket.client}, Admin: {current_admin.email}")
    try:
        await send_initial_data(websocket)
        while True:
            await asyncio.sleep(5)
            await send_update_data(websocket)
    except WebSocketDisconnect:
        print(f"WebSocket client {websocket.client} (Admin: {current_admin.email}) disconnected normally.")
    except Exception as e:
        print(f"WebSocket error for client {websocket.client} (Admin: {current_admin.email}): {e}")
    finally:
        manager.disconnect(websocket)
        print(f"WebSocket client {websocket.client} (Admin: {current_admin.email}) connection cleanup.")

async def send_initial_data(websocket: WebSocket):
    try:
        today = datetime.now().date()
        today_start_str = datetime.combine(today, datetime.min.time()).isoformat()
        today_end_str = datetime.combine(today, datetime.max.time()).isoformat()
        
        db_path_full = app_settings.DATABASE_URL
        if not db_path_full.startswith("sqlite:///"):
            raise ValueError("DATABASE_URL in settings does not start with sqlite:///")
        db_path = db_path_full[len("sqlite:///"):]

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Today's sales
        cursor.execute("""
            SELECT SUM(total_amount) 
            FROM orders 
            WHERE created_at >= ? AND created_at <= ?
            AND status NOT IN ('cancelled', 'failed', 'pending_payment')
        """, (today_start_str, today_end_str))
        today_sales_row = cursor.fetchone()
        today_sales = today_sales_row[0] if today_sales_row and today_sales_row[0] is not None else 0.0
        
        # Hourly orders
        cursor.execute("""
            SELECT strftime('%H', created_at) as hour, COUNT(id) as count, SUM(total_amount) as amount
            FROM orders
            WHERE created_at >= ? AND created_at <= ?
            AND status NOT IN ('cancelled', 'failed', 'pending_payment')
            GROUP BY hour
            ORDER BY hour
        """, (today_start_str, today_end_str))
        hourly_orders_rows = cursor.fetchall()
        
        # Recent orders
        cursor.execute("""
            SELECT id, order_number, total_amount, status, created_at
            FROM orders
            WHERE status NOT IN ('cancelled', 'failed', 'pending_payment')
            ORDER BY created_at DESC
            LIMIT 5
        """)
        recent_orders_rows = cursor.fetchall()
        
        conn.close()
        
        hourly_data = [
            {'hour': int(h[0]) if h[0] is not None else 0, 'count': int(h[1] or 0), 'amount': float(h[2] or 0.0)}
            for h in hourly_orders_rows
        ]
        recent_orders_data = [
            {
                'id': row[0],
                'order_number': row[1] or str(row[0]),
                'total_amount': float(row[2] or 0.0),
                'status': row[3],
                'created_at': row[4] # 이미 ISO 포맷 문자열로 저장되어 있거나, datetime 객체로 변환 필요
            }
            for row in recent_orders_rows
        ]
        
        await manager.send_personal_message({
            'type': 'initial_data',
            'data': {
                'today_sales': float(today_sales),
                'hourly_data': hourly_data,
                'recent_orders': recent_orders_data,
                'timestamp': datetime.now().isoformat()
            }
        }, websocket)
    except Exception as e:
        print(f"Error sending initial WebSocket data: {e}")
        await manager.send_personal_message({'type': 'error', 'message': str(e)}, websocket)

async def send_update_data(websocket: WebSocket):
    try:
        today = datetime.now().date()
        today_start_str = datetime.combine(today, datetime.min.time()).isoformat()
        today_end_str = datetime.combine(today, datetime.max.time()).isoformat()

        db_path_full = app_settings.DATABASE_URL
        if not db_path_full.startswith("sqlite:///"):
            raise ValueError("DATABASE_URL in settings does not start with sqlite:///")
        db_path = db_path_full[len("sqlite:///"):]

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Today's sales
        cursor.execute("""
            SELECT SUM(total_amount) 
            FROM orders 
            WHERE created_at >= ? AND created_at <= ?
            AND status NOT IN ('cancelled', 'failed', 'pending_payment')
        """, (today_start_str, today_end_str))
        today_sales_row = cursor.fetchone()
        today_sales = today_sales_row[0] if today_sales_row and today_sales_row[0] is not None else 0.0

        # Hourly orders update
        cursor.execute("""
            SELECT strftime('%H', created_at) as hour, COUNT(id) as count, SUM(total_amount) as amount
            FROM orders
            WHERE created_at >= ? AND created_at <= ?
            AND status NOT IN ('cancelled', 'failed', 'pending_payment')
            GROUP BY hour
            ORDER BY hour
        """, (today_start_str, today_end_str))
        hourly_orders_update_rows = cursor.fetchall()
        
        # Latest order
        cursor.execute("""
            SELECT id, order_number, total_amount, status, created_at
            FROM orders
            ORDER BY created_at DESC
            LIMIT 1
        """)
        latest_order_row = cursor.fetchone()
        
        conn.close()
        
        hourly_data_update = [
            {'hour': int(h[0]) if h[0] is not None else 0, 'count': int(h[1] or 0), 'amount': float(h[2] or 0.0)}
            for h in hourly_orders_update_rows
        ]
        
        latest_order_data = None
        if latest_order_row:
            latest_order_data = {
                'id': latest_order_row[0],
                'order_number': latest_order_row[1] or str(latest_order_row[0]),
                'total_amount': float(latest_order_row[2] or 0.0),
                'status': latest_order_row[3],
                'created_at': latest_order_row[4] # 이미 ISO 포맷 문자열로 저장되어 있거나, datetime 객체로 변환 필요
            }
        
        await manager.send_personal_message({
            'type': 'update_data',
            'data': {
                'today_sales': float(today_sales),
                'hourly_data': hourly_data_update,
                'latest_order': latest_order_data,
                'timestamp': datetime.now().isoformat()
            }
        }, websocket)
    except Exception as e:
        print(f"Error sending update WebSocket data: {e}")
        await manager.send_personal_message({'type': 'error', 'message': str(e)}, websocket)

# 주문 이벤트 발생 시 WebSocket 및 SSE 클라이언트 모두에게 알림
async def broadcast_order_event(event_type: str, order_data: Any):
    timestamp = datetime.now().isoformat()
    
    processed_order_data = order_data
    # Pydantic v2+ 모델인지 확인하고 model_dump 사용, 아니면 dict() 시도 (v1 호환)
    if hasattr(order_data, 'model_dump'): 
        processed_order_data = order_data.model_dump(mode='json')
    elif hasattr(order_data, 'dict'): # Pydantic v1 호환
        processed_order_data = order_data.dict()
    # 만약 order_data가 이미 dict라면 그대로 사용됨

    # WebSocket 클라이언트에게 전송
    ws_message = {
        'type': event_type, 
        'data': processed_order_data, # 변환된 dict 사용
        'timestamp': timestamp
    }
    await manager.broadcast_to_websockets(ws_message)
    print(f"Broadcasted to WebSockets: {ws_message}")

    # SSE 클라이언트에게 전송 (data는 이미 processed_order_data로 준비됨)
    sse_message = {
        "event": event_type, 
        "data": processed_order_data, # 여기서도 변환된 dict 사용
        "id": str(datetime.now().timestamp())
    }
    await manager.broadcast_to_sse(sse_message)
    print(f"Broadcasted to SSE clients: {sse_message}")


# SSE 이벤트 제너레이터 함수 (인증 적용)
async def order_event_stream_generator(request: Request, current_admin: Admin) -> AsyncGenerator[str, None]:
    # current_admin은 sse_order_updates에서 이미 검증되었다고 가정
    # (sse_order_updates에서 Depends(get_current_admin)으로 주입 및 is_superuser 확인)
    
    print(f"SSE client connected for stream: {request.client}, Admin: {current_admin.email}")
    event_queue = asyncio.Queue()
    await manager.add_sse_client(event_queue)
    
    try:
        initial_connection_message = json.dumps({"event": "connection_established", "data": {"message": "SSE connection for orders established."}})
        yield initial_connection_message
        
        heartbeat_interval = 15 
        while True:
            try:
                event_to_send = await asyncio.wait_for(event_queue.get(), timeout=heartbeat_interval)
                yield event_to_send
            except asyncio.TimeoutError:
                if await request.is_disconnected():
                    print(f"SSE client {request.client} (Admin: {current_admin.email}) disconnected (heartbeat check).")
                    break
                heartbeat_message = json.dumps({"event": "heartbeat", "data": {"timestamp": datetime.now().isoformat()}})
                yield heartbeat_message
            
            if await request.is_disconnected():
                print(f"SSE client {request.client} (Admin: {current_admin.email}) disconnected.")
                break
            
    except asyncio.CancelledError:
        print(f"SSE event generator for {request.client} (Admin: {current_admin.email}) cancelled.")
    except Exception as e:
        print(f"Error in SSE event generator for {request.client} (Admin: {current_admin.email}): {e}")
    finally:
        manager.remove_sse_client(event_queue)
        print(f"SSE event generator for {request.client} (Admin: {current_admin.email}) finished and client removed.")

# 주문 관련 실시간 업데이트를 위한 SSE 엔드포인트
@router.get("/orders/realtime/subscribe", response_class=EventSourceResponse)
async def sse_order_updates(
    request: Request, 
    current_admin: Admin = Depends(get_current_admin_sse)
):
    # get_current_admin_sse 의존성이 이미 사용자 객체를 반환하거나, 권한 없으면 예외 발생시킴
    # 여기서는 current_admin.is_superuser 를 확인하는 것이 좋음 (sse_order_updates의 기존 로직과 일관성 유지)
    if not current_admin.is_superuser: 
        print(f"SSE: Unauthorized access attempt by {request.client}. Admin: {current_admin.email} is not a superuser.")
        async def unauthorized_generator():
            yield json.dumps({"event": "error", "data": {"message": "User is not a superuser"}})
        return EventSourceResponse(unauthorized_generator())

    print(f"SSE: Admin user {current_admin.email} (ID: {current_admin.id}) is authorized for SSE.") # 인증 성공 로그 추가
    return EventSourceResponse(order_event_stream_generator(request, current_admin))

# orders.py에서 broadcast_sse_order_update 대신 broadcast_order_event를 사용하도록 변경 예정.
# 따라서 broadcast_sse_order_update 함수는 broadcast_order_event로 통합.
# async def broadcast_sse_order_update(event_type: str, order_data: Dict[str, Any]):
#     await broadcast_order_event(event_type=event_type, order_data=order_data)

# 기존의 broadcast_order_event_ws 함수는 broadcast_order_event로 통합되었으므로 삭제 가능
# async def broadcast_order_event_ws(order_data: Dict[str, Any]):
# await manager.broadcast_to_websockets({
# 'type': 'order_event',
# 'data': order_data,
# 'timestamp': datetime.now().isoformat()
# })

# get_current_admin_ws_from_query는 app.api.deps에 아래와 같이 정의되어 있다고 가정:
# from fastapi import Depends, Query, WebSocket, HTTPException, status
# from sqlalchemy.orm import Session
# from app.core.auth import verify_token_ws # WebSocket용 토큰 검증 함수 (새로 만들거나 기존 로직 활용)
# from app.models.user import User
# from app.database import get_db
# 
# async def get_current_admin_ws_from_query(
#     websocket: WebSocket, 
#     token: Optional[str] = Query(None),
#     db: Session = Depends(get_db)
# ) -> Optional[User]:
#     if not token:
#         await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Token not provided")
#         return None 
#     user = await verify_token_ws(token=token, db=db) # verify_token_ws는 User 객체 또는 None 반환
#     if not user or not user.is_superuser:
#         await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token or not an admin")
#         return None
#     return user