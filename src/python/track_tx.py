import ssl
import httpx
from fastapi import APIRouter, HTTPException, Query
from shared.config import get_network_config

tx_track_router = APIRouter(prefix="/api/v1/transactions", tags=["Transactions Tracker Engine"])

def clean_hash(h: str) -> str: 
    return f"0x{str(h).replace('0x', '').strip().lower()}" if h and str(h).replace('0x', '').strip() else ""

def create_chia_ssl_context(c: str, k: str) -> ssl.SSLContext:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    ctx.load_cert_chain(certfile=c, keyfile=k)
    return ctx

@tx_track_router.get("/track-tx")
async def track_tx(
    txId: str = Query(...), 
    targetCoinId: str = Query(...), 
    network: str = Query(..., pattern="^(mainnet|testnet11)$")
):
    try:
        cfg = get_network_config(network)
        ssl_context = create_chia_ssl_context(cfg["crt"], cfg["key"])
        rpc_url = cfg["rpc_url"]
        
        clean_tx_id = clean_hash(txId)
        clean_coin_id = clean_hash(targetCoinId)

        async with httpx.AsyncClient(verify=ssl_context, timeout=8.0) as client:
            # 1. Чек мемпула
            mempool_res = await client.post(f"{rpc_url}/get_mempool_item_by_tx_id", json={"tx_id": clean_tx_id})
            if mempool_res.status_code == 200 and mempool_res.json().get("success"):
                return {"success": True, "status": "IN_MEMPOOL", "block_height": None}

            # 2. Чек блокчейна (если из мемпула уже улетело в блок)
            coin_res = await client.post(f"{rpc_url}/get_coin_record_by_name", json={"name": clean_coin_id})
            if coin_res.status_code == 200 and coin_res.json().get("success"):
                coin_record = coin_res.json().get("coin_record", {})
                if coin_record:
                    block_height = coin_record.get("confirmed_block_index", 0)
                    return {"success": True, "status": "CONFIRMED", "block_height": block_height}

            return {"success": True, "status": "PENDING_NODE", "block_height": None}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка трекинга Chia: {str(e)}")
