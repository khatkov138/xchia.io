import ssl
import httpx
from fastapi import HTTPException
from chia_rs import Coin
from chia.util.bech32m import encode_puzzle_hash

def parse_coin(r: dict, hrp: str) -> dict:
    entry = r.get("coin_record", {}) if "coin_record" in r else r
    c_data = entry.get("coin", {}) or r.get("coin", {}) or {}
    amt = int(c_data.get("amount", 0))
    ph = str(c_data.get("puzzle_hash", "")).replace("0x", "").lower()
    p_id = str(c_data.get("parent_coin_info", "").replace("0x", "")).lower()
    c_blk = int(entry.get("confirmed_block_index", 0) or entry.get("confirmed_block", 0) or r.get("confirmed_block_index", 0) or 0)
    s_blk = int(entry.get("spent_block_index", 0) or entry.get("spent_block", 0) or r.get("spent_block_index", 0) or 0)
    spent = bool(entry.get("spent") or entry.get("is_spent") or s_blk > 0)
    cid = str(r.get("name") or entry.get("name") or "").replace("0x", "").lower()
    if len(cid) != 64 and len(p_id) == 64 and len(ph) == 64:
        try: cid = Coin(bytes.fromhex(p_id), bytes.fromhex(ph), amt).name().hex().lower()
        except Exception: pass
    addr = None
    if len(ph) == 64:
        try: addr = encode_puzzle_hash(bytes.fromhex(ph), hrp)
        except Exception: pass
    return {"id": cid, "pid": p_id, "ph": ph, "addr": addr, "amt_m": amt, "c_blk": c_blk, "s_blk": s_blk, "ts": int(entry.get("timestamp", 0) or r.get("timestamp", 0) or 0), "spent": spent}

