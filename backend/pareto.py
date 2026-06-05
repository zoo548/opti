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


def rank_by_knee_score(pareto_rows: list[dict]) -> list[dict]:
    """
    파레토 프론티어를 가중치_누적시간(weighted_minutes) 기준 정렬 후,
    양 끝점 연결 직선 대비 signed cross product(Knee Score) 최솟값이 knee point.
    추천순 = knee_score 오름차순 (knee가 1순위).
    """
    if not pareto_rows:
        return []

    ranked = sorted([dict(r) for r in pareto_rows], key=lambda r: r["weighted_minutes"])
    n = len(ranked)

    if n < 3:
        knee_idx = n // 2
        for i, row in enumerate(ranked):
            row["t_norm"] = 0.0
            row["c_norm"] = 0.0
            row["knee_score"] = 0.0
            row["is_knee"] = i == knee_idx
        knee_row = ranked[knee_idx]
        others = [r for i, r in enumerate(ranked) if i != knee_idx]
        return [knee_row, *others]

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
        row["is_knee"] = False

    knee_idx = min(range(n), key=lambda i: ranked[i]["knee_score"])
    ranked[knee_idx]["is_knee"] = True

    ranked.sort(key=lambda r: (r["knee_score"], r["weighted_minutes"]))
    return ranked
