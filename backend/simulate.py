import time
import requests
from datetime import datetime, timedelta

def get_transit_path(api_key, start_lat, start_lon, end_lat, end_lon):
    url = "https://api.odsay.com/v1/api/searchPubTransPathT"
    params = {"apiKey": api_key, "SX": str(start_lon), "SY": str(start_lat), "EX": str(end_lon), "EY": str(end_lat), "SearchPathType": 0}
    headers = {"Referer": "http://localhost"}
    try:
        res = requests.get(url, params=params, headers=headers, timeout=10)
        if res.status_code == 200:
            data = res.json()
            if "result" in data:
                return data["result"]["path"]
    except Exception:
        pass
    return None

def parse_transit_path(path_obj):
    walk_min = 0
    lines = []
    for sub in path_obj.get("subPath", []):
        traffic_type = sub.get("trafficType")
        if traffic_type == 3:
            walk_min += sub.get("sectionTime", 0)
        elif traffic_type in [1, 2]:
            lane = sub.get("lane", [{}])[0]
            name = lane.get("busNo") if traffic_type == 2 else lane.get("name", "")
            stations = sub.get("passStopList", {}).get("stations", [])
            from_st = stations[0]["stationName"] if stations else ""
            to_st = stations[-1]["stationName"] if len(stations) > 1 else ""
            lines.append({"name": name, "from": from_st, "to": to_st, "minutes": sub.get("sectionTime", 0)})
    transfers = max(0, len(lines) - 1)
    total_price = path_obj.get("info", {}).get("payment", 0) or 0
    total_time = path_obj.get("info", {}).get("totalTime", 0)
    return {"total_minutes": total_time, "walk_minutes": walk_min, "transit_minutes": total_time - walk_min, "transfers": transfers, "price": total_price, "lines": lines}

def get_taxi_info(api_key, start_lat, start_lon, end_lat, end_lon, depart_time_str):
    headers = {"appKey": api_key, "Content-Type": "application/json"}
    url_pred = "https://apis.openapi.sk.com/tmap/routes/prediction?version=1&format=json"
    payload = {"routesInfo": {"departure": {"lon": str(start_lon), "lat": str(start_lat)}, "destination": {"lon": str(end_lon), "lat": str(end_lat)}, "predictionType": "departure", "predictionTime": depart_time_str, "searchOption": "0"}}
    try:
        r = requests.post(url_pred, headers=headers, json=payload, timeout=8)
        if r.status_code == 200:
            prop = r.json()["features"][0]["properties"]
            return prop.get("totalTime", 0) / 60, prop.get("taxiFare", 0)
    except Exception:
        pass
    url_basic = "https://apis.openapi.sk.com/tmap/routes?version=1&format=json"
    data = {"startX": str(start_lon), "startY": str(start_lat), "endX": str(end_lon), "endY": str(end_lat)}
    try:
        r = requests.post(url_basic, headers={"appKey": api_key}, data=data, timeout=8)
        if r.status_code == 200:
            prop = r.json()["features"][0]["properties"]
            return prop.get("totalTime", 0) / 60, prop.get("taxiFare", 0)
    except Exception:
        pass
    return None, None

def run_simulation(origin_lat, origin_lon, dest_lat, dest_lon, depart_time, tmap_key, odsay_key):
    base_dt = datetime.fromisoformat(depart_time.replace("+0900", "+09:00"))
    rows = []
    t_str = base_dt.strftime("%Y-%m-%dT%H:%M:%S+0900")
    tt, tf = get_taxi_info(tmap_key, origin_lat, origin_lon, dest_lat, dest_lon, t_str)
    taxi_only = {"minutes": round(tt, 1) if tt else 0, "price": int(tf) if tf else 0}
    paths = get_transit_path(odsay_key, origin_lat, origin_lon, dest_lat, dest_lon)
    if not paths:
        raise ValueError("대중교통 경로를 가져올 수 없습니다.")
    best = paths[0]
    parsed = parse_transit_path(best)
    transit_only = {"minutes": parsed["total_minutes"], "price": parsed["price"], "transfers": parsed["transfers"], "segments": _build_segments(best)}
    for sub in best.get("subPath", []):
        if sub.get("trafficType") not in [1, 2]:
            continue
        for st in sub.get("passStopList", {}).get("stations", []):
            s_name, s_lat, s_lon = st["stationName"], st["y"], st["x"]
            st_paths = get_transit_path(odsay_key, origin_lat, origin_lon, s_lat, s_lon)
            if not st_paths:
                time.sleep(0.1)
                continue
            st_parsed = parse_transit_path(st_paths[0])
            t_min = st_parsed["total_minutes"]
            tx_dt = (base_dt + timedelta(minutes=t_min)).strftime("%Y-%m-%dT%H:%M:%S+0900")
            stt, stf = get_taxi_info(tmap_key, s_lat, s_lon, dest_lat, dest_lon, tx_dt)
            if stt is None:
                time.sleep(0.1)
                continue
            rows.append({"transfer_point": s_name, "total_minutes": round(t_min + stt, 1), "transit_minutes": round(t_min - st_parsed["walk_minutes"], 1), "taxi_minutes": round(stt, 1), "transit_price": st_parsed["price"], "taxi_price": int(stf) if stf else 0, "price": st_parsed["price"] + (int(stf) if stf else 0), "transit_transfers": st_parsed["transfers"], "lines": st_parsed["lines"], "walk_minutes": st_parsed["walk_minutes"]})
            time.sleep(0.1)
    return {"transit_only": transit_only, "taxi_only": taxi_only, "rows": rows}

def _build_segments(path_obj):
    segments = []
    for sub in path_obj.get("subPath", []):
        t = sub.get("trafficType")
        if t == 3:
            segments.append({"type": "walk", "minutes": sub.get("sectionTime", 0)})
        elif t in [1, 2]:
            lane = sub.get("lane", [{}])[0]
            name = lane.get("busNo") if t == 2 else lane.get("name", "")
            stations = sub.get("passStopList", {}).get("stations", [])
            segments.append({"type": "transit", "line": name, "from": stations[0]["stationName"] if stations else "", "to": stations[-1]["stationName"] if len(stations) > 1 else "", "minutes": sub.get("sectionTime", 0), "price": path_obj.get("info", {}).get("payment", 0)})
    return segments
