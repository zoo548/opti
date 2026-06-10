from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
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
from weight import apply_weights, build_pareto_candidates
from pareto import extract_pareto, score_pareto_knee, assign_full_knee, is_hybrid_row

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


@app.get("/outbound-ip")
def outbound_ip():
    """임시: Render 아웃바운드 IP 확인 (ODsay IP 등록용)."""
    import httpx

    ip = httpx.get("https://api.ipify.org", timeout=10).text.strip()
    print(ip)
    return {"ip": ip}


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
    """주소/장소명 → 위경도 변환 (Kakao REST API)"""
    api_key = os.environ.get("KAKAO_REST_API_KEY", "")
    address = (req.address or "").strip()

    if not api_key:
        logger.error("Kakao /geocode: KAKAO_REST_API_KEY not set")
        raise HTTPException(status_code=503, detail="KAKAO_REST_API_KEY가 설정되지 않았습니다.")
    if not address:
        logger.warning("Kakao /geocode: empty address in request")
        raise HTTPException(status_code=400, detail="주소가 비어 있습니다.")

    lat, lon, matched, status = geocode_kakao(address, api_key)
    if status != "성공":
        logger.error(
            "Kakao /geocode failed address=%r status=%s key_len=%d",
            address,
            status,
            len(api_key),
        )
        if status == "API키없음" or "401" in status or status.startswith("Kakao 인증"):
            raise HTTPException(status_code=502, detail=f"주소 변환 실패: {status}")
        raise HTTPException(status_code=400, detail=f"주소 변환 실패: {status}")

    if lat is None or lon is None:
        logger.error("Kakao /geocode: missing coords address=%r", address)
        raise HTTPException(status_code=502, detail="좌표를 가져오지 못했습니다.")

    logger.info("Kakao /geocode ok address=%r -> (%s, %s)", address, lat, lon)
    return {"address": matched or address, "lat": float(lat), "lon": float(lon)}


@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    """핵심 엔드포인트: 파레토 최적 환승 지점 추천"""
    try:
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
        sim_result = run_simulation(
            origin_lat=req.origin.lat,
            origin_lon=req.origin.lon,
            dest_lat=req.destination.lat,
            dest_lon=req.destination.lon,
            depart_time=req.depart_time,
            tmap_key=os.environ.get("TMAP_API_KEY", ""),
            odsay_key=os.environ.get("ODSAY_API_KEY", ""),
        )

        # 3. 파레토 후보 집합 (환승 + transit_only + taxi_only) → 가중치 적용
        candidates = apply_weights(build_pareto_candidates(sim_result))

        # 4. 파레토 프론티어 → 전체 기준 knee_score (baseline 포함 정규화·기준선)
        pareto_rows = extract_pareto(candidates)
        scored_pareto = score_pareto_knee(pareto_rows)

        # 5. 추천: 파이썬 find_knee_point과 동일 — 파레토 전체(baseline 포함)에서 무릎점 선택
        transit_baseline = sim_result["transit_only"]
        taxi_baseline    = sim_result["taxi_only"]

        assign_full_knee(scored_pareto)

        # 카드 목록: hybrid 파레토 점 전체, knee_score 오름차순
        # (사전 total_minutes 필터 없음 → 파이썬 프론티어/무릎점과 동일 결과)
        hybrid_rows = [r for r in scored_pareto if is_hybrid_row(r)]
        hybrid_rows.sort(key=lambda r: (r["knee_score"], r["weighted_minutes"]))

        recommendations = []
        for row in hybrid_rows:
            over_time  = allowed_minutes is not None and row["total_minutes"] > allowed_minutes
            over_price = req.constraints.max_price is not None and row["price"] > req.constraints.max_price
            rec = _build_recommendation(row, len(recommendations) + 1)
            rec["over_constraint"] = over_time or over_price
            rec["over_label"] = ("시간 초과" if over_time else "비용 초과" if over_price else None)
            recommendations.append(rec)

        # 6. 기준선 비교값 채우기
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
            "pareto_frontier": [_pareto_point_json(r) for r in scored_pareto],
            "recommendations": recommendations,
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(
            f"/analyze coords origin=({req.origin.lat}, {req.origin.lon}) "
            f"destination=({req.destination.lat}, {req.destination.lon})"
        )
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "trace": traceback.format_exc()},
        )


def _pareto_point_json(row: dict) -> dict:
    return {
        "mode":             row.get("mode", "hybrid"),
        "transfer_point":   row.get("transfer_point", ""),
        "total_minutes":    round(row.get("total_minutes", 0), 1),
        "weighted_minutes": round(row.get("weighted_minutes", 0), 2),
        "price":            int(row.get("price", 0)),
        "knee_score":       row.get("knee_score"),
        "t_norm":           row.get("t_norm"),
        "c_norm":           row.get("c_norm"),
        "is_hybrid":        bool(row.get("is_hybrid")),
        "is_knee":          bool(row.get("is_knee")),
    }


def _build_recommendation(row: dict, rank: int) -> dict:
    walk_min = row.get("walk_minutes", 0) or 0
    transit_vehicle = row.get("transit_minutes", 0) or 0
    transit_total = transit_vehicle + walk_min  # ODsay 구간 전체(도보 포함)
    return {
        "rank":             rank,
        "mode":             row.get("mode", "hybrid"),
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
        "knee_score":    row.get("knee_score"),
        "is_knee":       bool(row.get("is_knee")),
        "is_hybrid":     True,
        "t_norm":          row.get("t_norm"),
        "c_norm":          row.get("c_norm"),
    }
