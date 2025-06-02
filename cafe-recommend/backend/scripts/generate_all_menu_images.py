#!/usr/bin/env python3
"""
모든 메뉴(일반+시그니처)에 대한 DALL-E 이미지 생성 통합 스크립트
"""

import sqlite3
import requests
import os
import sys
from pathlib import Path
import time
from openai import OpenAI

# 프로젝트 루트 디렉토리 추가
project_root = Path(__file__).parent
sys.path.append(str(project_root))

# OpenAI API 설정
OPENAI_API_KEY = "YOUR_OPENAI_API_KEY_HERE"  # 실제 사용시 환경변수 또는 직접 입력 필요
client = OpenAI(api_key=OPENAI_API_KEY)

def generate_image_prompt(menu_name, description, category):
    """메뉴에 맞는 DALL-E 프롬프트 생성"""
    
    # 시그니처 메뉴별 특별한 프롬프트
    signature_prompts = {
        "별빛 갤럭시 라떼": "A magical galaxy latte in a clear glass mug, with swirling blue spirulina creating cosmic patterns, edible glitter sparkling like stars, purple and blue colors mixing like nebula, on a dark marble surface with LED lights creating starlight effect, professional food photography, ultra-detailed, cinematic lighting",
        
        "무지개 구름 카푸치노": "A whimsical cappuccino with rainbow-colored milk foam layers floating like clouds, seven natural colors (red, orange, yellow, green, blue, indigo, violet) creating a dreamy cloud effect, in a white ceramic cup, ethereal lighting, professional food photography, magical atmosphere",
        
        "화산 용암 모카": "A dramatic volcanic mocha with red chili chocolate and berry syrup creating lava-like streams, dark chocolate base with glowing red accents, steam rising like volcanic smoke, in a black mug, dramatic lighting with orange/red glow, professional food photography",
        
        "숲속 요정 허브 라떼": "An enchanted herbal latte with lavender, rosemary, and thyme floating on oat milk foam, surrounded by fresh herbs and fairy lights, in a rustic wooden setting, magical forest atmosphere, soft green lighting, professional food photography",
        
        "네온 바다 소다": "A mysterious neon blue soda drink with tonic water and blue grape, glowing like deep ocean water, served in a tall glass with dry ice creating mystical fog, neon lighting, dark background, professional beverage photography",
        
        "마법의 색변 레모네이드": "A color-changing lemonade with butterfly pea flower, transitioning from deep blue to purple when lemon is added, served in a clear glass pitcher, magical transformation moment captured, professional food photography",
        
        "용의 숨결 스무디": "A dragon breath smoothie with dry ice creating mysterious white smoke, tropical fruits (dragon fruit, mango, coconut), served in a crystal glass, fantasy lighting with purple and gold accents, professional food photography",
        
        "우주 먼지 티라미수": "A cosmic tiramisu with black sesame and activated charcoal creating dark space effect, edible gold flakes scattered like stars, served on a black slate plate, luxurious presentation, professional dessert photography",
        
        "꿈속 구름 케이크": "A dreamy cloud cake wrapped in cotton candy, vanilla sponge with lavender cream, floating on a glass plate, soft pastel lighting, ethereal and dreamy atmosphere, professional pastry photography",
        
        "불타는 아이스크림 브륄레": "A dramatic flaming ice cream brûlée with liquid nitrogen smoke, caramelized sugar crust being torched, fire and ice contrast, dramatic lighting, professional dessert photography",
        
        "갤럭시 도넛": "A cosmic galaxy donut with black and purple glaze creating space effect, star-shaped toppings, edible glitter, served on a dark mirror surface with LED constellation lights, professional food photography",
        
        "용암 크루아상": "A volcanic croissant with red cheddar and jalapeño filling oozing out like lava, shaped like a volcano, dramatic orange-red lighting, professional bakery photography",
        
        "마법사의 비밀 차": "A mysterious wizard's tea with nine different herbs and flower petals floating, served in an ornate teacup, magical smoke effects, mystical lighting with purple and gold, professional tea photography",
        
        "시간여행자의 얼그레이": "A vintage time traveler's Earl Grey tea with time warp bubbles and edible flowers floating, served in an antique teacup, steampunk aesthetic, professional tea photography"
    }
    
    # 일반 메뉴별 고품질 프롬프트
    regular_prompts = {
        "아메리카노": "A perfect cup of Americano coffee in a white ceramic cup on a saucer, rich dark coffee with perfect crema layer, steam rising, placed on a wooden table with coffee beans scattered around, warm natural lighting, professional coffee photography, 4K quality",
        
        "카페라떼": "A beautiful café latte with perfect latte art in a white ceramic cup, creamy milk foam creating a heart or leaf pattern, sitting on a marble surface, soft morning light, professional coffee photography, aesthetically pleasing, high-resolution",
        
        "카푸치노": "An Italian cappuccino with thick, creamy foam in a white cup and saucer, dusted with cocoa powder, accompanied by a small spoon, on a rustic wooden table, warm ambient lighting, professional food photography",
        
        "바닐라라떼": "A vanilla latte in a tall glass mug showing layers of vanilla syrup, espresso, and steamed milk, topped with whipped cream and vanilla beans, soft lighting, professional beverage photography",
        
        "카라멜 마키아토": "A caramel macchiato in a clear glass cup showing beautiful layers, caramel drizzle on top, espresso marks visible, whipped cream topping, served on a wooden tray, professional coffee photography",
        
        "아이스 아메리카노": "A refreshing iced Americano in a tall glass filled with ice cubes, dark coffee with condensation on the glass, served on a marble coaster, bright natural lighting, professional cold brew photography",
        
        "그린티 라떼": "A matcha green tea latte in a white ceramic cup, beautiful green color gradient, served on a bamboo mat with matcha powder beside it, natural lighting, professional tea photography, zen aesthetic",
        
        "얼그레이 티": "An elegant Earl Grey tea in a fine porcelain teacup with saucer, steam rising, bergamot leaves as garnish, served on a lace doily, soft afternoon lighting, professional tea photography",
        
        "레몬에이드": "A refreshing glass of lemonade with ice cubes, fresh lemon slices floating, mint garnish, served in a mason jar with a striped straw, bright summer lighting, professional beverage photography",
        
        "자몽에이드": "A sparkling grapefruit drink in a tall glass with ice, fresh grapefruit segments, sparkling water bubbles visible, garnished with rosemary sprig, bright natural lighting, professional beverage photography",
        
        "치즈케이크": "A slice of New York style cheesecake on a white plate, perfect creamy texture, graham cracker crust, berry compote drizzle, garnished with fresh berries, professional dessert photography, studio lighting",
        
        "초콜릿 케이크": "A decadent chocolate cake slice with rich chocolate ganache frosting, moist layers visible, chocolate shavings on top, served on an elegant plate, warm lighting, professional dessert photography",
        
        "크루아상": "A perfect golden-brown French croissant with visible flaky layers, buttery texture, placed on a white plate with butter and jam beside it, morning light, professional pastry photography",
        
        "블루베리 머핀": "A fresh blueberry muffin with visible blueberries on top, golden-brown color, sitting on a wire cooling rack, scattered fresh blueberries around, natural lighting, professional bakery photography"
    }
    
    # 시그니처 메뉴면 특별 프롬프트 사용
    if menu_name in signature_prompts:
        return signature_prompts[menu_name]
    
    # 일반 메뉴면 전용 프롬프트 사용
    if menu_name in regular_prompts:
        return regular_prompts[menu_name]
    
    # 기본 프롬프트 생성 (위에 없는 경우)
    base_prompt = f"Professional food photography of {menu_name}, {description}, beautifully plated, studio lighting, high-resolution, appetizing, artistic presentation"
    return base_prompt

