export type ChiaNetwork = "mainnet" | "testnet11"

// На проде просто пропишешь в .env: NEXT_PUBLIC_RPC_URL=https://xchia.io
const RPC_BASE_URL = process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:3000"

export async function callChiaRpc<T = any>(
  network: ChiaNetwork,
  method: string,
  payload: Record<string, any> = {}
): Promise<T> {
   const res = await fetch(`${RPC_BASE_URL}/api/rpc/${network}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(typeof window === "undefined" ? { Origin: RPC_BASE_URL } : {}),
    },
    body: JSON.stringify(payload),
  })


  if (!res.ok) {
    throw new Error(`RPC Error [${network}/${method}]: HTTP ${res.status}`)
  }

  const data = await res.json()
  if (data.success === false) {
    throw new Error(data.error || `Chia Node Error in ${method}`)
  }

  return data as T
}
