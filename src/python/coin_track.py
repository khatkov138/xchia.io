import ssl
import httpx
from fastapi import APIRouter, HTTPException, Query, status
from shared.config import get_network_config

coin_track_router = APIRouter(prefix="/api/v1/coins", tags=["Coin Direct Audit Tracker"])

def clean_hash(h: str) -> str:
    """Приводит хэш к стандарту Chia RPC: строгий нижний регистр и обязательный префикс 0x."""
    cleaned = h.replace("0x", "").strip().lower()
    return f"0x{cleaned}" if cleaned else ""

def create_chia_ssl_context(cert_path: str, key_path: str) -> ssl.SSLContext:
    """Создает корректный SSL-контекст для работы с самоподписанными сертификатами Chia."""
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    ssl_context.load_cert_chain(certfile=cert_path, keyfile=key_path)
    return ssl_context

@coin_track_router.get("/track-coin")
async def track_coin(
    coin_id: str = Query(default=..., alias="coinId", description="ID монеты / Name (hex)"),
    network: str = Query(default=..., pattern="^(mainnet|testnet11)$", description="Сеть: mainnet или testnet11")
):
    """
    Высокоточный атомарный аудитор состояния конкретной монеты Coin ID в сети Chia.
    Связывает монету со Spend Bundle её создания и её траты через номера блоков.
    """
    try:
        clean_coin_id = clean_hash(coin_id)
        
        if len(clean_coin_id) != 66:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Параметр coinId должен быть валидным hex-хэшем (длиной 64 символа без учета 0x)!"
            )
        
        cfg = get_network_config(network)
        cert, key, rpc_url = cfg["crt"], cfg["key"], cfg["rpc_url"]

        # Создаем безопасный SSL контекст для Chia RPC
        ssl_context = create_chia_ssl_context(cert, key)

        async with httpx.AsyncClient(verify=ssl_context, timeout=5.0) as client:
            
            # ⛓️ Запрос состояния монеты в реестре ноды Chia
            coin_res = await client.post(
                f"{rpc_url}/get_coin_record_by_name",
                json={"name": clean_coin_id}
            )
            
            if coin_res.status_code == 200:
                coin_data = coin_res.json()
                if coin_data.get("success") and coin_data.get("coin_record"):
                    record = coin_data["coin_record"]
                    
                    confirmed_height = record.get("confirmed_block_index", 0)
                    spent_height = record.get("spent_block_index", 0)
                    is_spent = record.get("spent", False)
                    
                    # Определяем физический статус монеты
                    if confirmed_height == 0:
                        status_str = "PENDING"
                    elif is_spent:
                        status_str = "SPENT"
                    else:
                        status_str = "UNSPENT"

                    coin_details = record.get("coin", {})
                    parent_coin_id = coin_details.get("parent_coin_info", "")

                    return {
                        "success": True,
                        "coin_id": clean_coin_id,
                        "status": status_str,
                        "block_height": spent_height if is_spent else confirmed_height,
                        "amount_mojo": coin_details.get("amount", 0),
                        "puzzle_hash": coin_details.get("puzzle_hash", ""),
                        "parent_coin_info": clean_hash(parent_coin_id) if parent_coin_id else "",
                        
                        # 🎯 КАНОНИЧЕСКАЯ СВЯЗЬ: Передаем номера блоков как Bundle ID для фронтенд-ссылок /tx/
                        "created_bundle_id": str(confirmed_height) if confirmed_height > 0 else None,
                        "spent_bundle_id": str(spent_height) if is_spent else None,
                        
                        "timestamp": record.get("timestamp", None)
                    }

            # Если монета не найдена на ноде
            return {
                "success": False,
                "coin_id": clean_coin_id,
                "status": "NOT_FOUND",
                "block_height": None,
                "amount_mojo": None,
                "puzzle_hash": None,
                "parent_coin_info": None,
                "created_bundle_id": None,
                "spent_bundle_id": None,
                "timestamp": None
            }

    except httpx.HTTPError as he:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
            detail=f"Служба блокчейна недоступна. Ошибка RPC ноды: {str(he)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Внутренний сбой аудитора монет: {str(e)}"
        )
