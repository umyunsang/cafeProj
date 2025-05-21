from typing import Any, Dict, Optional, Callable, Union
import time
import hashlib
import json
from functools import wraps
from pydantic import BaseModel
from .config import settings

# 메모리 캐시 (실제 서비스에서는 Redis 등을 사용하는 것이 좋음)
_CACHE: Dict[str, Dict[str, Any]] = {}

class CacheItem:
    """캐시 항목 클래스"""
    def __init__(self, value: Any, expire_at: float):
        self.value = value
        self.expire_at = expire_at
    
    def is_expired(self) -> bool:
        """캐시 항목의 만료 여부 확인"""
        return time.time() > self.expire_at

def safe_json_serialize(obj: Any) -> str:
    """
    객체를 안전하게 문자열로 직렬화하는 함수
    JSON으로 직렬화할 수 없는 객체도 처리합니다.
    
    Args:
        obj: 직렬화할 객체
    
    Returns:
        str: 직렬화된 문자열
    """
    try:
        if isinstance(obj, BaseModel):
            return obj.json()
        elif hasattr(obj, '__dict__'):
            try:
                return json.dumps(obj.__dict__, sort_keys=True)
            except TypeError:
                # JSON으로 직렬화할 수 없는 경우 객체의 클래스 이름과 id 사용
                return f"{obj.__class__.__name__}:{id(obj)}"
        else:
            try:
                return json.dumps(obj, sort_keys=True)
            except TypeError:
                # JSON으로 직렬화할 수 없는 경우 객체의 문자열 표현과 id 사용
                return f"{str(obj)}:{id(obj)}"
    except Exception:
        # 어떤 예외가 발생하더라도 객체의 ID를 사용하여 캐시 키 생성
        return f"object:{id(obj)}"

def generate_cache_key(prefix: str, *args, **kwargs) -> str:
    """
    캐시 키 생성 함수
    
    Args:
        prefix: 캐시 키 접두사
        args, kwargs: 캐시 키에 포함할 인자들
    
    Returns:
        str: 생성된 캐시 키
    """
    # 인자들을 문자열로 변환하여 해시 생성
    key_parts = [prefix]
    
    # args 처리
    for arg in args:
        key_parts.append(safe_json_serialize(arg))
    
    # kwargs 처리
    if kwargs:
        sorted_kwargs = sorted(kwargs.items())
        for k, v in sorted_kwargs:
            key_parts.append(f"{k}:{safe_json_serialize(v)}")
    
    # 모든 부분을 결합하여 해시 생성
    key_str = ":".join(key_parts)
    return hashlib.md5(key_str.encode()).hexdigest()

def cache_get(key: str) -> Optional[Any]:
    """
    캐시에서 값을 가져오는 함수
    
    Args:
        key: 캐시 키
    
    Returns:
        Optional[Any]: 캐시된 값 또는 None
    """
    if not settings.CACHE_ENABLED:
        return None
    
    cache_item = _CACHE.get(key)
    if cache_item is None:
        return None
    
    if cache_item.is_expired():
        # 만료된 항목 삭제
        del _CACHE[key]
        return None
    
    return cache_item.value

def cache_set(key: str, value: Any, timeout: Optional[int] = None) -> None:
    """
    값을 캐시에 저장하는 함수
    
    Args:
        key: 캐시 키
        value: 저장할 값
        timeout: 캐시 만료 시간(초), None인 경우 기본값 사용
    """
    if not settings.CACHE_ENABLED:
        return
    
    # 기본 만료 시간 사용
    if timeout is None:
        timeout = settings.CACHE_TIMEOUT
    
    expire_at = time.time() + timeout
    _CACHE[key] = CacheItem(value, expire_at)

def cache_delete(key: str) -> None:
    """
    캐시에서 항목을 삭제하는 함수
    
    Args:
        key: 삭제할 캐시 키
    """
    if key in _CACHE:
        del _CACHE[key]

def cache_clear() -> None:
    """모든 캐시 항목을 삭제하는 함수"""
    _CACHE.clear()

def cached(prefix: str, timeout: Optional[int] = None):
    """
    함수 결과를 캐싱하는 데코레이터
    
    Args:
        prefix: 캐시 키 접두사
        timeout: 캐시 만료 시간(초), None인 경우 기본값 사용
    
    Returns:
        Callable: 데코레이터 함수
    """
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if not settings.CACHE_ENABLED:
                return func(*args, **kwargs)
            
            # 캐시 키 생성
            cache_key = generate_cache_key(prefix, *args, **kwargs)
            
            # 캐시에서 값을 가져오기
            cached_value = cache_get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # 함수 실행 및 결과 캐싱
            result = func(*args, **kwargs)
            cache_set(cache_key, result, timeout)
            
            return result
        return wrapper
    return decorator

async def async_cached(prefix: str, timeout: Optional[int] = None):
    """
    비동기 함수 결과를 캐싱하는 데코레이터
    
    Args:
        prefix: 캐시 키 접두사
        timeout: 캐시 만료 시간(초), None인 경우 기본값 사용
    
    Returns:
        Callable: 데코레이터 함수
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            if not settings.CACHE_ENABLED:
                return await func(*args, **kwargs)
            
            # 캐시 키 생성
            cache_key = generate_cache_key(prefix, *args, **kwargs)
            
            # 캐시에서 값을 가져오기
            cached_value = cache_get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # 비동기 함수 실행 및 결과 캐싱
            result = await func(*args, **kwargs)
            cache_set(cache_key, result, timeout)
            
            return result
        return wrapper
    return decorator 