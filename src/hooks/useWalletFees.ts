'use client';

import { useUserSettingsStore } from '@/providers/UserSettnigsProvider';
import { useQuery } from '@tanstack/react-query';
import { callChiaRpc, ChiaNetwork } from '@/lib/utils/chia-rpc-client';

export interface FeeOption {
  mojo: number;
  seconds: number;
}

export interface CalculatedFees {
  high: FeeOption;
  medium: FeeOption;
  low: FeeOption;
}

interface RawFeeTariffs {
  high: { fee_mojos: number; seconds: number };
  medium: { fee_mojos: number; seconds: number };
  low: { fee_mojos: number; seconds: number };
}

const TARGET_TIMES = [30, 180, 300] as const;
const BASE_COST = 18_000_000;

export function useWalletFees(isEnabled: boolean = false, coinSpendsCount: number = 1) {
  const network = useUserSettingsStore((state) => state.network) as ChiaNetwork;
  const FEES_QUERY_KEY = ['chiaNodeFeesEstimate-v2', network];

  return useQuery<RawFeeTariffs, Error, CalculatedFees>({
    queryKey: FEES_QUERY_KEY,
    queryFn: async () => {
      const resJson = await callChiaRpc(network, 'get_fee_estimate', {
        target_times: [...TARGET_TIMES],
        cost: BASE_COST,
      });

      if (resJson.full_node_synced === false) {
        throw new Error('Нода Chia еще синхронизируется.');
      }

      const estimates: number[] = Array.isArray(resJson.estimates) ? resJson.estimates : [];
      const currentFee = Number(resJson.current_fee_rate ?? 0);

      const rawHigh = estimates[0] ?? currentFee;
      const rawMedium = estimates[1] ?? currentFee;
      const rawLow = estimates[2] ?? currentFee;

      return {
        high: { fee_mojos: Math.max(Math.round(rawHigh), 250_000_000), seconds: TARGET_TIMES[0] },
        medium: { fee_mojos: Math.max(Math.round(rawMedium), 150_000_000), seconds: TARGET_TIMES[1] },
        low: { fee_mojos: Math.max(Math.round(rawLow), 100_000_000), seconds: TARGET_TIMES[2] },
      };
    },
    enabled: isEnabled && !!network,
    staleTime: 15000,
    gcTime: 60000,
    select: (tariffs) => {
      const inputsCount = Math.max(1, coinSpendsCount);
      const feeMultiplier = 1 + (inputsCount - 1) * 0.3;
      const scaleFee = (baseMojos: number) => Math.round(baseMojos * feeMultiplier);

      return {
        high: { mojo: scaleFee(tariffs.high.fee_mojos), seconds: tariffs.high.seconds },
        medium: { mojo: scaleFee(tariffs.medium.fee_mojos), seconds: tariffs.medium.seconds },
        low: { mojo: scaleFee(tariffs.low.fee_mojos), seconds: tariffs.low.seconds },
      };
    },
  });
}

