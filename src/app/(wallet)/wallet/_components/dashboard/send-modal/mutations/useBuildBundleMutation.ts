import { useMutation } from "@tanstack/react-query"
import { useUserSettingsStore } from "@/providers/UserSettnigsProvider"
import { selectChiaCoins } from "../ChiaCoinSelection"
import { useSendModalContext } from "../SendModalContext"
import { useWalletDashboard } from "@/hooks/useWalletDashboard" // 🚀 Подключаем твой единый хук

export function useBuildBundleMutation() {
  const network = useUserSettingsStore((state) => state.network)
  const ctx = useSendModalContext()

  // 📡 Подключаем Single Source of Truth — реактивные монеты и адреса без getQueryData!
  const { unspentCoins, addresses } = useWalletDashboard()

  return useMutation({
    mutationKey: ["build-bundle"],
    mutationFn: async () => {
      const { targetAddress, amount, customFeeMojo } = ctx
      if (!targetAddress || !amount) throw new Error("Заполните адрес и сумму")

      // Валидируем и кастим введенную сумму в числа
      const xch = parseFloat(amount.trim().replace(",", "."))
      if (isNaN(xch) || xch <= 0) throw new Error("Введите корректную сумму")

      const totalMojosToSend = Math.round(xch * 1_000_000_000_000)
      const totalFeeMojos = parseInt(String(customFeeMojo || "").trim() || "0", 10)

      // 🚀 Селекция монет на базе реактивного массива из хука дашборда
      const selectedItems = selectChiaCoins(amount, unspentCoins)
      const accumulatedAmount = selectedItems.reduce((sum: number, item: any) => sum + item.coin.amount, 0)

      if (accumulatedAmount < totalMojosToSend) {
        throw new Error(`Недостаточно монет! Набрано: ${accumulatedAmount} / Требуется: ${totalMojosToSend} mojo`)
      }

      // Сопоставляем монеты с публичными ключами адресов деривации
      const inputs = selectedItems.map((item: any) => {
        const matched = addresses.find((a: any) => a.puzzle_hash.toLowerCase() === item.coin.puzzle_hash.toLowerCase())
        if (!matched?.address_pubkey_hex) throw new Error("Публичный ключ для подписи не найден")
        return { coin_pk_hex: matched.address_pubkey_hex, coin_to_spend: item.coin, wallet_index: item.wallet_index }
      })

      // Отправляем бандл на сборку контракта на бэкенд
      const res = await fetch("/api/v1/transactions/build-spend-bundle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          network,
          inputs,
          send_to_address: targetAddress.trim(),
          mojos_to_send: totalMojosToSend,
          fee_mojos: totalFeeMojos
        })
      })

      const result = await res.json()
      if (!res.ok || !result.success) throw new Error(result.detail || "Ошибка подготовки бандла")

      return { data: result, snapshot: { targetAddress: targetAddress.trim(), mojosToSend: totalMojosToSend } }
    },
    onSuccess: ({ data, snapshot }) => {
      ctx.setPreparedSpendData(data)
      ctx.setLocalSnapshot(snapshot)
      ctx.setStep(2)
      ctx.setStatusMessage("")
    },
    onError: (err: any) => {
      ctx.setStatusMessage(`❌ Ошибка подготовки: ${err.message}`)
      ctx.setLocalSnapshot(null)
    }
  })
}
