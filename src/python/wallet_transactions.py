from fastapi import APIRouter, HTTPException, Query
from shared.config import get_network_config
from chia_rs import G1Element
from shared import get_wallet_pk_unhardened
from chia.wallet.puzzles.p2_delegated_puzzle_or_hidden_puzzle import puzzle_for_pk
from shared.chia_history_engine import build_atomic_history

tx_router = APIRouter(prefix="/api/wallet", tags=["Wallet Advanced Core Engine"])

@tx_router.get("/transactions")
async def get_wallet_transactions(
    publicKeyHex: str = Query(...),
    active_indexes: str = Query(...),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=10, ge=1, le=50, alias="perPage"), # Выровнен алиас с фронтендом perPage
    network: str = Query(..., pattern="^(mainnet|testnet11)$")
):
    try:
        cfg = get_network_config(network)
        hrp = "xch" if network == "mainnet" else "txch"
        master_pk = G1Element.from_bytes(bytes.fromhex(publicKeyHex.replace("0x", "")))
        
        try: 
            idxs = [int(i.strip()) for i in active_indexes.split(",") if i.strip().isdigit()]
        except: 
            raise HTTPException(status_code=400, detail="Invalid active_indexes format")
            
        if not idxs:
            return {"total_blocks": 0, "page": page, "per_page": per_page, "history": []}

        # Генерируем полный пул хэшей для всех деривированных адресов HD-кошелька (0 - 1000+)
        local_ph_list = []
        for i in idxs:
            wallet_pk = get_wallet_pk_unhardened(master_pk, i)
            local_ph_list.append(puzzle_for_pk(wallet_pk).get_tree_hash().hex().lower())

        # Передаем весь массив хэшей кошелька в общее ядро, is_wallet_mode=True
        # Ядро отдаст чистые, нетронутые бандлы со всей созданной сдачей
        result = await build_atomic_history(
            local_ph_list, cfg, hrp, page, per_page, is_wallet_mode=True
        )

        return {
            "total_blocks": result["total_blocks"],
            "page": page,
            "per_page": per_page,
            "history": result["history"]
        }
    except Exception as e: 
        raise HTTPException(status_code=500, detail=str(e))
