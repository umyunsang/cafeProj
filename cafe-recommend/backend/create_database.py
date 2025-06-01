#!/usr/bin/env python3
"""
데이터베이스 테이블 생성 스크립트
Alembic 없이 직접 SQLAlchemy를 사용하여 테이블을 생성합니다.
"""

import sqlite3
import os
from pathlib import Path

# 데이터베이스 파일 경로
DB_PATH = Path(__file__).parent / "cafe_app.db"

def create_tables():
    """모든 필요한 테이블을 생성합니다."""
    
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    try:
        # 1. Users 테이블
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email VARCHAR(255) UNIQUE NOT NULL,
            hashed_password VARCHAR(255) NOT NULL,
            is_active BOOLEAN DEFAULT 1,
            is_superuser BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """)
        
        # 2. Menus 테이블
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS menus (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            price DECIMAL(10,2) NOT NULL,
            category VARCHAR(100) NOT NULL,
            image_url VARCHAR(500),
            order_count INTEGER DEFAULT 0,
            avg_rating DECIMAL(3,2) DEFAULT 0.0,
            review_count INTEGER DEFAULT 0,
            is_available BOOLEAN DEFAULT 1,
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            updated_by INTEGER,
            FOREIGN KEY (created_by) REFERENCES users(id),
            FOREIGN KEY (updated_by) REFERENCES users(id)
        )
        """)
        
        # 3. Carts 테이블
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS carts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id VARCHAR(255) UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """)
        
        # 4. Cart Items 테이블
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS cart_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cart_id INTEGER NOT NULL,
            menu_id INTEGER NOT NULL,
            quantity INTEGER DEFAULT 1,
            special_requests TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
            FOREIGN KEY (menu_id) REFERENCES menus(id)
        )
        """)
        
        # 5. Orders 테이블
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_number VARCHAR(255) UNIQUE,
            user_id INTEGER,
            session_id VARCHAR(255),
            total_amount DECIMAL(10,2) NOT NULL,
            status VARCHAR(50) DEFAULT 'pending',
            payment_method VARCHAR(50),
            payment_key VARCHAR(255),
            delivery_address TEXT,
            delivery_request TEXT,
            phone_number VARCHAR(20),
            items TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_refunded BOOLEAN DEFAULT 0,
            refund_amount DECIMAL(10,2),
            refund_reason TEXT,
            refund_id VARCHAR(255),
            refunded_at DATETIME,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """)
        
        # 6. Order Items 테이블
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            menu_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            unit_price DECIMAL(10,2) NOT NULL,
            total_price DECIMAL(10,2) NOT NULL,
            status VARCHAR(50) DEFAULT 'pending',
            menu_name VARCHAR(255),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
            FOREIGN KEY (menu_id) REFERENCES menus(id)
        )
        """)
        
        # 7. Reviews 테이블
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            menu_id INTEGER NOT NULL,
            user_id INTEGER,
            rating DECIMAL(3,2) NOT NULL,
            content TEXT,
            photo_url VARCHAR(500),
            user_name VARCHAR(255),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (menu_id) REFERENCES menus(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """)
        
        # 8. User Identity 테이블
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_identity (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id VARCHAR(255) UNIQUE NOT NULL,
            preferences TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """)
        
        # 9. Chat History 테이블
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            response TEXT NOT NULL,
            message_type VARCHAR(50) DEFAULT 'general',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """)
        
        # 10. Ingredients 테이블
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS ingredients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            unit VARCHAR(50) NOT NULL,
            min_stock_level DECIMAL(10,2) DEFAULT 0,
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """)
        
        # 11. Ingredient Stock 테이블
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS ingredient_stock (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ingredient_id INTEGER NOT NULL,
            current_quantity DECIMAL(10,2) DEFAULT 0,
            last_restock_date DATETIME,
            last_restock_quantity DECIMAL(10,2),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
        )
        """)
        
        # 12. Menu Ingredients 테이블
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS menu_ingredients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            menu_id INTEGER NOT NULL,
            ingredient_id INTEGER NOT NULL,
            quantity_required DECIMAL(10,2) NOT NULL,
            is_optional BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (menu_id) REFERENCES menus(id),
            FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
        )
        """)
        
        # 13. Payment Settings 테이블
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS payment_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider VARCHAR(50) NOT NULL UNIQUE,
            is_active BOOLEAN DEFAULT 0,
            client_id VARCHAR(255),
            client_secret VARCHAR(255),
            additional_settings TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """)
        
        # 14. Inventory Transactions 테이블
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS inventory_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ingredient_id INTEGER NOT NULL,
            transaction_type VARCHAR(50) NOT NULL,
            quantity DECIMAL(10,2) NOT NULL,
            notes TEXT,
            created_by VARCHAR(255),
            order_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
            FOREIGN KEY (order_id) REFERENCES orders(id)
        )
        """)
        
        # 15. Alembic Version 테이블 (마이그레이션 추적용)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS alembic_version (
            version_num VARCHAR(32) NOT NULL,
            CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
        )
        """)
        
        conn.commit()
        print("✅ 모든 테이블이 성공적으로 생성되었습니다!")
        
        # 테이블 목록 확인
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        print(f"\n📋 생성된 테이블 목록 ({len(tables)}개):")
        for table in tables:
            print(f"  - {table[0]}")
            
    except Exception as e:
        print(f"❌ 테이블 생성 중 오류 발생: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

def insert_sample_data():
    """샘플 데이터를 삽입합니다."""
    
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    try:
        # 샘플 메뉴 데이터 삽입
        sample_menus = [
            ("아메리카노", "진한 에스프레소와 뜨거운 물로 만든 클래식 커피", 4500, "커피", None, 1, 1),
            ("카페라떼", "부드러운 우유와 에스프레소의 완벽한 조화", 5000, "커피", None, 1, 1),
            ("카푸치노", "풍성한 우유 거품이 올라간 이탈리아 전통 커피", 5000, "커피", None, 1, 1),
            ("바닐라라떼", "달콤한 바닐라 시럽이 들어간 라떼", 5500, "커피", None, 1, 1),
            ("카라멜 마키아토", "달콤한 카라멜과 에스프레소의 만남", 5800, "커피", None, 1, 1),
            ("아이스 아메리카노", "시원한 얼음과 함께하는 아메리카노", 4500, "커피", None, 1, 1),
            ("초콜릿 케이크", "진한 초콜릿의 달콤함이 가득한 케이크", 6500, "디저트", None, 1, 1),
            ("치즈케이크", "부드럽고 크리미한 뉴욕 스타일 치즈케이크", 6000, "디저트", None, 1, 1),
            ("크로와상", "바삭하고 버터향 가득한 프랑스 전통 빵", 3500, "베이커리", None, 1, 1),
            ("블루베리 머핀", "신선한 블루베리가 들어간 촉촉한 머핀", 4000, "베이커리", None, 1, 1),
            ("그린티 라떼", "진한 말차와 우유의 조화", 5200, "차", None, 1, 1),
            ("얼그레이 티", "향긋한 베르가못 향의 영국 전통 차", 4000, "차", None, 1, 1)
        ]
        
        cursor.executemany("""
        INSERT OR IGNORE INTO menus 
        (name, description, price, category, image_url, is_available, is_active) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, sample_menus)
        
        # 관리자 계정 생성 (비밀번호는 해시화되어야 하지만 여기서는 단순화)
        cursor.execute("""
        INSERT OR IGNORE INTO users 
        (email, hashed_password, is_active, is_superuser) 
        VALUES (?, ?, ?, ?)
        """, ("admin@cafe.com", "hashed_admin123", 1, 1))
        
        conn.commit()
        print("✅ 샘플 데이터가 성공적으로 삽입되었습니다!")
        
        # 메뉴 개수 확인
        cursor.execute("SELECT COUNT(*) FROM menus")
        menu_count = cursor.fetchone()[0]
        print(f"📊 총 메뉴 개수: {menu_count}개")
        
    except Exception as e:
        print(f"❌ 샘플 데이터 삽입 중 오류 발생: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    print(f"🗄️  데이터베이스 파일: {DB_PATH}")
    print("🔧 테이블 생성을 시작합니다...")
    
    create_tables()
    insert_sample_data()
    
    print("\n🎉 데이터베이스 초기화가 완료되었습니다!")
    print(f"📁 데이터베이스 파일 위치: {DB_PATH.absolute()}") 