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
    return sorted(pareto, key=lambda r: r["weighted_minutes"])
