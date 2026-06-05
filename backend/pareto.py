import math


def is_hybrid_row(row: dict) -> bool:
    return row.get("mode", "hybrid") not in ("taxi_only", "transit_only")


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


def score_pareto_knee(pareto_rows: list[dict]) -> list[dict]:
    """
    전체 파레토(baseline 포함) 기준 min-max 정규화·양 끝점 직선·knee_score 계산.
    is_knee는 부여하지 않음 (hybrid 선정은 main에서).
    """
    if not pareto_rows:
        return []

    scored = [dict(r) for r in pareto_rows]
    for row in scored:
        row["is_hybrid"] = is_hybrid_row(row)
        row["is_knee"] = False

    ranked = sorted(scored, key=lambda r: r["weighted_minutes"])
    n = len(ranked)

    if n < 3:
        for row in ranked:
            row["t_norm"] = 0.0
            row["c_norm"] = 0.0
            row["knee_score"] = 0.0
        return ranked

    times = [r["weighted_minutes"] for r in ranked]
    costs = [float(r["price"]) for r in ranked]
    t_min, t_max = min(times), max(times)
    c_min, c_max = min(costs), max(costs)
    t_span = t_max - t_min + 1e-9
    c_span = c_max - c_min + 1e-9

    t_norm = [(t - t_min) / t_span for t in times]
    c_norm = [(c - c_min) / c_span for c in costs]

    p1 = (t_norm[0], c_norm[0])
    p2 = (t_norm[-1], c_norm[-1])
    line_vec = (p2[0] - p1[0], p2[1] - p1[1])
    line_len = math.hypot(line_vec[0], line_vec[1])

    for i, row in enumerate(ranked):
        row["t_norm"] = round(t_norm[i], 4)
        row["c_norm"] = round(c_norm[i], 4)
        if line_len < 1e-9:
            score = 0.0
        else:
            pt = (t_norm[i] - p1[0], c_norm[i] - p1[1])
            signed_cross = line_vec[0] * pt[1] - line_vec[1] * pt[0]
            score = signed_cross / line_len
        row["knee_score"] = round(score, 4)

    return ranked


def assign_hybrid_knee(
    scored_pareto: list[dict],
    knee_pool: list[dict] | None = None,
) -> dict | None:
    """knee_pool(hybrid 후보) 중 knee_score 최솟값에 is_knee=True. rank=1과 동일."""
    for row in scored_pareto:
        row["is_knee"] = False

    pool = knee_pool if knee_pool is not None else [r for r in scored_pareto if r.get("is_hybrid")]
    if not pool:
        return None

    knee = min(pool, key=lambda r: (r["knee_score"], r["weighted_minutes"]))
    knee["is_knee"] = True
    return knee


def assign_full_knee(scored_pareto: list[dict]) -> dict | None:
    """파이썬 find_knee_point과 1:1 동일.
    파레토 전체(taxi_only/transit_only 포함)에서 무릎점 선택.
    - n < 3 : weighted_minutes 오름차순 가운데 점(n // 2)
    - n >= 3: knee_score 최솟값(가장 볼록), 동률이면 weighted_minutes 작은 쪽
    """
    for row in scored_pareto:
        row["is_knee"] = False
    if not scored_pareto:
        return None

    ranked = sorted(scored_pareto, key=lambda r: r["weighted_minutes"])
    n = len(ranked)
    if n < 3:
        knee = ranked[n // 2]
    else:
        knee = min(ranked, key=lambda r: (r["knee_score"], r["weighted_minutes"]))
    knee["is_knee"] = True
    return knee
