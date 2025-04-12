# Cafe Recommend Backend Architecture

## 1. 시스템 구성도 (Component Diagram)

```mermaid
graph LR
    subgraph "User Interface"
        Client["Frontend Application"]
    end

    subgraph Backend ["FastAPI Application (cafe-recommend/backend/app)"]
        direction LR
        MainApp[main.py] -- Loads Routers --> Routers
        Routers -- Uses --> API_Logic
        API_Logic -- Uses --> CRUD_Operations
        CRUD_Operations -- Interacts with --> Models_Schemas
        CRUD_Operations -- Uses --> Database_Interface
        Dependencies["Dependencies (dependencies.py, api/deps.py)"] -- Injected into --> Routers
        Dependencies -- Injected into --> API_Logic
        Config["Core Config (core)"] -- Used by --> MainApp

        subgraph Routers ["Request Handlers (app/routers)"]
            direction TB
            ChatRouter["/chat"]
            MenuRouter["/menus"]
            CartRouter["/cart"]
            OrderRouter["/order"]
            PaymentRouter["/payment"]
            AdminRouter["/api/admin"]
             %% Hiding admin for clarity in main flow %%
        end

        subgraph API_Logic ["Business Logic (app/api)"]
            direction TB
            CartAPI["cart.py"]
            OrderAPI["order.py"]
            PaymentAPI["payment.py"]
            AdminAPI["admin/*"]:::hidden
             %% Hiding admin for clarity in main flow %%
            ChatLogic["chat.py related logic"]
        end

        subgraph Data_Access ["Data Access Layer"]
            direction TB
            CRUD_Operations["CRUD Functions (app/crud)"]
            Models_Schemas["Models & Schemas (app/models, app/schemas)"]
            Database_Interface["DB Session (app/database.py)"]
        end

    end

    subgraph "Data Storage"
        direction TB
        SQLite_DB["SQLite Databases (*.db)"]
        VectorDB["Vector Store (vector_store/)"]
    end

    Client --> Routers
    Database_Interface --> SQLite_DB
    ChatRouter --> VectorDB -- "AI Embedding/Search" --> ChatRouter
    ChatLogic --> VectorDB

    %% Styling (Optional)
    classDef default fill:#f9f,stroke:#333,stroke-width:2px;
    classDef storage fill:#ccf,stroke:#333,stroke-width:2px;
    classDef backendComponent fill:#cfc,stroke:#333,stroke-width:1px;

    class Client default;
    class SQLite_DB,VectorDB storage;
    class Routers,API_Logic,Data_Access,MainApp,Dependencies,Config backendComponent;

```

**설명:**

*   **User Interface (Frontend):** 사용자와 상호작용하는 프론트엔드 애플리케이션입니다.
*   **Backend (FastAPI Application):** 핵심 비즈니스 로직을 처리하는 FastAPI 기반 백엔드입니다.
    *   `main.py`: 애플리케이션 진입점, 라우터 및 미들웨어 설정.
    *   **Routers:** HTTP 요청을 수신하고 적절한 API 로직으로 전달합니다. (메뉴, 장바구니, 주문, 결제, 채팅/추천, 관리자)
    *   **API Logic:** 각 기능(장바구니, 주문, 결제 등)에 대한 구체적인 비즈니스 로직을 포함합니다.
    *   **Dependencies:** 인증, 데이터베이스 세션 등 반복적으로 사용되는 의존성을 관리합니다.
    *   **Data Access Layer:** 데이터베이스와의 상호작용을 담당합니다.
        *   `CRUD Operations`: 데이터 생성, 읽기, 업데이트, 삭제 로직.
        *   `Models & Schemas`: 데이터베이스 테이블 구조(Models) 및 API 데이터 유효성 검사/직렬화(Schemas).
        *   `Database Interface`: 데이터베이스 연결 및 세션 관리.
    *   **Core Config:** 애플리케이션 설정 관리.
*   **Data Storage:** 데이터를 저장하는 공간입니다.
    *   **SQLite Databases:** 주요 애플리케이션 데이터(사용자, 메뉴, 주문 등) 저장.
    *   **Vector Store:** AI 기반 추천 기능을 위한 벡터 데이터 저장 (메뉴 임베딩 등).

## 2. 주요 데이터 흐름 예시 (Mermaid Flowchart)

### 2.1. 메뉴 조회

```mermaid
graph TD
    A["Client: Request Menu List"] --> B("Backend: /menus Router");
    B --> C["CRUD: Get Menus"];
    C --> D{"DB: Select Menus"};
    D --> C;
    C --> B;
    B --> E["Backend: Return Menu List"];
    E --> F["Client: Display Menus"];

    subgraph "Backend Interaction"
        B; C; E;
    end
    subgraph "Database Interaction"
        D;
    end
```

### 2.2. 장바구니에 메뉴 추가

