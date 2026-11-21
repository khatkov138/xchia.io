export type ChiaNetwork = "mainnet" | "testnet11"

const SERVER_RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:3000"

export async function callChiaRpc<T = any>(
  network: ChiaNetwork,
  method: string,
  payload: Record<string, any> = {}
): Promise<T> {
  if (network === "testnet11") {
    throw new Error("Testnet11 временно отключён")
  }

  const isServer = typeof window === "undefined"
  const url = `https://api.coinset.org/${method}`

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(isServer ? { Origin: SERVER_RPC_URL } : {}),
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