async def build_atomic_history(target_puzzle_hashes: list[str], cfg: dict, hrp: str, page: int, per_page: int, is_wallet_mode: bool = False):
    ctx = ssl.create_default_context()
    ctx.check_hostname, ctx.verify_mode = False, ssl.CERT_NONE
    if cfg.get("crt") and cfg.get("key"): ctx.load_cert_chain(certfile=cfg["crt"], keyfile=cfg["key"])
    clean_hashes = [ph.replace("0x", "").lower() for ph in target_puzzle_hashes if len(ph.replace("0x", "")) == 64]
    if not clean_hashes: return {"balance_mojo": 0, "total_blocks": 0, "history": []}
    local_ph_set = set(clean_hashes)

    async with httpx.AsyncClient(verify=ctx, timeout=30.0) as client:
        if is_wallet_mode:
            res = await client.post(f"{cfg['rpc_url']}/get_coin_records_by_puzzle_hashes", json={"puzzle_hashes": [f"0x{ph}" for ph in local_ph_set], "include_spent_coins": True, "start_height": 0})
        else:
            res = await client.post(f"{cfg['rpc_url']}/get_coin_records_by_puzzle_hash", json={"puzzle_hash": f"0x{list(local_ph_set)[0]}", "include_spent_coins": True})
        if res.status_code != 200 or not res.json().get("success"): raise HTTPException(status_code=520, detail="RPC error")

        activity_blocks, parsed_coins, bal_m = set(), [], 0
        for r in res.json().get("coin_records", []):
            p = parse_coin(r, hrp)
            if len(p["id"]) != 64: continue
            parsed_coins.append(p)
            if not p["spent"] and p["ph"] in local_ph_set: bal_m += p["amt_m"]
            if p["c_blk"] > 0: activity_blocks.add(p["c_blk"])
            if p["s_blk"] > 0: activity_blocks.add(p["s_blk"])

        sorted_blocks = sorted(list(activity_blocks), reverse=True)
        paginated_blocks = sorted_blocks[(page - 1) * per_page : page * per_page]
        if not paginated_blocks: return {"balance_mojo": bal_m, "total_blocks": len(sorted_blocks), "history": []}

        our_spent_in_page = [c for c in parsed_coins if c["spent"] and c["s_blk"] in paginated_blocks]
        all_inputs_by_parent, children_by_parent = {}, {}

        if our_spent_in_page:
            parent_ids = list(set(f"0x{sc['pid']}" for sc in our_spent_in_page if sc["pid"] != "0"*64))
            if parent_ids:
                p_res = await client.post(f"{cfg['rpc_url']}/get_coin_records_by_parent_ids", json={"parent_ids": parent_ids, "include_spent_coins": True})
                if p_res.status_code == 200 and p_res.json().get("success"):
                    for r in p_res.json().get("coin_records", []):
                        p_coin = parse_coin(r, hrp)
                        if p_coin["spent"] and p_coin["s_blk"] in paginated_blocks:
                            all_inputs_by_parent.setdefault(f"{p_coin['s_blk']}_{p_coin['pid']}", []).append(p_coin)

            all_resolved_input_ids = set()
            for sc in our_spent_in_page:
                for sib in all_inputs_by_parent.get(f"{sc['s_blk']}_{sc['pid']}", [sc]): all_resolved_input_ids.add(sib["id"])

            if all_resolved_input_ids:
                c_res = await client.post(f"{cfg['rpc_url']}/get_coin_records_by_parent_ids", json={"parent_ids": [f"0x{cid}" for cid in all_resolved_input_ids], "include_spent_coins": True})
                if c_res.status_code == 200 and c_res.json().get("success"):
                    for r in c_res.json().get("coin_records", []):
                        ch = parse_coin(r, hrp)
                        children_by_parent.setdefault(ch["pid"], []).append(ch)

        history = []
        for blk in paginated_blocks:
            received_coins = [c for c in parsed_coins if c["c_blk"] == blk]
            spent_coins = [c for c in parsed_coins if c["spent"] and c["s_blk"] == blk]
            if not received_coins and not spent_coins: continue
            blk_entry = {"block": blk, "ts": received_coins[0]["ts"] if received_coins else spent_coins[0]["ts"]}
            
            if received_coins:
                received_coins.sort(key=lambda x: x["amt_m"], reverse=True)
                blk_entry["received"] = [{"id": rc["id"], "pid": rc["pid"], "mojo": rc["amt_m"], "type": "COINBASE" if rc["pid"] == "0"*64 else "RECEIVE", "puzzle_hash": f"0x{rc['ph']}", "addr": rc["addr"]} for rc in received_coins]

            if spent_coins:
                inputs_map, outputs_map = {}, {}
                for sc in spent_coins:
                    full_inputs = all_inputs_by_parent.get(f"{blk}_{sc['pid']}", [sc])
                    for ip in full_inputs:
                        inputs_map[ip["id"]] = ip
                        for op in children_by_parent.get(ip["id"], []): outputs_map[op["id"]] = op

                inputs_list = list(inputs_map.values())
                outputs_list = list(outputs_map.values())

                # 🚀 ЖЕСТКАЯ ПРОВЕРКА НА НАЛИЧИЕ ЧУЖИХ АДРЕСОВ В КОРЗИНЕ ТРАТ
                unique_spent_phs = set(i["ph"] for i in inputs_list if i.get("ph"))
                has_foreign_inputs = any(i["ph"] not in local_ph_set for i in inputs_list)
                
                # Тултип SET зажжётся только если есть реально чужие коины или трата идёт с разных ph пула
                is_bundle = has_foreign_inputs or len(unique_spent_phs) > 1

                total_in = sum(i["amt_m"] for i in inputs_list)
                total_out = sum(o["amt_m"] for o in outputs_list)
                fee_m = max(0, total_in - total_out)
                if fee_m > 5_000_000_000_000 or is_bundle: fee_m = 0

                inputs_list.sort(key=lambda x: x["amt_m"], reverse=True)
                outputs_list.sort(key=lambda x: x["amt_m"], reverse=True)

                blk_entry["sent"] = [{
                    "fee_mojo": fee_m, "is_bundle": is_bundle,
                    "spent": [{"id": i["id"], "mojo": i["amt_m"], "addr": i["addr"], "puzzle_hash": f"0x{i['ph']}"} for i in inputs_list],
                    "created": [{"id": o["id"], "mojo": o["amt_m"], "addr": o["addr"], "puzzle_hash": f"0x{o['ph']}", "change": o["ph"] in local_ph_set} for o in outputs_list]
                }]
            history.append(blk_entry)

        return {"balance_mojo": bal_m, "total_blocks": len(sorted_blocks), "history": history}
