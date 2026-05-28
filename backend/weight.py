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