def generate_image_with_dalle(prompt, menu_name):
    """DALL-E API로 이미지 생성"""
    try:
        print(f"🎨 이미지 생성 중: {menu_name}")
        print(f"📝 프롬프트: {prompt[:100]}...")
        
        response = client.images.generate(
            model="dall-e-3",
            prompt=prompt,
            size="1024x1024",
            quality="hd",
            n=1
        )
        
        image_url = response.data[0].url
        print(f"✅ 이미지 URL 생성 성공: {image_url[:50]}...")
        return image_url
        
    except Exception as e:
        print(f"❌ DALL-E 이미지 생성 실패: {e}")
        return None

def download_and_save_image(image_url, filename, save_dir):
    """생성된 이미지를 다운로드하고 저장"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(image_url, headers=headers, timeout=30)
        response.raise_for_status()
        
        save_path = save_dir / filename
        
        with open(save_path, 'wb') as f:
            f.write(response.content)
        
        print(f"💾 이미지 저장 완료: {filename}")
        return str(save_path)
        
    except Exception as e:
        print(f"❌ 이미지 다운로드 실패: {e}")
        return None

def generate_safe_filename(menu_id, menu_name, category):
    """안전한 파일명 생성"""
    # 시그니처 메뉴는 signature_ 접두사, 일반 메뉴는 regular_ 접두사
    prefix = "signature" if "시그니처" in category else "regular"
    
    # 한글과 특수문자를 안전한 형태로 변환
    safe_name = "".join(c for c in menu_name if c.isalnum() or c in (' ', '-', '_')).strip()
    safe_name = safe_name.replace(' ', '_')
    filename = f"{prefix}_{menu_id:02d}_{safe_name}.png"
    return filename

def main():
    """메인 실행 함수"""
    print("🎨 모든 메뉴 이미지 생성 시작...")
    
    # 데이터베이스 연결
    db_path = project_root / 'cafe_app.db'
    if not db_path.exists():
        print(f"❌ 데이터베이스 파일을 찾을 수 없습니다: {db_path}")
        return
    
    # 이미지 저장 디렉토리 설정
    backend_images_dir = project_root / 'static' / 'menu_images'
    frontend_images_dir = project_root.parent / 'frontend' / 'public' / 'static' / 'menu_images'
    
    backend_images_dir.mkdir(parents=True, exist_ok=True)
    frontend_images_dir.mkdir(parents=True, exist_ok=True)
    
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    try:
        # 이미지가 없는 메뉴들만 조회
        cursor.execute("""
            SELECT id, name, description, category
            FROM menus 
            WHERE image_url IS NULL
            ORDER BY id
        """)
        
        menus_without_images = cursor.fetchall()
        
        # 전체 메뉴 수 확인
        cursor.execute("SELECT COUNT(*) FROM menus")
        total_menus = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM menus WHERE image_url IS NOT NULL")
        menus_with_images = cursor.fetchone()[0]
        
        print(f"📊 메뉴 이미지 현황:")
        print(f"   📋 전체 메뉴: {total_menus}개")
        print(f"   ✅ 이미지 있음: {menus_with_images}개")
        print(f"   ❌ 이미지 없음: {len(menus_without_images)}개")
        
        if not menus_without_images:
            print("🎉 모든 메뉴에 이미지가 이미 있습니다!")
            return
        
        print(f"\n🎨 {len(menus_without_images)}개 메뉴 이미지 생성 시작...")
        
        success_count = 0
        
        for menu_id, menu_name, description, category in menus_without_images:
            print(f"\n🔄 처리중 ({success_count + 1}/{len(menus_without_images)}): {menu_name}")
            
            # 1. 프롬프트 생성
            prompt = generate_image_prompt(menu_name, description, category)
            
            # 2. DALL-E로 이미지 생성
            image_url = generate_image_with_dalle(prompt, menu_name)
            
            if image_url:
                # 3. 파일명 생성
                filename = generate_safe_filename(menu_id, menu_name, category)
                
                # 4. 백엔드에 이미지 저장
                backend_path = download_and_save_image(image_url, filename, backend_images_dir)
                
                # 5. 프론트엔드에도 복사
                frontend_path = download_and_save_image(image_url, filename, frontend_images_dir)
                
                if backend_path and frontend_path:
                    # 6. 데이터베이스 업데이트
                    db_image_url = f"/static/menu_images/{filename}"
                    cursor.execute("""
                        UPDATE menus 
                        SET image_url = ? 
                        WHERE id = ?
                    """, (db_image_url, menu_id))
                    
                    print(f"✅ DB 업데이트: {db_image_url}")
                    success_count += 1
                    
                    # API 제한을 위한 대기
                    print("⏳ API 제한 방지를 위해 5초 대기...")
                    time.sleep(5)
                else:
                    print(f"⚠️  {menu_name} 이미지 저장 실패")
            else:
                print(f"⚠️  {menu_name} 이미지 생성 실패")
        
        # 변경사항 저장
        conn.commit()
        
        print(f"\n🎉 이미지 생성 완료!")
        print(f"📊 성공: {success_count}/{len(menus_without_images)} 이미지")
        print(f"📁 저장 위치:")
        print(f"  - 백엔드: {backend_images_dir}")
        print(f"  - 프론트엔드: {frontend_images_dir}")
        
        # 최종 통계
        cursor.execute("SELECT COUNT(*) FROM menus WHERE image_url IS NOT NULL")
        final_count = cursor.fetchone()[0]
        print(f"\n📊 최종 이미지 현황: {final_count}/{total_menus} ({final_count/total_menus*100:.1f}%)")
            
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    main() 