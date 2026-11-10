import ssl
import hashlib
import time
import traceback
from fastapi import APIRouter, Query
from shared.config import get_network_config
import httpx

dashboard_router = APIRouter(prefix="/api/v1/blocks", tags=["Explorer Dashboard"])

_DASHBOARD_CACHE = {
    "mainnet": {"data": None, "last_updated": 0, "last_height": 0},
    "testnet11": {"data": None, "last_updated": 0, "last_height": 0}
}
CACHE_TTL = 15

def clean_hash(h: str) -> str: 
    return f"0x{str(h).replace('0x', '').strip().lower()}" if h and str(h).replace('0x', '').strip() else ""

def create_chia_ssl_context(c: str, k: str) -> ssl.SSLContext:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    ctx.load_cert_chain(certfile=c, keyfile=k)
    return ctx

def int_to_clvm_bytes(v: int) -> bytes:
    if v == 0: return b""
    b = v.to_bytes((v.bit_length() + 8) // 8, byteorder="big", signed=True)
    while len(b) > 1 and b == 0 and (b & 0x80) == 0: b = b[1:]
    return b

def calculate_coin_id(p: str, ph: str, amt: int) -> str:
    try: 
        p_bytes = bytes.fromhex(p.replace('0x', '').zfill(64))
        ph_bytes = bytes.fromhex(ph.replace('0x', '').zfill(64))
        return f"0x{hashlib.sha256(p_bytes + ph_bytes + int_to_clvm_bytes(amt)).hexdigest()}"
    except Exception:
        return ""

@dashboard_router.get("/latest-activity")
async def get_latest_activity(
    height: int = Query(..., alias="height"),
    network: str = Query(..., pattern="^(mainnet|testnet11)$")
):
    global _DASHBOARD_CACHE
    now_ts = int(time.time())
    
    # Сверяем кэш по времени и по высоте блока: если высота та же, отдаем моментально
    net_cache = _DASHBOARD_CACHE[network]
    if net_cache["data"] is not None and net_cache["last_height"] == height and (now_ts - net_cache["last_updated"]) < CACHE_TTL:
        return net_cache["data"]

    blocks = []
    all_coins = []
    try:
        cfg = get_network_config(network)
        ssl_context = create_chia_ssl_context(cfg["crt"], cfg["key"])
        rpc_url = cfg["rpc_url"]
        
        async with httpx.AsyncClient(verify=ssl_context, timeout=10.0) as client:
            current_h = height
            found_coins = False
            
            # Сканируем историю леджера от переданной вебсокетом высоты
            for _ in range(150):
                if len(blocks) >= 10 and found_coins or current_h <= 0:
                    break
                    
                br_res = await client.post(f"{rpc_url}/get_block_record_by_height", json={"height": int(current_h)})
                if br_res.status_code == 200 and br_res.json().get("success"):
                    b_data = br_res.json().get("block_record")
                    
                    if b_data and (b_data.get("is_transaction_block", False) or b_data.get("fees", 0) or 0 > 0):
                        b_hash = b_data.get("header_hash")
                        b_height = int(b_data.get("height"))
                        
                        if len(blocks) < 10:
                            b_ts = b_data.get("timestamp")
                            diff = abs(now_ts - int(b_ts)) if b_ts else 0
                            time_ago = "1 min ago" if diff < 60 else f"{diff // 60} mins ago"
                            
                            blocks.append({
                                "height": b_height,
                                "time_ago": time_ago,
                                "farmer": clean_hash(b_data.get("farmer_puzzle_hash", "—"))
                            })
                        
                        if not found_coins:
                            ar_res = await client.post(f"{rpc_url}/get_additions_and_removals", json={"header_hash": b_hash})
                            if ar_res.status_code == 200 and ar_res.json().get("success"):
                                raw_adds = ar_res.json().get("additions", [])
                                for item in raw_adds:
                                    c = item.get("coin", {})
                                    coin_id = calculate_coin_id(clean_hash(c.get("parent_coin_info", "")), clean_hash(c.get("puzzle_hash", "")), int(c.get("amount", 0)))
                                    if coin_id:
                                        all_coins.append({"id": coin_id, "amount": int(c.get("amount", 0)), "height": b_height})
                                if raw_adds: found_coins = True
                current_h -= 1

            sorted_coins = sorted(all_coins, key=lambda x: x["amount"], reverse=True)
            response_data = {"success": True, "blocks": blocks, "coins": sorted_coins[:10]}
            
            _DASHBOARD_CACHE[network] = {"data": response_data, "last_updated": now_ts, "last_height": height}
            return response_data

    except Exception as e:
        if net_cache["data"]: return net_cache["data"]
        return {"success": False, "error_details": str(e), "traceback": traceback.format_exc(), "blocks": blocks, "coins": coins}
