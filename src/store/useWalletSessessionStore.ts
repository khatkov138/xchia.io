'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

const isClient = typeof window !== 'undefined'
const dummyStorage = { getItem: () => null, setItem: () => { }, removeItem: () => { } }
const getSessionStorage = () => (isClient ? sessionStorage : dummyStorage)

interface WalletSessionStoreState {
  unhardenedPkHex: string
  isScreenLocked: boolean
  isVerifying: boolean
  noWalletMode: boolean
  expiresAt: number | null
  lastActivityAt: number | null
  activeIndexes: string
  _hasHydrated: boolean
  setHasHydrated: (state: boolean) => void
  startSession: (pkHex: string, timeoutMs: number) => void
  updateActivity: (timeoutMs: number) => void
  setScreenLocked: (status: boolean) => void
  setVerifying: (status: boolean) => void
  setNoWalletMode: (status: boolean) => void
  setActiveIndexes: (indexes: string) => void
  endSession: () => void
}

export const useWalletSessionStore = create<WalletSessionStoreState>()(
  persist(
    (set, get) => ({
      unhardenedPkHex: '',
      isScreenLocked: true,
      isVerifying: true,
      noWalletMode: false,
      expiresAt: null,
      lastActivityAt: null,
      activeIndexes: '',
      _hasHydrated: false,

      setHasHydrated: (state) => set({ _hasHydrated: state }),

      startSession: (pkHex, timeoutMs) => {
        const now = Date.now()
        set({
          unhardenedPkHex: pkHex,
          isScreenLocked: false,
          isVerifying: false,
          noWalletMode: false,
          lastActivityAt: now,
          expiresAt: now + timeoutMs,
          activeIndexes: ''
        })
      },

      updateActivity: (timeoutMs) => {
        if (!get().unhardenedPkHex) return
        const now = Date.now()
        set({
          lastActivityAt: now,
          expiresAt: now + timeoutMs
        })
      },

      setScreenLocked: (status) => set({ isScreenLocked: status }),
      setVerifying: (status) => set({ isVerifying: status }),
      setNoWalletMode: (status) => set({ noWalletMode: status }),

      setActiveIndexes: (indexes) => set({ activeIndexes: indexes }),

      endSession: () => set({
        unhardenedPkHex: '',
        isScreenLocked: true,
        isVerifying: false,
        noWalletMode: false,
        expiresAt: null,
        lastActivityAt: null,
        activeIndexes: ''
      })
    }),
    {
      name: 'xcha-active-session',
      storage: createJSONStorage(getSessionStorage),

      // 🚀 УМНЫЙ ПЕРЕХВАТЧИК ГИДРАТАЦИИ:
      // Вычисляется СИНХРОННО в первую миллисекунду нажатия F5
      merge: (persistedState: any, currentState) => {
        if (!persistedState) return currentState

        const now = Date.now()
        const expiresAt = persistedState.expiresAt ?? 0
        const hasPk = !!persistedState.unhardenedPkHex

        // Сессия РЕАЛЬНО жива, если есть ключи И время сессии еще не вышло
        const isSessionValid = hasPk && expiresAt > now

        return {
          ...currentState,
          ...persistedState,
          // 🔒 Если сессия валидна — замок НЕ нужен (false). Если протухла — жестко запираем (true)
          isScreenLocked: !isSessionValid,
        }
      },
      onRehydrateStorage: (state) => () => state?.setHasHydrated(true)
    }

  )
)
