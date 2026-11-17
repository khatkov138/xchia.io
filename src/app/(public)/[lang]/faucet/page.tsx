import type { Metadata } from "next"
import { FaucetClient } from "./FaucetClient"

export const metadata: Metadata = {
  title: "Chia Testnet11 Faucet — Get Free TXCH | XCHIA",
  description: "Free Chia Testnet11 faucet for developers. Get instant TXCH test coins for Chialisp and XCHIA Web Wallet.",
}
export const instant = false

export default function FaucetPage() {
  return <FaucetClient />
}
