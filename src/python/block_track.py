import ssl
import sys
import hashlib
from fastapi import APIRouter, HTTPException, Query
from shared.config import get_network_config
import httpx

block_track_router = APIRouter(prefix="/api/v1/blocks", tags=["Block Core Tracker"])

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
    except: 
        return ""

@block_track_router.get("/get-block")
async def get_block_by_height(
    height: int = Query(..., alias="height"), 
    network: str = Query(..., pattern="^(mainnet|testnet11)$")
):
    try:
        cfg = get_network_config(network)
        ssl_context = create_chia_ssl_context(cfg["crt"], cfg["key"])
        rpc_url = cfg["rpc_url"]
        
        async with httpx.AsyncClient(verify=ssl_context, timeout=12.0) as client:
            br_res = await client.post(f"{rpc_url}/get_block_record_by_height", json={"height": int(height)})
            if br_res.status_code != 200 or not br_res.json().get("success"): 
                raise HTTPException(status_code=404, detail="Block not found")
            
            br_data = br_res.json()["block_record"]
            header_hash = clean_hash(br_data.get("header_hash", ""))

            ar_res = await client.post(f"{rpc_url}/get_additions_and_removals", json={"header_hash": header_hash})
            raw_additions = ar_res.json().get("additions", []) if ar_res.status_code == 200 and ar_res.json().get("success") else []
            raw_removals = ar_res.json().get("removals", []) if ar_res.status_code == 200 and ar_res.json().get("success") else []

            # Обогащаем монеты рассчитанными Coin ID под структуру фронта
            additions = []
            for item in raw_additions:
                c = item.get("coin", {})
                c_pinfo = clean_hash(c.get("parent_coin_info", ""))
                c_ph = clean_hash(c.get("puzzle_hash", ""))
                c_amt = int(c.get("amount", 0))
                coin_id = calculate_coin_id(c_pinfo, c_ph, c_amt)
                additions.append({"id": coin_id, "amount": c_amt})

            removals = []
            for item in raw_removals:
                c = item.get("coin", {})
                c_pinfo = clean_hash(c.get("parent_coin_info", ""))
                c_ph = clean_hash(c.get("puzzle_hash", ""))
                c_amt = int(c.get("amount", 0))
                coin_id = clean_hash(item.get("name", "")) or calculate_coin_id(c_pinfo, c_ph, c_amt)
                removals.append({"id": coin_id, "amount": c_amt})

            return {
                "success": True,
                "block_record": {
                    "header_hash": header_hash,
                    "height": br_data.get("height"),
                    "timestamp": br_data.get("timestamp"),
                    "weight": br_data.get("weight"),
                },
                "additions": additions,
                "removals": removals,
                "fees_mojo": br_data.get("fees", 0)
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
