import { cache } from 'react';
import { callChiaRpc, ChiaNetwork } from '@/lib/utils/chia-rpc-client';

export interface CoinAuditData {
  success: boolean;
  coin_id: string;
  status: 'PENDING' | 'SPENT' | 'UNSPENT' | 'NOT_FOUND';
  block_height: number | null;
  amount_mojo: number | null;
  puzzle_hash: string | null;
  parent_coin_info: string | null;
  created_bundle_id: string | null;
  spent_bundle_id: string | null;
  timestamp: number | null;
}

function normalizeHash(h: string): string {
  const cleaned = String(h || '').replace(/^0x/i, '').trim().toLowerCase();
  return cleaned ? `0x${cleaned}` : '';
}

export async function fetchCoinAuditData(
  coinId: string,
  network: string
): Promise<CoinAuditData | null> {
  const cleanCoinId = normalizeHash(coinId);
  if (cleanCoinId.length !== 66 || (network !== 'mainnet' && network !== 'testnet11')) {
    return null;
  }

  try {
    const coinData = await callChiaRpc(network as ChiaNetwork, 'get_coin_record_by_name', {
      name: cleanCoinId,
    });

    const record = coinData?.coin_record;
    if (!record) {
      return {
        success: false,
        coin_id: cleanCoinId,
        status: 'NOT_FOUND',
        block_height: null,
        amount_mojo: null,
        puzzle_hash: null,
        parent_coin_info: null,
        created_bundle_id: null,
        spent_bundle_id: null,
        timestamp: null,
      };
    }

    const confirmedHeight = Number(record.confirmed_block_index ?? 0);
    const spentHeight = Number(record.spent_block_index ?? 0);
    const isSpent = Boolean(record.spent);
    const details = record.coin ?? {};
    const parentId = String(details.parent_coin_info ?? '').replace(/^0x/i, '').toLowerCase();

    return {
      success: true,
      coin_id: cleanCoinId,
      status: confirmedHeight === 0 ? 'PENDING' : isSpent ? 'SPENT' : 'UNSPENT',
      block_height: isSpent ? spentHeight : confirmedHeight,
      amount_mojo: Number(details.amount ?? 0),
      puzzle_hash: String(details.puzzle_hash ?? ''),
      parent_coin_info: parentId ? `0x${parentId}` : '',
      created_bundle_id: confirmedHeight > 0 ? String(confirmedHeight) : null,
      spent_bundle_id: isSpent ? String(spentHeight) : null,
      timestamp: record.timestamp ?? null,
    };
  } catch {
    return {
      success: false,
      coin_id: cleanCoinId,
      status: 'NOT_FOUND',
      block_height: null,
      amount_mojo: null,
      puzzle_hash: null,
      parent_coin_info: null,
      created_bundle_id: null,
      spent_bundle_id: null,
      timestamp: null,
    };
  }
}

// Серверная обёртка с React.cache для дедупликации между generateMetadata и CoinExplorerPage
export const getCoinAuditData = cache(fetchCoinAuditData);
