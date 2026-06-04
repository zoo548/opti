W_WALK     = 1.99
W_TRANSFER = 11.24


def apply_weights(rows: list[dict]) -> list[dict]:
    for row in rows:
        row["weighted_minutes"] = round(
            row.get("transit_minutes", 0)
            + row.get("walk_minutes", 0) * W_WALK
            + row.get("transit_transfers", 0) * W_TRANSFER
            + row.get("taxi_minutes", 0),
            2,
        )
    return rows


def _row_taxi_only(baseline: dict) -> dict:
    minutes = float(baseline.get("minutes") or 0)
    price = int(baseline.get("price") or 0)
    return {
        "mode": "taxi_only",
        "transfer_point": "택시만",
        "total_minutes": round(minutes, 1),
        "price": price,
        "taxi_minutes": round(minutes, 1),
        "taxi_price": price,
        "transit_minutes": 0,
        "walk_minutes": 0,
        "transit_transfers": 0,
        "transit_price": 0,
        "lines": [],
    }


def _row_transit_only(baseline: dict) -> dict:
    walk = float(baseline.get("walk_minutes") or 0)
    total = float(baseline.get("minutes") or 0)
    transit_min = float(baseline.get("transit_minutes") if baseline.get("transit_minutes") is not None else total - walk)
    return {
        "mode": "transit_only",
        "transfer_point": "대중교통만",
        "total_minutes": round(total, 1),
        "price": int(baseline.get("price") or 0),
        "taxi_minutes": 0,
        "taxi_price": 0,
        "transit_minutes": round(transit_min, 1),
        "walk_minutes": round(walk, 1),
        "transit_transfers": int(baseline.get("transfers") or 0),
        "transit_price": int(baseline.get("price") or 0),
        "lines": baseline.get("lines") or [],
    }


def build_pareto_candidates(sim_result: dict) -> list[dict]:
    """환승 후보 + transit_only + taxi_only → 파레토 비교용 동일 스키마 rows."""
    candidates = [{**row, "mode": "hybrid"} for row in sim_result.get("rows", [])]
    candidates.append(_row_taxi_only(sim_result["taxi_only"]))
    candidates.append(_row_transit_only(sim_result["transit_only"]))
    return candidates
