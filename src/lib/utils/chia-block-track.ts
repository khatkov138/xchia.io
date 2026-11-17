import { callChiaRpc, ChiaNetwork } from '@/lib/utils/chia-rpc-client';
import { calculateChiaCoinId } from '@/lib/utils/crypto';

function cleanHash(h: string): string {
  const cleaned = String(h || '').replace(/^0x/i, '').trim().toLowerCase();
  return cleaned ? `0x${cleaned}` : '';
}

export async function getBlockByHeight(height: string | number, network: string) {
  const numHeight = Number(height);
  if (!Number.isInteger(numHeight) || numHeight < 0) return null;
  if (network !== 'mainnet' && network !== 'testnet11') return null;

  const net = network as ChiaNetwork;

  try {
    const brRes = await callChiaRpc(net, 'get_block_record_by_height', { height: numHeight });
    const brData = brRes?.block_record;
    if (!brData) return null;

    const headerHash = cleanHash(brData.header_hash || '');

    let rawAdditions: any[] = [];
    let rawRemovals: any[] = [];

    if (headerHash) {
      try {
        const arRes = await callChiaRpc(net, 'get_additions_and_removals', {
          header_hash: headerHash,
        });
        rawAdditions = arRes?.additions ?? [];
        rawRemovals = arRes?.removals ?? [];
      } catch {
        // Если блок без транзакций (non-transaction block), нода может вернуть ошибку — это ок
      }
    }

    const additions = rawAdditions.map((item) => {
      const c = item?.coin ?? {};
      const cPinfo = cleanHash(c.parent_coin_info || '');
      const cPh = cleanHash(c.puzzle_hash || '');
      const cAmt = Number(c.amount ?? 0);
      const coinId = `0x${calculateChiaCoinId(cPinfo, cPh, BigInt(c.amount ?? 0)).toLowerCase()}`;
      return { id: coinId, amount: cAmt };
    });

    const removals = rawRemovals.map((item) => {
      const c = item?.coin ?? {};
      const cPinfo = cleanHash(c.parent_coin_info || '');
      const cPh = cleanHash(c.puzzle_hash || '');
      const cAmt = Number(c.amount ?? 0);
      const coinId =
        cleanHash(item?.name || '') ||
        `0x${calculateChiaCoinId(cPinfo, cPh, BigInt(c.amount ?? 0)).toLowerCase()}`;
      return { id: coinId, amount: cAmt };
    });

    return {
      success: true,
      block_record: {
        header_hash: headerHash,
        height: brData.height,
        timestamp: brData.timestamp,
        weight: brData.weight,
      },
      additions,
      removals,
      fees_mojo: brData.fees ?? 0,
    };
  } catch {
    return null;
  }
}
