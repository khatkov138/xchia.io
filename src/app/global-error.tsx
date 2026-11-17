'use client'

import React from "react"
import { ShieldAlert } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en" className="dark bg-zinc-950 text-white">
      <body className="w-full min-h-screen bg-zinc-950 font-sans flex flex-col items-center justify-center p-6 text-center antialiased">
        <div className="max-w-xs space-y-6">
          <div className="mx-auto h-12 w-12 bg-[#FF2E93]/10 border border-[#FF2E93]/20 rounded-full flex items-center justify-center text-[#FF2E93]">
            <ShieldAlert size={22} />
          </div>

          <div className="space-y-2">
            <h1 className="text-lg font-black uppercase tracking-tight text-white">
              Critical Core Crash
            </h1>
            <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">
              The root layout system has encountered an unhandled exception. Immediate recovery action is recommended.
            </p>
          </div>

          <button
            onClick={() => reset()}
            className="w-full text-[11px] font-black uppercase bg-white text-zinc-950 py-3.5 rounded-xl hover:bg-zinc-200 transition-all cursor-pointer shadow-lg shadow-white/5"
          >
            Force App Reload
          </button>
        </div>
      </body>
    </html>
  )
}
