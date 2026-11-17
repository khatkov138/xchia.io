'use client'

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { Droplets, Wallet, CheckCircle2, AlertCircle, Loader2, ExternalLink, Copy, Check } from "lucide-react"
import { validateChiaAddress } from "@/lib/utils/chia-validator"

export function FaucetClient() {
  const [address, setAddress] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const [txId, setTxId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [faucetInfo, setFaucetInfo] = useState<{ address: string | null; balance_mojo: number }>({
    address: null,
    balance_mojo: 0,
  })



  useEffect(() => {
    fetch("/api/v2/faucet")
      .then((r) => r.json())
      .then((d) => { if (d?.address) setFaucetInfo(d) })
      .catch(() => { })
  }, [])

  const handleCopy = () => {
    if (!faucetInfo.address) return
    navigator.clipboard.writeText(faucetInfo.address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg("")
    const cleanAddr = address.trim().toLowerCase()

    const check = validateChiaAddress(cleanAddr, "testnet11")
    if (!check.isValid) {
      setStatus("error")
      setErrorMsg(check.error || "Invalid txch1... address")
      return
    }

    if (faucetInfo.address && cleanAddr === faucetInfo.address.toLowerCase()) {
      setStatus("error")
      setErrorMsg("Cannot send to the faucet treasury address itself")
      return
    }


    setStatus("loading")
    try {
      const res = await fetch("/api/v2/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: cleanAddr }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Faucet error")

      setTxId(data.txId || null)
      setStatus("success")
    } catch (err: any) {
      setStatus("error")
      setErrorMsg(err.message)
    }
  }

  return (
    <div className="w-full py-10 lg:py-16 text-left space-y-10 selection:bg-[#FF2E93]/30">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[9px] font-bold text-zinc-400">
            <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" /> TESTNET11 DEVELOPER FAUCET
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.05]">
            Request Testnet <br />
            <span className="bg-gradient-to-r from-[#FF2E93] to-[#8B5CF6] bg-clip-text text-transparent">TXCH</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-medium">
            Instant Testnet11 funds for Chialisp developers, smart coin debugging, and wallet testing.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 font-mono">
          <div className="px-4 py-3 rounded-2xl bg-[#0B0B0E] border border-white/[0.06]">
            <p className="text-[9px] font-bold text-zinc-500 uppercase">Drip Amount</p>
            <p className="text-sm font-black text-emerald-400 mt-0.5">0.5 TXCH</p>
          </div>
          <div className="px-4 py-3 rounded-2xl bg-[#0B0B0E] border border-white/[0.06]">
            <p className="text-[9px] font-bold text-zinc-500 uppercase">Cooldown</p>
            <p className="text-sm font-black text-white mt-0.5">24 HOURS</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <form onSubmit={handleSubmit} className="lg:col-span-7 bg-[#0B0B0E]/90 border border-white/[0.06] rounded-[28px] p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="space-y-2.5">
            <div className="flex flex-wrap justify-between items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
              <span className="text-zinc-400">Receiver Address (Testnet11)</span>
              <Link href="/wallet" className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 transition">
                <Wallet size={12} /> Don’t have a wallet? Create one →
              </Link>
            </div>
            <input
              type="text"
              value={address}
              onChange={(e) => { setAddress(e.target.value); if (status !== "idle") setStatus("idle") }}
              placeholder="txch1..."

              spellCheck={false}
              className="w-full font-mono text-xs text-white bg-zinc-950 border border-white/[0.08] focus:border-[#FF2E93]/60 p-4 rounded-xl placeholder:text-zinc-600 focus:outline-none transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <button
              type="submit"
              disabled={status === "loading"}
              className="px-6 py-3.5 bg-white hover:bg-zinc-200 disabled:opacity-50 text-zinc-950 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer active:scale-98 shadow-lg shadow-white/5"
            >
              {status === "loading" ? <><Loader2 size={14} className="animate-spin" /> Broadcasting...</> : <><Droplets size={14} className="text-[#FF2E93]" /> Get 0.5 TXCH</>}
            </button>
            <span className="text-[11px] text-zinc-500">Confirms in <span className="text-zinc-300 font-medium">15–40 sec</span></span>
          </div>

          {status === "error" && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2.5 text-xs text-red-400">
              <AlertCircle size={15} className="shrink-0" /> <span>{errorMsg}</span>
            </div>
          )}

          {status === "success" && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <CheckCircle2 size={15} /> <span>0.5 TXCH submitted to mempool!</span>
              </div>
              {txId && (
                <Link href={`/en/explorer/testnet11/address/${address.trim().toLowerCase()}`} className="flex items-center justify-between text-[11px] font-mono text-zinc-400 hover:text-white pt-2 border-t border-emerald-500/15">
                  <span className="truncate max-w-[360px]">TxID: {txId}</span>
                  <ExternalLink size={12} className="text-emerald-400 shrink-0" />
                </Link>
              )}
            </div>
          )}
        </form>

        <aside className="lg:col-span-5 bg-[#0B0B0E]/90 border border-white/[0.06] rounded-[28px] p-6 sm:p-7 space-y-5 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-tight text-white">XCH<span className="text-[#FF2E93]">IA</span></span>
              <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase">FAUCET RESERVE</span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Online
            </span>
          </div>

          <div className="py-1">
            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Available Liquidity</p>
            <p className="text-2xl font-black text-white font-mono mt-0.5">
              {(faucetInfo.balance_mojo / 1e12).toFixed(4)} <span className="text-zinc-400 text-base font-bold">TXCH</span>
            </p>
          </div>

          {faucetInfo.address && (
            <div className="p-3.5 rounded-xl bg-zinc-950 border border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                <span>Faucet Treasury Address</span>
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={handleCopy} className="px-2 py-0.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition flex items-center gap-1 cursor-pointer">
                    {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                  <Link href={`/en/explorer/testnet11/address/${faucetInfo.address}`} className="px-2 py-0.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition flex items-center gap-1">
                    <span>Explorer</span>
                    <ExternalLink size={10} />
                  </Link>
                </div>
              </div>
              <p className="font-mono text-[11px] text-zinc-300 break-all leading-relaxed">{faucetInfo.address}</p>
            </div>
          )}

          <div className="pt-3 border-t border-white/[0.06] space-y-2.5 text-[11px] text-zinc-400">
            <div className="flex items-center justify-between"><span>Rate limit</span><span className="text-zinc-200 font-mono">1 request / 24h</span></div>
            <div className="flex items-center justify-between"><span>Network</span><span className="text-zinc-200 font-mono">Chia Testnet11</span></div>
            <div className="flex items-center justify-between"><span>Token value</span><span className="text-zinc-200 font-mono">Zero (Testing only)</span></div>
          </div>
        </aside>
      </div>
    </div>
  )
}
