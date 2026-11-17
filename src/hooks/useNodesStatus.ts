'use client';

import { useQuery } from '@tanstack/react-query';

export interface DerivedNodeStatus {
  network: string;
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

export interface SingleNodeStatusResult {
  isRpcDown: boolean;
  isNotSynced: boolean;
  isConnecting: boolean;
  hasError: boolean;
  isLoading: boolean;
  nodeData: DerivedNodeStatus | null;
}

export interface NodesStatusResult {
  isPythonDown: boolean;
  networks: {
    mainnet: SingleNodeStatusResult;
    testnet11: SingleNodeStatusResult;
    [key: string]: SingleNodeStatusResult;
  };
}

const LOADING_NODE_STATE: SingleNodeStatusResult = {
  isRpcDown: false,
  isNotSynced: false,
  isConnecting: false,
  hasError: false,
  isLoading: true,
  nodeData: null,
};

export function useNodesStatus(): NodesStatusResult {
  const { data } = useQuery<NodesStatusResult>({
    queryKey: ['xchia-nodes-status-v3'],
    queryFn: async () => {
      const res = await fetch('/api/nodes/status');
      if (!res.ok) throw new Error('Failed to fetch nodes status');
      return res.json();
    },
    staleTime: 30000,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });

  return (
    data ?? {
      isPythonDown: false,
      networks: {
        mainnet: LOADING_NODE_STATE,
        testnet11: LOADING_NODE_STATE,
      },
    }
  );
}
