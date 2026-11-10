'use client'
import React, { useState, useEffect } from "react"
import QRCode from "qrcode"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface QrDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  addr: string
  qrTitle: string
  loadingText: string
}

export function AddressQrDialog({ isOpen, onOpenChange, addr, qrTitle, loadingText }: QrDialogProps) {
  const [qrSvg, setQrSvg] = useState<string>("")

  useEffect(() => {
    if (isOpen && addr) {
      QRCode.toString(addr, { type: "svg", margin: 0, color: { dark: "#ffffff", light: "#00000000" } }, (err, string) => {
        if (!err && string) setQrSvg(string)
      })
    }
  }, [isOpen, addr])

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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border border-zinc-800 text-zinc-100 max-w-[280px] rounded-[24px] p-6 font-mono text-[11px] flex flex-col items-center">
        <DialogHeader className="w-full mb-2">
          <DialogTitle className="text-xs font-bold uppercase text-zinc-400 tracking-wider text-center">
            {qrTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="w-[180px] h-[180px] flex items-center justify-center relative select-none">
          {qrSvg ? (
            <div className="w-full h-full [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          ) : (
            <div className="text-zinc-500 text-[10px] font-bold animate-pulse uppercase">{loadingText}</div>
          )}
        </div>

        <p className="text-[9px] tracking-wider text-center mt-5 break-all max-w-[220px] select-all leading-normal">
          {renderHighlightedAddress(addr)}
        </p>
      </DialogContent>
    </Dialog>
  )
}
