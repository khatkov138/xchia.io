import { callChiaRpc, ChiaNetwork } from '@/lib/utils/chia-rpc-client';
import { calculateChiaCoinId } from '@/lib/utils/crypto';

const ZERO_PREFIX = '0x000000000000000000000000000000';

function cleanHash(h: string): string {
  const cleaned = String(h || '').replace(/^0x/i, '').trim().toLowerCase();
  return cleaned ? `0x${cleaned}` : '';
}

function formatToXch(mojo: number | bigint): string {
  const val = Number(mojo) / 1e12;
  return val.toFixed(12).replace(/\.?0+$/, '') || '0';
}

export async function trackBundle(params: {
  blockHeight: string | number;
  targetCoinId: string;
  network: string;
  mode: 'created' | 'spent';
}) {
  const height = Number(params.blockHeight);
  const net = params.network as ChiaNetwork;
  const targetClean = cleanHash(params.targetCoinId);
  const mode = params.mode === 'created' ? 'created' : 'spent';

  if (!Number.isInteger(height) || height < 0 || !targetClean) return null;
  if (net !== 'mainnet' && net !== 'testnet11') return null;

  try {
    // 1. Запрашиваем целевую монету и блок параллельно
    const [coinRes, brRes] = await Promise.all([
      callChiaRpc(net, 'get_coin_record_by_name', { name: targetClean }),
      callChiaRpc(net, 'get_block_record_by_height', { height }),
    ]);

    const rec = coinRes?.coin_record;
    const brData = brRes?.block_record;
    if (!rec || !brData) return null;

    const myPuzzleHash = cleanHash(rec.coin?.puzzle_hash || '');
    const parentCoinId = cleanHash(rec.coin?.parent_coin_info || '');
    const targetAmount = Number(rec.coin?.amount ?? 0);
    const blockTs = brData.timestamp ?? null;
    const headerHash = cleanHash(brData.header_hash || '');

    // 2. Забираем additions и removals блока
    let additions: any[] = [];
    let removals: any[] = [];
    if (headerHash) {
      try {
        const arRes = await callChiaRpc(net, 'get_additions_and_removals', {
          header_hash: headerHash,
        });
        additions = arRes?.additions ?? [];
        removals = arRes?.removals ?? [];
      } catch {}
    }

    const rawSpent: Array<{ id: string; mojo: number; puzzle_hash: string; change: boolean }> = [];
    const rawCreated: Array<{ id: string; mojo: number; puzzle_hash: string; change: boolean }> = [];
    const connectedInputs = new Set<string>([mode === 'spent' ? targetClean : parentCoinId]);

    if (mode === 'created') {
      for (const a of additions) {
        const ac = a?.coin ?? {};
        if (cleanHash(ac.parent_coin_info || '') === parentCoinId) {
          const aPh = cleanHash(ac.puzzle_hash || '');
          const aAmt = BigInt(ac.amount ?? 0);
          const aId = `0x${calculateChiaCoinId(parentCoinId, aPh, aAmt).toLowerCase()}`;
          if (aId.length === 66) connectedInputs.add(aId);
        }
      }
    }

    const allRemovalsMap = new Map<string, { id: string; pinfo: string; ph: string; mojo: number }>();

    for (const r of removals) {
      const rc = r?.coin ?? {};
      const rPinfo = cleanHash(rc.parent_coin_info || '');
      const rPh = cleanHash(rc.puzzle_hash || '');
      const rAmt = Number(rc.amount ?? 0);
      const rId =
        cleanHash(r?.name || '') ||
        cleanHash(r?.coin_record?.name || '') ||
        `0x${calculateChiaCoinId(rPinfo, rPh, BigInt(rc.amount ?? 0)).toLowerCase()}`;

      if (!rPinfo.startsWith(ZERO_PREFIX) && rId.length === 66) {
        allRemovalsMap.set(rId, { id: rId, pinfo: rPinfo, ph: rPh, mojo: rAmt });
        if (connectedInputs.has(rId) || connectedInputs.has(rPinfo) || rPh === myPuzzleHash) {
          connectedInputs.add(rId);
        }
      }
    }

    for (const [rId, rm] of allRemovalsMap.entries()) {
      if (connectedInputs.has(rId) || connectedInputs.has(rm.pinfo)) {
        connectedInputs.add(rId);
      }
    }

    for (const [rId, rm] of allRemovalsMap.entries()) {
      if (connectedInputs.has(rId)) {
        rawSpent.push({ id: rId, mojo: rm.mojo, puzzle_hash: rm.ph, change: false });
      }
    }

    const connectedRawSet = new Set(Array.from(connectedInputs).map((x) => x.replace(/^0x/i, '')));

    for (const a of additions) {
      const ac = a?.coin ?? {};
      const aPinfo = cleanHash(ac.parent_coin_info || '');
      const aPh = cleanHash(ac.puzzle_hash || '');
      let aAmt = Number(ac.amount ?? 0);
      const aId = `0x${calculateChiaCoinId(aPinfo, aPh, BigInt(ac.amount ?? 0)).toLowerCase()}`;

      if (
        connectedInputs.has(aPinfo) ||
        aId === targetClean ||
        connectedRawSet.has(aPinfo.replace(/^0x/i, ''))
      ) {
        if (aAmt === 0 && aId.length === 66) {
          try {
            const cc = await callChiaRpc(net, 'get_coin_record_by_name', { name: aId });
            if (cc?.coin_record?.coin) {
              aAmt = Number(cc.coin_record.coin.amount ?? 0);
            }
          } catch {}
        }

        const parentRm = allRemovalsMap.get(aPinfo);
        const matchPh = parentRm ? parentRm.ph : myPuzzleHash;
        const isChange =
          aPh === matchPh &&
          !connectedInputs.has(aId) &&
          (mode === 'created' ? aId !== targetClean : true);

        rawCreated.push({ id: aId, mojo: aAmt, puzzle_hash: aPh, change: isChange });
      }
    }

    if (!rawCreated.some((c) => c.id === targetClean)) {
      rawCreated.push({
        id: targetClean,
        mojo: targetAmount,
        puzzle_hash: myPuzzleHash,
        change: false,
      });
    }

    // Дедупликация и исключение сожженных монет из списка созданных
    const uniqueSpent = Array.from(new Map(rawSpent.map((s) => [s.id, s])).values());
    const spentIds = new Set(uniqueSpent.map((s) => s.id));
    const uniqueCreated = Array.from(new Map(rawCreated.map((c) => [c.id, c])).values()).filter(
      (c) => !spentIds.has(c.id)
    );

    const spent_coins = uniqueSpent.map((s) => ({
      id: s.id,
      mojo: s.mojo,
      puzzle_hash: s.puzzle_hash,
      change: s.change,
      is_cat: false,
      asset_type: 'XCH',
      amount_formatted: formatToXch(s.mojo),
    }));

    const created_coins = uniqueCreated.map((c) => ({
      id: c.id,
      mojo: c.mojo,
      puzzle_hash: c.puzzle_hash,
      change: c.change,
      is_cat: false,
      asset_type: 'XCH',
      amount_formatted: formatToXch(c.mojo),
    }));

    const spentXchSum = spent_coins.reduce((acc, s) => acc + s.mojo, 0);
    const createdXchSum = created_coins.reduce((acc, c) => acc + c.mojo, 0);
    const fee_mojo = Math.max(0, spentXchSum - createdXchSum);

        const bundleData = {
      block_height: height,
      timestamp: blockTs,
      header_hash: headerHash,
      target_coin_id: targetClean,
      mode,
      fee_mojo,
      spent: spent_coins,
      created: created_coins,
      spent_coins,
      created_coins,
    };

    return {
      success: true,
      bundle: bundleData,
      ...bundleData,
    };

  } catch {
    return null;
  }
}
