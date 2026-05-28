from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import logging
import os

logger = logging.getLogger(__name__)

from dotenv import load_dotenv
load_dotenv()

from geocode import geocode_kakao, search_keyword_kakao, reverse_geocode_kakao
from simulate import run_simulation
from weight import apply_weights
from pareto import extract_pareto

app = FastAPI(title="Opti API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Vercel 배포 후 실제 도메인으로 교체
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response 모델 ────────────────────────────────────────

class Coord(BaseModel):
    lat: float
    lon: float

class Constraints(BaseModel):
    arrive_by: Optional[str] = None   # ISO 8601: "2026-05-26T09:00:00+0900"
    max_price: Optional[int] = None

class AnalyzeRequest(BaseModel):
    origin: Coord
    destination: Coord
    constraints: Constraints
    depart_time: str                  # ISO 8601: "2026-05-26T08:10:00+0900"

class GeocodeRequest(BaseModel):
    address: str


# ── 엔드포인트 ─────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/search")
def search_places(q: str):
    """키워드 장소 검색 (자동완성)"""
    api_key = os.environ.get("KAKAO_REST_API_KEY", "")
    if not api_key:
        logger.error("Kakao /search: KAKAO_REST_API_KEY not set")
        raise HTTPException(status_code=503, detail="KAKAO_REST_API_KEY가 설정되지 않았습니다.")
    try:
        docs = search_keyword_kakao(q, api_key)
    except ValueError as e:
        logger.error(
            "Kakao /search failed query=%r key_len=%d: %s",
            q,
            len(api_key),
            e,
            exc_info=True,
        )
        raise HTTPException(status_code=502, detail=str(e)) from e
    except Exception as e:
        logger.exception("Kakao /search unexpected error query=%r", q)
        raise HTTPException(status_code=502, detail=f"검색 서버 오류: {e}") from e
    return {
        "documents": [
            {
                "id": d.get("id", ""),
                "place_name": d.get("place_name", ""),
                "address_name": d.get("address_name", ""),
            }
            for d in docs
        ]
    }


@app.get("/reverse-geocode")
def reverse_geocode(lat: float, lon: float):
    """위경도 → 주소 (역지오코딩)"""
    api_key = os.environ.get("KAKAO_REST_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=503, detail="KAKAO_REST_API_KEY가 설정되지 않았습니다.")
    address = reverse_geocode_kakao(lat, lon, api_key)
    return {"address": address}


@app.post("/geocode")
def geocode(req: GeocodeRequest):
    """주소 → 위경도 변환 (Kakao REST API)"""
    api_key = os.environ.get("KAKAO_REST_API_KEY", "")
    lat, lon, matched, status = geocode_kakao(req.address, api_key)
    if status != "성공":
        raise HTTPException(status_code=400, detail=f"주소 변환 실패: {status}")
    return {"address": matched, "lat": float(lat), "lon": float(lon)}


@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    """핵심 엔드포인트: 파레토 최적 환승 지점 추천"""

    # 1. 허용 소요시간 계산
    allowed_minutes = None
    if req.constraints.arrive_by:
        try:
            arrive_dt = datetime.fromisoformat(req.constraints.arrive_by.replace("+0900", "+09:00"))
            depart_dt = datetime.fromisoformat(req.depart_time.replace("+0900", "+09:00"))
            allowed_minutes = int((arrive_dt - depart_dt).total_seconds() / 60)
            if allowed_minutes <= 0:
                raise HTTPException(status_code=400, detail="도착 희망 시각이 출발 시각보다 이릅니다.")
        except ValueError:
            raise HTTPException(status_code=400, detail="시각 형식이 올바르지 않습니다.")

    # 2. 시뮬레이션 실행 (대중교통 + 택시 조합)
    try:
        sim_result = run_simulation(
            origin_lat=req.origin.lat,
            origin_lon=req.origin.lon,
            dest_lat=req.destination.lat,
            dest_lon=req.destination.lon,
            depart_time=req.depart_time,
            tmap_key=os.environ.get("TMAP_API_KEY", ""),
            odsay_key=os.environ.get("ODSAY_API_KEY", ""),
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"경로 분석 실패: {str(e)}")

    # 3. 가중치 적용
    rows = apply_weights(sim_result["rows"])

    # 4. 파레토 프론티어 추출
    pareto_rows = extract_pareto(rows)

    # 5. 제약 필터 적용 (필터링 후 순위 재정렬)
    recommendations = []
    for row in sorted(pareto_rows, key=lambda r: r["weighted_minutes"]):
        over_time  = allowed_minutes is not None and row["total_minutes"] > allowed_minutes
        over_price = req.constraints.max_price is not None and row["price"] > req.constraints.max_price
        rec = _build_recommendation(row, len(recommendations) + 1)
        rec["over_constraint"] = over_time or over_price
        rec["over_label"] = ("시간 초과" if over_time else "비용 초과" if over_price else None)
        recommendations.append(rec)

    # 6. 기준선 비교값 채우기
    transit_baseline = sim_result["transit_only"]
    taxi_baseline    = sim_result["taxi_only"]
    for rec in recommendations:
        rec["savings"] = {
            "vs_transit_minutes": transit_baseline["minutes"] - rec["total_minutes"],
            "vs_taxi_price":      taxi_baseline["price"] - rec["price"],
        }

    return {
        "allowed_minutes": allowed_minutes,
        "baselines": {
            "transit_only": transit_baseline,
            "taxi_only":    taxi_baseline,
        },
        "recommendations": recommendations,
    }


def _build_recommendation(row: dict, rank: int) -> dict:
    walk_min = row.get("walk_minutes", 0) or 0
    transit_vehicle = row.get("transit_minutes", 0) or 0
    transit_total = transit_vehicle + walk_min  # ODsay 구간 전체(도보 포함)
    return {
        "rank":             rank,
        "transfer_point":   row["transfer_point"],
        "total_minutes":    round(row["total_minutes"], 1),
        "weighted_minutes": round(row["weighted_minutes"], 2),
        "price":            int(row["price"]),
        "transit_segment": {
            "minutes":      round(transit_total, 1),
            "walk_minutes": round(walk_min, 1),
            "transfers":    int(row.get("transit_transfers", 0)),
            "price":        int(row.get("transit_price", 0)),
            "lines":        row.get("lines", []),
        },
        "taxi_segment": {
            "minutes": round(row["taxi_minutes"], 1),
            "price":   int(row.get("taxi_price", 0)),
        },
    }
