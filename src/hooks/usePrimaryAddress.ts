'use client'

import { useMemo } from "react"
import { useWalletSessionStore } from "@/store/useWalletSessessionStore"
import { useUserSettingsStore } from "@/providers/UserSettnigsProvider"
import { deriveWalletAddressData } from "@/lib/utils/chia-address"

export function usePrimaryAddress() {
  const unhardenedPkHex = useWalletSessionStore((state: any) => state.unhardenedPkHex)
  const isVerifying = useWalletSessionStore((state: any) => state.isVerifying)
  const isScreenLocked = useWalletSessionStore((state: any) => state.isScreenLocked)
  const network = useUserSettingsStore((state: any) => state.network)

  const address = useMemo(() => {
    if (isVerifying || isScreenLocked || !unhardenedPkHex) return ""
    return deriveWalletAddressData(unhardenedPkHex, 0, network).address
  }, [unhardenedPkHex, isVerifying, isScreenLocked, network])

  return {
    address,
    isLoaded: address !== "",
  }
}
