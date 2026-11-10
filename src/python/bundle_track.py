import ssl
import httpx
import hashlib
from fastapi import APIRouter, HTTPException, Query
from shared.config import get_network_config

bundle_track_router = APIRouter(prefix="/api/v1/bundles", tags=["Spend Bundle Core Tracker"])

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

def format_to_xch(mojo: int) -> str:
    val = float(mojo) / 1e12
    return f"{val:.12f}".rstrip('0').rstrip('.') if '.' in f"{val:.12f}" else f"{val:.12f}"

@bundle_track_router.get("/track-bundle")
async def track_bundle(
    block_height: int = Query(..., alias="blockHeight"), 
    target_coin_id: str = Query(..., alias="targetCoinId"), 
    network: str = Query(..., pattern="^(mainnet|testnet11)$"),
    mode: str = Query(..., pattern="^(created|spent)$")
):
    try:
        cfg = get_network_config(network)
        ssl_context = create_chia_ssl_context(cfg["crt"], cfg["key"])
        rpc_url, target_clean = cfg["rpc_url"], clean_hash(target_coin_id)
        
        async with httpx.AsyncClient(verify=ssl_context, timeout=12.0) as client:
            coin_res = await client.post(f"{rpc_url}/get_coin_record_by_name", json={"name": target_clean})
            if coin_res.status_code != 200 or not coin_res.json().get("success"): 
                raise HTTPException(status_code=404, detail="Target Coin not found")
            
            rec = coin_res.json()["coin_record"]
            my_puzzle_hash = clean_hash(rec.get("coin", {}).get("puzzle_hash", ""))
            parent_coin_id = clean_hash(rec.get("coin", {}).get("parent_coin_info", ""))
            target_amount = int(rec.get("coin", {}).get("amount", 0))

            br_res = await client.post(f"{rpc_url}/get_block_record_by_height", json={"height": block_height})
            if br_res.status_code != 200 or not br_res.json().get("success"): 
                raise HTTPException(status_code=404, detail="Block not found")
            br_data = br_res.json()["block_record"]
            block_ts = br_data.get("timestamp")
            header_hash = clean_hash(br_data.get("header_hash"))

            ar_res = await client.post(f"{rpc_url}/get_additions_and_removals", json={"header_hash": header_hash})
            additions = ar_res.json().get("additions", []) if ar_res.status_code == 200 and ar_res.json().get("success") else []
            removals = ar_res.json().get("removals", []) if ar_res.status_code == 200 and ar_res.json().get("success") else []

            raw_spent, raw_created = [], []
            connected_inputs = {target_clean} if mode == "spent" else {parent_coin_id}

            if mode == "created":
                for a in additions:
                    ac = a.get("coin", {})
                    if clean_hash(ac.get("parent_coin_info", "")) == parent_coin_id:
                        a_ph = clean_hash(ac.get("puzzle_hash", ""))
                        a_amt = int(ac.get("amount", 0))
                        a_id = calculate_coin_id(parent_coin_id, a_ph, a_amt)
                        if a_id: 
                            connected_inputs.add(a_id)

            all_removals_map = {}
            for r in removals:
                rc = r.get("coin", {})
                r_pinfo = clean_hash(rc.get("parent_coin_info", ""))
                r_ph = clean_hash(rc.get("puzzle_hash", ""))
                r_amt = int(rc.get("amount", 0))
                r_id = clean_hash(r.get("name", "")) or clean_hash(r.get("coin_record", {}).get("name", "")) or calculate_coin_id(r_pinfo, r_ph, r_amt)
                
                if not r_pinfo.startswith("0x000000000000000000000000000000"):
                    all_removals_map[r_id] = {"id": r_id, "pinfo": r_pinfo, "ph": r_ph, "mojo": r_amt}
                    if r_id in connected_inputs or r_pinfo in connected_inputs or r_ph == my_puzzle_hash:
                        connected_inputs.add(r_id)

            for r_id, rm in all_removals_map.items():
                if r_id in connected_inputs or rm["pinfo"] in connected_inputs:
                    connected_inputs.add(r_id)

            for r_id, rm in all_removals_map.items():
                if r_id in connected_inputs:
                    raw_spent.append({"id": r_id, "mojo": rm["mojo"], "puzzle_hash": rm["ph"], "change": False})

            for a in additions:
                ac = a.get("coin", {})
                a_pinfo = clean_hash(ac.get("parent_coin_info", ""))
                a_ph = clean_hash(ac.get("puzzle_hash", ""))
                a_amt = int(ac.get("amount", 0))
                a_id = calculate_coin_id(a_pinfo, a_ph, a_amt)

                if a_pinfo in connected_inputs or a_id == target_clean or a_pinfo.replace("0x", "") in {x.replace("0x", "") for x in connected_inputs}:
                    if a_amt == 0 and a_id and a_id != "0x":
                        cc = await client.post(f"{rpc_url}/get_coin_record_by_name", json={"name": a_id})
                        if cc.status_code == 200 and cc.json().get("success"):
                            a_amt = int(cc.json()["coin_record"]["coin"].get("amount", 0))
                    
                    parent_rm = all_removals_map.get(a_pinfo)
                    match_ph = parent_rm["ph"] if parent_rm else my_puzzle_hash
                    is_change = (a_ph == match_ph) and (a_id not in connected_inputs) and (a_id != target_clean if mode == "created" else True)
                    
                    raw_created.append({"id": a_id, "mojo": a_amt, "puzzle_hash": a_ph, "change": is_change})

            if not any(c["id"] == target_clean for c in raw_created):
                raw_created.append({"id": target_clean, "mojo": target_amount, "puzzle_hash": my_puzzle_hash, "change": False})

            # Очистка дубликатов по ID монеты
            raw_spent = list({s["id"]: s for s in raw_spent}.values())
            raw_created = list({c["id"]: c for c in raw_created}.values())

            # 🔥 БАГ-ФИКС: Исключаем любые монеты из списка созданных, если они уже есть в сожженных (spent)
            spent_ids = {s["id"] for s in raw_spent}
            raw_created = [c for c in raw_created if c["id"] not in spent_ids]

            # Формируем финальные плоские списки XCH монет для UI
            spent_coins = [{
                "id": s["id"], 
                "mojo": s["mojo"], 
                "puzzle_hash": s["puzzle_hash"], 
                "change": s["change"],
                "is_cat": False,
                "asset_type": "XCH",
                "amount_formatted": format_to_xch(s["mojo"])
            } for s in raw_spent]

            created_coins = [{
                "id": c["id"], 
                "mojo": c["mojo"], 
                "puzzle_hash": c["puzzle_hash"], 
                "change": c["change"],
                "is_cat": False,
                "asset_type": "XCH",
                "amount_formatted": format_to_xch(c["mojo"])
            } for c in raw_created]

            # Честный подсчет балансов для XCH
            spent_xch_sum = sum(s["mojo"] for s in spent_coins)
            created_xch_sum = sum(c["mojo"] for c in created_coins)

            # Сетевая комиссия в Chia — это дельта между всеми входами и выходами
            fee_mojo = max(0, spent_xch_sum - created_xch_sum)

            return {
                "success": True,
                "block_height": block_height,
                "timestamp": block_ts,
                "mode": mode,
                "is_cat_token": False,
                "indicator": "🌱",
                "extra_metadata": {
                    "is_asymmetric_ledger": False,
                    "delta_emission_mojo": 0,
                    "delta_emission_formatted": "0",
                    "asset_id": "0x00"
                },
                "bundle": {
                    "block": block_height,
                    "ts": block_ts,
                    "fee_formatted": format_to_xch(fee_mojo),
                    "spent": spent_coins,
                    "created": created_coins
                }
            }

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Ledger Tracker Error: {str(e)}")
