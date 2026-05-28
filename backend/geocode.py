import re
import requests

def clean_address(addr: str) -> str:
    addr = str(addr).strip()
    addr = re.sub(r"\([^)]*\)", "", addr)
    addr = re.sub(r"\s+", " ", addr).strip()
    return addr

def geocode_kakao(address: str, api_key: str):
    url = "https://dapi.kakao.com/v2/local/search/address.json"
    headers = {"Authorization": f"KakaoAK {api_key}"}
    params = {"query": clean_address(address), "analyze_type": "similar"}
    try:
        resp = requests.get(url, headers=headers, params=params, timeout=20)
        data = resp.json()
    except Exception as e:
        return None, None, None, f"요청 실패: {e}"
    if resp.status_code != 200:
        return None, None, None, f"HTTP {resp.status_code}"
    docs = data.get("documents", [])
    if not docs:
        return None, None, None, "검색결과없음"
    first = docs[0]
    lon = first.get("x")
    lat = first.get("y")
    matched_addr = None
    if first.get("address"):
        matched_addr = first["address"].get("address_name")
    if not matched_addr and first.get("road_address"):
        matched_addr = first["road_address"].get("address_name")
    return lat, lon, matched_addr, "성공"

def search_keyword_kakao(query: str, api_key: str, size: int = 5) -> list[dict]:
    """키워드 장소 검색 (자동완성용)"""
    if not api_key or len(query.strip()) < 2:
        return []
    url = "https://dapi.kakao.com/v2/local/search/keyword.json"
    headers = {"Authorization": f"KakaoAK {api_key}"}
    params = {"query": query.strip(), "size": size}
    try:
        resp = requests.get(url, headers=headers, params=params, timeout=10)
        if resp.status_code != 200:
            return []
        return resp.json().get("documents", [])
    except Exception:
        return []


def reverse_geocode_kakao(lat: float, lon: float, api_key: str) -> str:
    url = "https://dapi.kakao.com/v2/local/geo/coord2address.json"
    headers = {"Authorization": f"KakaoAK {api_key}"}
    params = {"x": str(lon), "y": str(lat), "input_coord": "WGS84"}
    try:
        resp = requests.get(url, headers=headers, params=params, timeout=10)
        data = resp.json()
        docs = data.get("documents", [])
        if docs:
            addr = docs[0].get("road_address") or docs[0].get("address")
            if addr:
                return addr.get("address_name", "현재 위치")
    except Exception:
        pass
    return "현재 위치"
