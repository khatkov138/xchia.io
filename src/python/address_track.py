from fastapi import APIRouter, HTTPException, Query
from shared.config import get_network_config
from chia.util.bech32m import decode_puzzle_hash, encode_puzzle_hash
from shared.chia_history_engine import build_atomic_history

address_router = APIRouter(prefix="/api/v1/addresses", tags=["Address Universal Core Explorer"])

@address_router.get("/track-address")
async def track_address(
    puzzle_hash: str = Query(default=..., alias="puzzleHash"),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=10, ge=1, le=50, alias="perPage"),
    network: str = Query(default=..., pattern="^(mainnet|testnet11)$")
):
    val = puzzle_hash.strip()
    if val.startswith(("xch", "txch")):
        try: clean_ph = decode_puzzle_hash(val).hex().lower()
        except Exception: raise HTTPException(status_code=400, detail="Bad address")
    else:
        clean_ph = val.replace("0x", "").lower()
        if len(clean_ph) != 64: raise HTTPException(status_code=400, detail="Bad ph")

    cfg = get_network_config(network)
    hrp = "xch" if network == "mainnet" else "txch"

    # Передаем массив из одного PH, из которого ядро выцепит нужный коин-лист
    result = await build_atomic_history([clean_ph], cfg, hrp, page, per_page, is_wallet_mode=False)

    return {
        "address": encode_puzzle_hash(bytes.fromhex(clean_ph), hrp),
        "balance_mojo": result["balance_mojo"],
        "total_blocks": result["total_blocks"],
        "page": page,
        "per_page": per_page,
        "history": result["history"]
    }
