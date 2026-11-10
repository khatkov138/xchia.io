'use client'

import React from "react"
import { ShieldAlert } from "lucide-react"
import { StatusHeader } from "./StatusHeader"
import { StatusMetrics } from "./StatusMetrics"
import { LiveTicker } from "./LiveTicker"
import { TrafficMiniList } from "./TrafficMiniList"

interface PeerInfo {
  ip: string
  port: number
  trafficUpMb: string
  trafficDownMb: string
}

// 🎯 Жестко прописываем типы полей, которые нам теперь гарантированно отдает хук useNodesStatus
interface DerivedNodeStatus {
  network: string
  isSynced: boolean;
  isSyncingMode: boolean;
  isConnecting: boolean;
  currentHeight: number;
  targetHeight: number;
  progressPercent: string;
  difficulty: number;
  networkSpaceTib: string;
  peakTime: string | number | null; 
  mempoolSize: number;
  peersList: any[];
  totalPeers: number;
  blockchain_state?: any;
  updatedAt: number;
}

interface NetworkStatusCardProps {
  networkName: string
  nodeData: DerivedNodeStatus | null // 👈 Принимаем чистый плоский объект из хука
  isRpcDown: boolean
}

export function NetworkStatusCard({ networkName, nodeData, isRpcDown }: NetworkStatusCardProps) {
  // 🛰️ ВЕРИМ ТОЛЬКО ЧИСТЫМ ПЛОСКИМ ПОЛЯМ ИЗ ХУКА — БЕЗ ЛИШНЕГО ГЛУБОКОГО ПАРСИНГА
  const currentHeight = nodeData?.currentHeight ?? 0
  const targetHeight = nodeData?.targetHeight ?? 0
  const progressPercent = nodeData?.progressPercent || "0"
  const isSynced = nodeData?.isSynced ?? false
  const isConnecting = nodeData?.isConnecting ?? false
  const totalPeers = nodeData?.totalPeers ?? 0
  const rawBlockchainState = nodeData?.blockchain_state ?? null

  // Чистый и точный расчет остатка блоков
  const blocksLeft = targetHeight > currentHeight ? targetHeight - currentHeight : 0

  return (
    <div className="w-full h-auto flex flex-col justify-between bg-[#0c0c0e] border border-zinc-900 rounded-[24px] p-5 shadow-2xl relative overflow-hidden text-[9px] text-zinc-400 selection:bg-[#FF2E93]/30 pb-5">

      <StatusHeader
        network={networkName}
        isRpcDown={isRpcDown}
        isConnecting={isConnecting}
        isSynced={isSynced}
      />

      {isRpcDown ? (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 flex-1 justify-center">
          <div className="h-8 w-8 rounded-[18px] bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
            <ShieldAlert size={14} />
          </div>
          <p className="text-white font-bold text-[9px] uppercase tracking-wider">Шлюз RPC недоступен</p>
          <p className="text-zinc-600 max-w-[200px] leading-relaxed text-[8px] font-medium">
            Локальный демон Chia Full Node выключен или запускается.
          </p>
        </div>
      ) : (
        <div className="space-y-4 relative z-10 flex-1 flex flex-col justify-between mt-4">
          
          <StatusMetrics
            currentHeight={currentHeight}
            targetHeight={targetHeight}
            isSynced={isSynced}
            peers={totalPeers}
            rawState={rawBlockchainState}
            blocksLeft={blocksLeft}
          />

          <LiveTicker
            isSynced={isSynced}
            isConnecting={isConnecting}
            cleanPercent={parseFloat(progressPercent).toFixed(2)}
          />

          <TrafficMiniList peers={nodeData?.peersList || []} />
        </div>
      )}
    </div>
  )
}
