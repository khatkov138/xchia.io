import { NextResponse } from 'next/server';
import https from 'node:https';
import fs from 'node:fs';
import { LIMITS, NODES, Network } from '@/app/api/rpc/[network]/[method]/config';

const agents: Partial<Record<Network, https.Agent>> = {};

function getAgent(network: Network): https.Agent {
  if (!agents[network]) {
    const node = NODES[network];
    agents[network] = new https.Agent({
      cert: fs.readFileSync(node.cert),
      key: fs.readFileSync(node.key),
      rejectUnauthorized: false,
      keepAlive: true,
    });
  }
  return agents[network]!;
}

function callLocalNode(network: Network, method: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({});
    const req = https.request(
      {
        hostname: '127.0.0.1',
        port: NODES[network].port,
        path: `/${method}`,
        method: 'POST',
        agent: getAgent(network),
        timeout: LIMITS.NODE_TIMEOUT_MS,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error('Invalid JSON from node'));
          }
        });
      }
    );
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function fetchSingleNode(network: Network) {
  const updatedAt = Date.now();
  try {
    const [stateRes, connRes] = await Promise.all([
      callLocalNode(network, 'get_blockchain_state'),
      callLocalNode(network, 'get_connections').catch(() => ({ connections: [] })),
    ]);

    const st = stateRes?.blockchain_state;
    if (!st) {
      return { isRpcDown: true, isNotSynced: false, isConnecting: false, hasError: true, isLoading: false, nodeData: null };
    }

    const peersList = (connRes?.connections ?? [])
      .filter((c: any) => c.type === 1)
      .map((c: any) => ({
        ip: c.peer_host || 'unknown',
        port: Number(c.peer_port || 8444),
        trafficDownMb: (Number(c.bytes_read || 0) / 1048576).toFixed(2),
        trafficUpMb: (Number(c.bytes_written || 0) / 1048576).toFixed(2),
      }));

    const sync = st.sync || { synced: false, sync_mode: false };
    const isSyncingMode = Boolean(sync.sync_mode);
    const hasNoPeers = peersList.length === 0;
    const isConnecting = !isSyncingMode && hasNoPeers;

    const currentHeight = isSyncingMode
      ? Number(sync.sync_progress_height ?? 0)
      : Number(st.peak?.height ?? 0);

    const tipHeight = Number(sync.sync_tip_height ?? 0);
    const targetHeight = tipHeight > 0 ? tipHeight : currentHeight;

    let progressPercent = '100.0000';
    if (!sync.synced) {
      progressPercent =
        !isConnecting && targetHeight > 0
          ? ((currentHeight / targetHeight) * 100).toFixed(4)
          : '0.0000';
    }

    const isSynced = !isConnecting && !isSyncingMode && Boolean(sync.synced);

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
        difficulty: Number(st.difficulty ?? 0),
        networkSpaceTib: String(st.space ?? '0'),
        mempoolSize: Number(st.mempool_size ?? 0),
        peakTime: updatedAt,
        peersList,
        totalPeers: peersList.length,
        blockchain_state: st,
        updatedAt,
      },
    };
  } catch {
    return { isRpcDown: true, isNotSynced: false, isConnecting: false, hasError: true, isLoading: false, nodeData: null };
  }
}

// Серверный кэш в памяти на 8 секунд (защита от DDoS и лишних опросов ноды)
let cachedPayload: any = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 8000;

export async function GET() {
  const now = Date.now();
  if (cachedPayload && now - lastFetchTime < CACHE_TTL_MS) {
    return NextResponse.json(cachedPayload);
  }

  const [mainnet, testnet11] = await Promise.all([
    fetchSingleNode('mainnet'),
    fetchSingleNode('testnet11'),
  ]);

  cachedPayload = {
    isPythonDown: false,
    networks: { mainnet, testnet11 },
  };
  lastFetchTime = now;

  return NextResponse.json(cachedPayload);
}
