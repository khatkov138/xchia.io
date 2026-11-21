import { callChiaRpc, ChiaNetwork } from '@/lib/utils/chia-rpc-client';
import { NextResponse } from 'next/server';


const CACHE_TTL_MS = 12_000;
const STALE_GRACE_MS = 30_000;

async function fetchSingleNode(network: ChiaNetwork) {
  const updatedAt = Date.now();
  const downState = {
    isRpcDown: true,
    isNotSynced: false,
    isConnecting: false,
    hasError: true,
    isLoading: false,
    nodeData: null,
  };

  try {
    const stateRes = await callChiaRpc(network, 'get_blockchain_state');
    const st = stateRes?.blockchain_state;
    if (!st) return downState;

    const sync = st.sync ?? {};
    const isSyncingMode = Boolean(sync.sync_mode);
    const isSynced = !isSyncingMode && Boolean(sync.synced);
    const isConnecting = !isSynced && !isSyncingMode;

    const currentHeight = Number(isSyncingMode ? sync.sync_progress_height : st.peak?.height) || 0;
    const tipHeight = Number(sync.sync_tip_height) || 0;
    const targetHeight = tipHeight > 0 ? tipHeight : currentHeight;

    const progressPercent = isSynced
      ? '100.0000'
      : !isConnecting && targetHeight > 0
        ? ((currentHeight / targetHeight) * 100).toFixed(4)
        : '0.0000';

    return {
      isRpcDown: false,
      isNotSynced: !isSynced,
      isConnecting,
      hasError: false,
      isLoading: false,
      nodeData: {
        network,
        isSynced,
        isSyncingMode,
        isConnecting,
        currentHeight,
        targetHeight,
        progressPercent,
        difficulty: Number(st.difficulty) || 0,
        networkSpaceTib: String(st.space ?? '0'),
        mempoolSize: Number(st.mempool_size) || 0,
        peakTime: st.peak?.timestamp ? Number(st.peak.timestamp) * 1000 : updatedAt,
        peersList: [],
        totalPeers: 0,
        updatedAt,
      },
    };
  } catch {
    return downState;
  }
}

let cache: { data: any; timestamp: number } | null = null;
let inFlight: Promise<any> | null = null;

export async function GET() {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cache.data);
  }

  if (!inFlight) {
    inFlight = (async () => {
      try {
        const [mainnet, testnet11] = await Promise.all([
          fetchSingleNode('mainnet'),
          fetchSingleNode('testnet11'),
        ]);

        if (mainnet.isRpcDown && testnet11.isRpcDown && cache && Date.now() - cache.timestamp < STALE_GRACE_MS) {
          return cache.data;
        }

        const payload = { networks: { mainnet, testnet11 } };
        cache = { data: payload, timestamp: Date.now() };
        return payload;
      } finally {
        inFlight = null;
      }
    })();
  }

  return NextResponse.json(await inFlight);
}
