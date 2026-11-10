import re
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

# 🔥 Используем ваши стопроцентно рабочие общие импорты
from shared.config import get_network_config
from chia.util.bech32m import decode_puzzle_hash, encode_puzzle_hash
from shared.chia_history_engine import build_atomic_history

router = APIRouter(prefix="/api/v1/search", tags=["Universal Search"])

BECH32M_REGEX = re.compile(r"^(xch|txch)1[a-z0-9]{58}$", re.IGNORECASE)
HEX64_REGEX = re.compile(r"^(0x)?[0-9a-fA-F]{64}$")

class SearchRedirectResponse(BaseModel):
    entity_type: str = Field(..., description="Тип сущности: block_height, address, block_hash, coin_id, puzzle_hash")
    redirect_url: str = Field(..., description="Относительный URL для фронтенда")

@router.get("", response_model=SearchRedirectResponse)
async def universal_search(
    query: str = Query(..., min_length=1, max_length=130, alias="q"),
    network: str = Query("mainnet", pattern="^(mainnet|testnet11)$")
):
    clean_query = query.strip()
    
    # --------------------------------------------------------------------------
    # 1. СЦЕНАРИЙ: Block Height (Число)
    # --------------------------------------------------------------------------
    if clean_query.isdigit():
        height = int(clean_query)
        # Так как высота — валидный формат для блока, отправляем фронт на проверку леджера
        return SearchRedirectResponse(
            entity_type="block_height",
            redirect_url=f"/explorer/{network}/block/{height}"
        )

    # --------------------------------------------------------------------------
    # 2. СЦЕНАРИЙ: Bech32m Адрес кошелька (xch1... / txch1...)
    # --------------------------------------------------------------------------
    if BECH32M_REGEX.match(clean_query):
        expected_prefix = "xch" if network == "mainnet" else "txch"
        if not clean_query.lower().startswith(expected_prefix):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Invalid address prefix for this network"
            )
        try:
            # Жестко валидируем адрес через внутреннюю либу Chia
            decode_puzzle_hash(clean_query)
            return SearchRedirectResponse(
                entity_type="address",
                redirect_url=f"/explorer/{network}/address/{clean_query.lower()}"
            )
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Bad Bech32m address format"
            )

    # --------------------------------------------------------------------------
    # 3. СЦЕНАРИЙ: 64-символьный Hex (Coin ID / Block Hash / Puzzle Hash)
    # --------------------------------------------------------------------------
    if HEX64_REGEX.match(clean_query):
        hex_hash = clean_query.replace("0x", "").lower()
        
        # Получаем сетевой конфиг и hrp через ваши дефолтные методы
        cfg = get_network_config(network)
        hrp = "xch" if network == "mainnet" else "txch"

        # Детектим природу хэша через ваше леджер-ядро истории.
        # Запрашиваем историю по этому хэшу. Если это Puzzle Hash адреса, 
        # то build_atomic_history вернет непустую историю или баланс.
        try:
            result = await build_atomic_history([hex_hash], cfg, hrp, page=1, per_page=1, is_wallet_mode=False)
            
            # Если по этому хэшу нашлись блоки или монеты в истории, это Puzzle Hash (Адрес)
            if result.get("total_blocks", 0) > 0 or len(result.get("history", [])) > 0:
                # Генерируем красивый Bech32m адрес из puzzle hash
                bech32_address = encode_puzzle_hash(bytes.fromhex(hex_hash), hrp)
                return SearchRedirectResponse(
                    entity_type="puzzle_hash",
                    redirect_url=f"/explorer/{network}/address/{bech32_address}"
                )
        except Exception:
            pass

        # Если это не puzzle hash, но формат верный (64 hex) — это Coin ID или Block Hash.
        # Отдаем фронту приоритетный тип coin_id, а фронтенд-роутер страницы деталей 
        # проверит статус монеты или упадет в блок-инфо.
        return SearchRedirectResponse(
            entity_type="coin_id",
            redirect_url=f"/explorer/{network}/coin/{hex_hash}"
        )

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid search query format"
    )
