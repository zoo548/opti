import math


def extract_pareto(rows: list[dict]) -> list[dict]:
    if not rows:
        return []
    pareto = []
    for i, row_i in enumerate(rows):
        dominated = False
        for j, row_j in enumerate(rows):
            if i == j:
                continue
            if (row_j["weighted_minutes"] <= row_i["weighted_minutes"]
                    and row_j["price"] <= row_i["price"]
                    and (row_j["weighted_minutes"] < row_i["weighted_minutes"]
                         or row_j["price"] < row_i["price"])):
                dominated = True
                break
        if not dominated:
            pareto.append(row_i)
    return pareto


def rank_by_normalized_distance(pareto_rows: list[dict]) -> list[dict]:
    """
    파레토 점 집합 전체 기준 min-max 정규화 후 원점 유클리드 거리 오름차순.
    taxi_only / transit_only 포함해 t_min/t_max, c_min/c_max 앵커 계산.
    """
    if not pareto_rows:
        return []

    ranked = [dict(r) for r in pareto_rows]
    t_vals = [r["weighted_minutes"] for r in ranked]
    c_vals = [r["price"] for r in ranked]
    t_min, t_max = min(t_vals), max(t_vals)
    c_min, c_max = min(c_vals), max(c_vals)
    t_span = t_max - t_min
    c_span = c_max - c_min

    for row in ranked:
        t_norm = 0.0 if t_span == 0 else (row["weighted_minutes"] - t_min) / t_span
        c_norm = 0.0 if c_span == 0 else (row["price"] - c_min) / c_span
        row["t_norm"] = round(t_norm, 4)
        row["c_norm"] = round(c_norm, 4)
        row["norm_distance"] = round(math.sqrt(t_norm * t_norm + c_norm * c_norm), 4)

    ranked.sort(key=lambda r: r["norm_distance"])
    return ranked
