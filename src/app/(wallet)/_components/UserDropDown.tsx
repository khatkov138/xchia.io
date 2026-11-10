'use client'

import React, { useState, useRef, useEffect } from "react"
import { ChevronDown, Check, LogOut } from "lucide-react"
import { useNodesStatus } from "@/hooks/useNodesStatus"
import { useUserSettingsStore } from "@/providers/UserSettnigsProvider"
import { useWalletAuth } from "@/hooks/useWalletAuth"
import { useSecureStore } from "@/store/useSecureStore"
import { useWalletSessionStore } from "@/store/useWalletSessessionStore" 

export const UserDropdown = React.memo(function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const { hardResetWallet } = useWalletAuth() 
  const activePkHex = useWalletSessionStore((state) => state.unhardenedPkHex)
  const isScreenLocked = useWalletSessionStore((state) => state.isScreenLocked)
  
  const isSessionHydrated = useWalletSessionStore((state) => state._hasHydrated)
  const isSecureHydrated = useSecureStore((state) => state._hasHydrated)
  const isStoreHydrated = isSessionHydrated && isSecureHydrated

  const showLogout = isStoreHydrated && !!activePkHex && !isScreenLocked

  const network = useUserSettingsStore((state) => state.network)
  const currency = useUserSettingsStore((state) => state.currency)
  const setNetwork = useUserSettingsStore((state) => state.setNetwork)
  const setCurrency = useUserSettingsStore((state) => state.setCurrency)

  const isMainnet = network === 'mainnet'

  const { isPythonDown, networks } = useNodesStatus()
  const activeNodeStatus = networks[network] || { isLoading: true, isRpcDown: false, isConnecting: false, nodeData: null }
  const { nodeData, isRpcDown, isConnecting } = activeNodeStatus

  useEffect(() => { 
    setMounted(true) 
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  let ledClass = "bg-zinc-500 shadow-[0_0_5px_#71717a] animate-pulse"
  if (mounted) {
    if (isPythonDown || isRpcDown) {
      ledClass = "bg-[#FF2E93] shadow-[0_0_6px_#FF2E93]"
    } else if (isConnecting) {
      ledClass = "bg-amber-400 shadow-[0_0_6px_#fbbf24] animate-pulse"
    } else if (nodeData) {
      ledClass = nodeData.isSynced ? "bg-emerald-400 shadow-[0_0_6px_#34d399]" : "bg-zinc-500 shadow-[0_0_5px_#71717a] animate-pulse"
    }
  }

  const setNet = (nextNetwork: 'mainnet' | 'testnet11') => {
    if (network !== nextNetwork) setNetwork(nextNetwork)
    setIsOpen(false)
  }

  const handleLogout = () => {
    hardResetWallet()
    setIsOpen(false)
  }

  // 🔒 SAFE CLIENT SIDE SPACER
  if (!showLogout) {
    return <div className="w-[96px] h-[34px] shrink-0" />
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-800/80 text-zinc-300 font-bold text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-xl hover:border-zinc-700 hover:text-white active:scale-[0.97] cursor-pointer h-[34px] min-w-[96px] w-auto justify-between"
      >
        <span>{isMainnet ? 'Mainnet' : 'Testnet11'}</span>
        
        <span className={`h-1.5 w-1.5 rounded-full transition-all duration-300 shrink-0 ${ledClass}`} />
        
        <ChevronDown size={11} className={`text-zinc-500 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-[170px] bg-[#0c0c0e] border border-zinc-800 rounded-xl p-1 shadow-[0_12px_30px_rgba(0,0,0,0.6)] flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-100 z-50">
          {/* 🎯 TRANSLATED TO ENGLISH */}
          <div className="px-2 pt-1 pb-0.5 text-[8px] font-black text-zinc-600 tracking-wider uppercase">Network</div>

          <button
            type="button"
            onClick={() => setNet('mainnet')}
            className={`flex items-center justify-between w-full px-3.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider ${isMainnet ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-white hover:bg-zinc-900/40'}`}
          >
            <span>Mainnet</span>
            {isMainnet && <Check size={12} className="text-zinc-500" />}
          </button>

          <button
            type="button"
            onClick={() => setNet('testnet11')}
            className={`flex items-center justify-between w-full px-3.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider ${!isMainnet ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-white hover:bg-zinc-900/40'}`}
          >
            <span>Testnet11</span>
            {!isMainnet && <Check size={12} className="text-zinc-500" />}
          </button>

          <div className="border-t border-zinc-900/60 my-0.5" />
          {/* 🎯 TRANSLATED TO ENGLISH */}
          <div className="px-2 pt-1 pb-0.5 text-[8px] font-black text-zinc-600 tracking-wider uppercase">Display Currency</div>

          <button
            type="button"
            onClick={() => { setCurrency('USD'); setIsOpen(false); }}
            className={`flex items-center justify-between w-full px-3.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider ${currency === 'USD' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-white hover:bg-zinc-900/40'}`}
          >
            <span>USD ($)</span>
            {currency === 'USD' && <Check size={12} className="text-zinc-500" />}
          </button>

          <button
            type="button"
            onClick={() => { setCurrency('RUB'); setIsOpen(false); }}
            className={`flex items-center justify-between w-full px-3.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider ${currency === 'RUB' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-white hover:bg-zinc-900/40'}`}
          >
            <span>RUB (₽)</span>
            {currency === 'RUB' && <Check size={12} className="text-zinc-500" />}
          </button>

          <div className="border-t border-zinc-900/60 my-0.5" />
          {/* 🎯 TRANSLATED TO ENGLISH */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center justify-between w-full px-3.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider text-zinc-500 hover:text-white hover:bg-zinc-900/40"
          >
            <span>Log Out</span>
            <LogOut size={11} className="text-zinc-500" />
          </button>
        </div>
      )}
    </div>
  )
})
