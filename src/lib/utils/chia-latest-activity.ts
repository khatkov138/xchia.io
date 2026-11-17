import { callChiaRpc, ChiaNetwork } from '@/lib/utils/chia-rpc-client';
import { calculateChiaCoinId } from '@/lib/utils/crypto';

const cleanHash = (h: string) => {
  const s = String(h || '').replace(/^0x/i, '').trim().toLowerCase();
  return s ? `0x${s}` : '';
};

const cache = new Map<string, { data: any; ts: number; h: number }>();

export async function getLatestActivity(height: number, network: string) {
  if (!height || (network !== 'mainnet' && network !== 'testnet11')) {
    return { success: false, blocks: [], coins: [] };
  }

  const net = network as ChiaNetwork;
  const now = Math.floor(Date.now() / 1000);
  const hit = cache.get(net);
  if (hit && hit.h === height && now - hit.ts < 15) return hit.data;

  try {
    // 1. Одним запросом забираем последние 100 блоков
    const { block_records = [] } = await callChiaRpc(net, 'get_block_records', {
      start: Math.max(0, height - 99),
      end: height,
    });

    const txBlocks = block_records
      .filter((b: any) => b?.is_transaction_block || Number(b?.fees ?? 0) > 0)
      .sort((a: any, b: any) => Number(b.height) - Number(a.height))
      .slice(0, 10);

    const blocks = txBlocks.map((b: any) => {
      const diff = b.timestamp ? Math.abs(now - Number(b.timestamp)) : 0;
      return {
        height: Number(b.height),
        time_ago: diff < 60 ? '1 min ago' : `${Math.floor(diff / 60)} mins ago`,
        farmer: cleanHash(b.farmer_puzzle_hash) || '—',
      };
    });

    // 2. Один запрос монет только для самого свежего транзакционного блока
    let coins: any[] = [];
    const latestHeader = cleanHash(txBlocks[0]?.header_hash);
    if (latestHeader) {
      const { additions = [] } = await callChiaRpc(net, 'get_additions_and_removals', {
        header_hash: latestHeader,
      }).catch(() => ({ additions: [] }));

      coins = additions
        .map((item: any) => {
          const c = item?.coin ?? {};
          const amt = BigInt(c.amount ?? 0);
          return {
            id: `0x${calculateChiaCoinId(cleanHash(c.parent_coin_info), cleanHash(c.puzzle_hash), amt).toLowerCase()}`,
            amount: Number(amt),
            height: Number(txBlocks[0].height),
          };
        })
        .sort((a: any, b: any) => b.amount - a.amount)
        .slice(0, 10);
    }

    const data = { success: true, blocks, coins };
    cache.set(net, { data, ts: now, h: height });
    return data;
  } catch {
    return hit?.data ?? { success: false, blocks: [], coins: [] };
  }
}

export async function getInitialLatestActivity(network: string) {
  if (network !== 'mainnet' && network !== 'testnet11') return { success: false, blocks: [], coins: [] };
  const { blockchain_state } = await callChiaRpc(network as ChiaNetwork, 'get_blockchain_state', {}).catch(() => ({ blockchain_state: null }));
  const peak = Number(blockchain_state?.peak?.height ?? 0);
  return peak > 0 ? getLatestActivity(peak, network) : { success: false, blocks: [], coins: [] };
}