```mermaid
graph TD
    A["Client: Add Item to Cart (Menu ID, Quantity)"] --> B("Backend: /cart Router - Add Item");
    B --> C{"API: Add to Cart Logic (cart.py)"};
    C -- "Validate Item" --> D["CRUD: Get Menu by ID"];
    D --> E{"DB: Select Menu"};
    E -- "Menu Exists" --> C;
    C -- "Add/Update Cart" --> F["CRUD: Create/Update Cart Item"];
    F --> G{"DB: Insert/Update Cart"};
    G --> F;
    F --> C;
    C --> B;
    B --> H["Backend: Response (Success/Fail)"];
    H --> I["Client: Update Cart UI"];

    subgraph "Backend Interaction"
        B; C; D; F; H;
    end
    subgraph "Database Interaction"
        E; G;
    end
```

### 2.3. 주문 생성

```mermaid
graph TD
    A["Client: Place Order Request"] --> B("Backend: /order Router - Create Order");
    B --> C{"API: Create Order Logic (order.py)"};
    C -- "Get Cart Info" --> D["CRUD: Get User Cart Items"];
    D --> E{"DB: Select Cart Items"};
    E --> D;
    D --> C;
    C -- "Create Order" --> F["CRUD: Create Order & Order Items"];
    F --> G{"DB: Insert Order, OrderItems"};
    G --> F;
    C -- "Clear Cart" --> H["CRUD: Delete Cart Items"];
    H --> I{"DB: Delete Cart Items"};
    I --> H;
    H --> C;
    C --> B;
    B --> J["Backend: Response (Order Details)"];
    J --> K["Client: Show Order Confirmation"];

    subgraph "Backend Interaction"
        B; C; D; F; H; J;
    end
    subgraph "Database Interaction"
        E; G; I;
    end
```

### 2.4. AI 메뉴 추천 (채팅)

```mermaid
graph TD
    A["Client: Send Chat Message"] --> B("Backend: /chat Router");
    B --> C{"Chat Logic (Likely involves NLP/Embedding)"};
    C -- "Generate Query Embedding" --> D["Vector Store: Search Similar Menu Embeddings"];
    D -- "Return Similar Menu IDs" --> C;
    C -- "Get Menu Details" --> E["CRUD: Get Menus by IDs"];
    E --> F{"DB: Select Menus"};
    F --> E;
    E --> C;
    C -- "Format Recommendation" --> B;
    B --> G["Backend: Return Recommended Menus"];
    G --> H["Client: Display Recommendations"];

    subgraph "Backend Interaction"
        B; C; E; G;
    end
    subgraph "Database Interaction"
        F;
    end
    subgraph "Vector DB Interaction"
        D;
    end
```

## 3. 모듈별 주요 기능

*   **`app/main.py`**: FastAPI 앱 초기화, 라우터 포함, 미들웨어 설정.
*   **`app/database.py`**: SQLAlchemy 설정, 데이터베이스 세션 생성.
*   **`app/models/`**: SQLAlchemy 모델 정의 (데이터베이스 테이블 매핑).
*   **`app/schemas/`**: Pydantic 모델 정의 (API 데이터 유효성 검사 및 직렬화/역직렬화).
*   **`app/crud/`**: 데이터베이스 CRUD(Create, Read, Update, Delete) 로직 구현. 모델 객체와 상호작용.
*   **`app/routers/`**:
    *   `chat.py`: AI 기반 채팅 및 메뉴 추천 요청 처리. Vector Store 사용 가능성 높음.
    *   `menus.py`: 메뉴 목록 조회, 상세 정보 조회 등 메뉴 관련 요청 처리.
    *   `cart.py`: 장바구니 추가, 조회, 수정, 삭제 요청 처리.
    *   `order.py`: 주문 생성, 조회 등 주문 관련 요청 처리.
    *   `payment.py`: 결제 시작, 검증 등 결제 관련 요청 처리 (API 로직 호출).
*   **`app/api/`**:
    *   `cart.py`, `order.py`, `payment.py`: 각 라우터에서 호출되는 상세 비즈니스 로직 구현 (CRUD 함수 사용).
    *   `admin/`: 관리자 관련 API 로직.
    *   `deps.py`: API 레벨의 의존성 주입 (e.g., 현재 사용자 정보 가져오기).
*   **`app/core/`**: 설정 값 로딩 등 애플리케이션의 핵심 설정 관리.
*   **`vector_store/`**: AI 추천을 위한 메뉴 임베딩 등 벡터 데이터 저장.
*   **Root Directory Files**:
    *   `requirements.txt`: Python 패키지 의존성 목록.
    *   `.env*`: 환경 변수 설정 파일.
    *   `alembic/`, `alembic.ini`: Alembic 데이터베이스 마이그레이션 설정 및 스크립트.
    *   `init_*.py`, `update_*.py`: 초기 데이터 생성 및 업데이트 스크립트. 