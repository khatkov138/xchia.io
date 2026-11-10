'use client'
import React, { useState } from "react"
import { Copy, Check, QrCode } from "lucide-react"

interface AddressHeaderProps {
  addr: string
  net: string
  titleExplorer: string
  onQrOpen: () => void
}

export function AddressHeader({ addr, net, titleExplorer, onQrOpen }: AddressHeaderProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(addr)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const renderHighlightedAddress = (address: string) => {
    if (!address || address.length <= 24) return address
    return (
      <>
        <span className="text-white font-black">{address.slice(0, 12)}</span>
        <span className="text-zinc-500 font-medium">{address.slice(12, -12)}</span>
        <span className="text-[#FF2E93] font-black">{address.slice(-12)}</span>
      </>
    )
  }

  return (
    <div className="p-5 bg-zinc-900/30 border border-zinc-900 rounded-[24px] space-y-3 font-mono text-[11px] text-left">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold text-[#FF2E93] uppercase bg-[#FF2E93]/10 px-2 py-0.5 rounded-md border border-[#FF2E93]/20">
          {titleExplorer} ({net.toUpperCase()})
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onQrOpen}
            className="p-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl active:scale-95 transition-all cursor-pointer"
          >
            <QrCode size={13} />
          </button>
          <button
            onClick={handleCopy}
            className={`p-2 border rounded-xl active:scale-95 transition-all cursor-pointer flex items-center justify-center ${
              copied 
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                : "bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>
        </div>
      </div>
      <p className="text-sm break-all select-all font-mono tracking-tight leading-relaxed">
        {renderHighlightedAddress(addr)}
      </p>
    </div>
  )
}
