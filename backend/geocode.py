import re
import requests

KAKAO_ADDRESS_URL = "https://dapi.kakao.com/v2/local/search/address.json"
KAKAO_KEYWORD_URL = "https://dapi.kakao.com/v2/local/search/keyword.json"
KAKAO_COORD_URL = "https://dapi.kakao.com/v2/local/geo/coord2address.json"


def clean_address(addr: str) -> str:
    addr = str(addr).strip()
    addr = re.sub(r"\([^)]*\)", "", addr)
    addr = re.sub(r"\s+", " ", addr).strip()
    return addr


def _kakao_headers(api_key: str) -> dict:
    return {"Authorization": f"KakaoAK {api_key}"}


def _parse_coords(doc: dict) -> tuple[str | None, str | None, str | None]:
    """Kakao document → (lat, lon, display_name)."""
    lon = doc.get("x")
    lat = doc.get("y")
    if not lat or not lon:
        return None, None, None

    name = doc.get("place_name")
    if not name:
        if doc.get("address"):
            name = doc["address"].get("address_name")
        if not name and doc.get("road_address"):
            name = doc["road_address"].get("address_name")
    if not name:
        name = doc.get("address_name")

    return lat, lon, name


def _geocode_via_address(query: str, api_key: str) -> tuple[str | None, str | None, str | None, str]:
    params = {"query": query, "analyze_type": "similar"}
    try:
        resp = requests.get(
            KAKAO_ADDRESS_URL,
            headers=_kakao_headers(api_key),
            params=params,
            timeout=20,
        )
    except Exception as e:
        return None, None, None, f"주소검색 요청 실패: {e}"

    if resp.status_code == 401:
        return None, None, None, f"Kakao 인증 실패 (401): {resp.text[:500]}"
    if resp.status_code != 200:
        return None, None, None, f"주소검색 HTTP {resp.status_code}: {resp.text[:500]}"

    docs = resp.json().get("documents", [])
    if not docs:
        return None, None, None, "주소검색 결과없음"

    lat, lon, name = _parse_coords(docs[0])
    if not lat or not lon:
        return None, None, None, "주소검색 좌표없음"
    return lat, lon, name, "성공"


def _geocode_via_keyword(query: str, api_key: str) -> tuple[str | None, str | None, str | None, str]:
    """장소명 검색 (자동완성에서 고른 경우)."""
    params = {"query": query, "size": 1}
    try:
        resp = requests.get(
            KAKAO_KEYWORD_URL,
            headers=_kakao_headers(api_key),
            params=params,
            timeout=20,
        )
    except Exception as e:
        return None, None, None, f"장소검색 요청 실패: {e}"

    if resp.status_code == 401:
        return None, None, None, f"Kakao 인증 실패 (401): {resp.text[:500]}"
    if resp.status_code != 200:
        return None, None, None, f"장소검색 HTTP {resp.status_code}: {resp.text[:500]}"

    docs = resp.json().get("documents", [])
    if not docs:
        return None, None, None, "장소검색 결과없음"

    lat, lon, name = _parse_coords(docs[0])
    if not lat or not lon:
        return None, None, None, "장소검색 좌표없음"
    return lat, lon, name, "성공"


def geocode_kakao(address: str, api_key: str):
    """
    주소/장소명 → 위경도.
    주소 API 우선, 실패 시 키워드 API(자동완성 장소명)로 폴백.
    Returns: (lat, lon, matched_name, status)
    """
    if not api_key:
        return None, None, None, "API키없음"

    query = clean_address(address)
    if not query:
        return None, None, None, "입력비어있음"

    lat, lon, matched, status = _geocode_via_address(query, api_key)
    if status == "성공":
        return lat, lon, matched, status

    # 자동완성 장소명(서울역, 강남역 등)은 주소 API에 없을 수 있음
    k_lat, k_lon, k_matched, k_status = _geocode_via_keyword(query, api_key)
    if k_status == "성공":
        return k_lat, k_lon, k_matched, k_status

    return None, None, None, f"{status}; 폴백 {k_status}"


def search_keyword_kakao(query: str, api_key: str, size: int = 5) -> list[dict]:
    """키워드 장소 검색 (자동완성용). 실패 시 ValueError."""
    if not api_key or len(query.strip()) < 2:
        return []
    headers = _kakao_headers(api_key)
    params = {"query": query.strip(), "size": size}
    try:
        resp = requests.get(KAKAO_KEYWORD_URL, headers=headers, params=params, timeout=10)
    except Exception as e:
        raise ValueError(f"Kakao 요청 실패: {e}") from e
    if resp.status_code == 401:
        raise ValueError(f"Kakao API 키가 유효하지 않습니다 (401): {resp.text[:500]}")
    if resp.status_code != 200:
        raise ValueError(
            f"Kakao API 오류 (HTTP {resp.status_code}): {resp.text[:500]}"
        )
    return resp.json().get("documents", [])


def reverse_geocode_kakao(lat: float, lon: float, api_key: str) -> str:
    headers = _kakao_headers(api_key)
    params = {"x": str(lon), "y": str(lat), "input_coord": "WGS84"}
    try:
        resp = requests.get(KAKAO_COORD_URL, headers=headers, params=params, timeout=10)
        data = resp.json()
        docs = data.get("documents", [])
        if docs:
            addr = docs[0].get("road_address") or docs[0].get("address")
            if addr:
                return addr.get("address_name", "현재 위치")
    except Exception:
        pass
    return "현재 위치"
