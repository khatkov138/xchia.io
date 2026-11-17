import { bech32m } from 'bech32';
import { calculateChiaCoinId } from '@/lib/utils/crypto';
import { callChiaRpc, ChiaNetwork } from '@/lib/utils/chia-rpc-client';

const ZERO_PARENT = '0'.repeat(64);
const MAX_FEE_MOJO = 5_000_000_000_000n;
const PARENT_IDS_CHUNK_SIZE = 50;

function phToAddr(phHex: string, hrp: 'xch' | 'txch'): string | null {
  try {
    const clean = phHex.replace(/^0x/i, '').toLowerCase();
    if (clean.length !== 64) return null;
    const bytes = Uint8Array.from(clean.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
    return bech32m.encode(hrp, bech32m.toWords(bytes));
  } catch {
    return null;
  }
}

function toCleanPh(input: string): string | null {
  const val = input.trim();
  if (val.toLowerCase().startsWith('xch') || val.toLowerCase().startsWith('txch')) {
    try {
      const decoded = bech32m.decode(val);
      const bytes = Uint8Array.from(bech32m.fromWords(decoded.words));
      return bytes.length === 32
        ? Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
        : null;
    } catch {
      return null;
    }
  }
  const clean = val.replace(/^0x/i, '').toLowerCase();
  return /^[0-9a-f]{64}$/.test(clean) ? clean : null;
}

function parseCoin(raw: any, hrp: 'xch' | 'txch') {
  const entry = raw?.coin_record ?? raw ?? {};
  const c = entry.coin ?? raw?.coin ?? {};

  const amtBig = BigInt(c.amount ?? 0);
  const ph = String(c.puzzle_hash ?? '').replace(/^0x/i, '').toLowerCase();
  const pid = String(c.parent_coin_info ?? '').replace(/^0x/i, '').toLowerCase();
  const cBlk = Number(entry.confirmed_block_index ?? entry.confirmed_block ?? raw?.confirmed_block_index ?? 0);
  const sBlk = Number(entry.spent_block_index ?? entry.spent_block ?? raw?.spent_block_index ?? 0);
  const spent = Boolean(entry.spent || entry.is_spent || sBlk > 0);

  let id = String(raw?.name ?? entry.name ?? '').replace(/^0x/i, '').toLowerCase();
  if (id.length !== 64 && pid.length === 64 && ph.length === 64) {
    try {
      id = calculateChiaCoinId(pid, ph, amtBig).toLowerCase();
    } catch {}
  }

  return {
    id,
    pid,
    ph,
    addr: ph.length === 64 ? phToAddr(ph, hrp) : null,
    amt_m: Number(amtBig),
    amt_big: amtBig,
    c_blk: cBlk,
    s_blk: sBlk,
    ts: Number(entry.timestamp ?? raw?.timestamp ?? 0),
    spent,
  };
}

async function fetchByParentIds(net: ChiaNetwork, ids: string[]) {
  const allRecords: any[] = [];
  for (let i = 0; i < ids.length; i += PARENT_IDS_CHUNK_SIZE) {
    const chunk = ids.slice(i, i + PARENT_IDS_CHUNK_SIZE);
    const res = await callChiaRpc(net, 'get_coin_records_by_parent_ids', {
      parent_ids: chunk,
      include_spent_coins: true,
    });
    if (res?.coin_records) {
      allRecords.push(...res.coin_records);
    }
  }
  return allRecords;
}

export async function trackAddress(addressOrPh: string, network: string, page = 1, perPage = 10) {
  const cleanPh = toCleanPh(addressOrPh);
  if (!cleanPh || (network !== 'mainnet' && network !== 'testnet11')) return null;

  const net = network as ChiaNetwork;
  const hrp: 'xch' | 'txch' = net === 'mainnet' ? 'xch' : 'txch';
  const localPhSet = new Set([cleanPh]);

  const res = await callChiaRpc(net, 'get_coin_records_by_puzzle_hashes', {
    puzzle_hashes: [`0x${cleanPh}`],
    include_spent_coins: true,
    start_height: 0,
  });

  const activityBlocks = new Set<number>();
  const parsedCoins: ReturnType<typeof parseCoin>[] = [];
  let balBig = 0n;

  for (const r of res.coin_records ?? []) {
    const p = parseCoin(r, hrp);
    if (p.id.length !== 64) continue;
    parsedCoins.push(p);
    if (!p.spent && p.ph === cleanPh) balBig += p.amt_big;
    if (p.c_blk > 0) activityBlocks.add(p.c_blk);
    if (p.s_blk > 0) activityBlocks.add(p.s_blk);
  }

  const sortedBlocks = Array.from(activityBlocks).sort((a, b) => b - a);
  const paginatedBlocks = sortedBlocks.slice((page - 1) * perPage, page * perPage);

  if (!paginatedBlocks.length) {
    return {
      address: phToAddr(cleanPh, hrp),
      balance_mojo: Number(balBig),
      total_blocks: sortedBlocks.length,
      page,
      per_page: perPage,
      history: [],
    };
  }

  const pageBlocks = new Set(paginatedBlocks);
  const ourSpentInPage = parsedCoins.filter((c) => c.spent && pageBlocks.has(c.s_blk));
  const allInputsByParent = new Map<string, ReturnType<typeof parseCoin>[]>();
  const childrenByParent = new Map<string, ReturnType<typeof parseCoin>[]>();

  if (ourSpentInPage.length > 0) {
    const parentIds = Array.from(
      new Set(ourSpentInPage.filter((sc) => sc.pid !== ZERO_PARENT).map((sc) => `0x${sc.pid}`))
    );

    if (parentIds.length > 0) {
      const parentRecords = await fetchByParentIds(net, parentIds);
      for (const r of parentRecords) {
        const pCoin = parseCoin(r, hrp);
        if (pCoin.spent && pageBlocks.has(pCoin.s_blk)) {
          const key = `${pCoin.s_blk}_${pCoin.pid}`;
          const arr = allInputsByParent.get(key) ?? [];
          arr.push(pCoin);
          allInputsByParent.set(key, arr);
        }
      }
    }

    const resolvedInputIds = new Set<string>();
    for (const sc of ourSpentInPage) {
      for (const sib of allInputsByParent.get(`${sc.s_blk}_${sc.pid}`) ?? [sc]) {
        resolvedInputIds.add(sib.id);
      }
    }

    if (resolvedInputIds.size > 0) {
      const childRecords = await fetchByParentIds(
        net,
        Array.from(resolvedInputIds).map((id) => `0x${id}`)
      );
      for (const r of childRecords) {
        const ch = parseCoin(r, hrp);
        const arr = childrenByParent.get(ch.pid) ?? [];
        arr.push(ch);
        childrenByParent.set(ch.pid, arr);
      }
    }
  }

  const byCreated = new Map<number, ReturnType<typeof parseCoin>[]>();
  const bySpent = new Map<number, ReturnType<typeof parseCoin>[]>();

  for (const c of parsedCoins) {
    if (pageBlocks.has(c.c_blk)) {
      const arr = byCreated.get(c.c_blk) ?? [];
      arr.push(c);
      byCreated.set(c.c_blk, arr);
    }
    if (c.spent && pageBlocks.has(c.s_blk)) {
      const arr = bySpent.get(c.s_blk) ?? [];
      arr.push(c);
      bySpent.set(c.s_blk, arr);
    }
  }

  const history: any[] = [];

  for (const blk of paginatedBlocks) {
    const receivedCoins = byCreated.get(blk) ?? [];
    const spentCoins = bySpent.get(blk) ?? [];
    if (!receivedCoins.length && !spentCoins.length) continue;

    const blkEntry: Record<string, any> = {
      block: blk,
      ts: receivedCoins?.[0]?.ts || spentCoins?.[0]?.ts || 0,
    };

    if (receivedCoins.length) {
      receivedCoins.sort((a, b) => b.amt_m - a.amt_m);
      blkEntry.received = receivedCoins.map((rc) => ({
        id: rc.id,
        pid: rc.pid,
        mojo: rc.amt_m,
        type: rc.pid === ZERO_PARENT ? 'COINBASE' : 'RECEIVE',
        puzzle_hash: `0x${rc.ph}`,
        addr: rc.addr,
      }));
    }

    if (spentCoins.length) {
      const inputsMap = new Map<string, ReturnType<typeof parseCoin>>();
      const outputsMap = new Map<string, ReturnType<typeof parseCoin>>();

      for (const sc of spentCoins) {
        for (const ip of allInputsByParent.get(`${blk}_${sc.pid}`) ?? [sc]) {
          inputsMap.set(ip.id, ip);
          for (const op of childrenByParent.get(ip.id) ?? []) {
            outputsMap.set(op.id, op);
          }
        }
      }

      const inputsList = Array.from(inputsMap.values());
      const outputsList = Array.from(outputsMap.values());

      const uniquePhs = new Set(inputsList.map((i) => i.ph).filter(Boolean));
      const hasForeign = inputsList.some((i) => !localPhSet.has(i.ph));
      const isBundle = hasForeign || uniquePhs.size > 1;

      const totalIn = inputsList.reduce((acc, i) => acc + i.amt_big, 0n);
      const totalOut = outputsList.reduce((acc, o) => acc + o.amt_big, 0n);
      let feeBig = totalIn > totalOut ? totalIn - totalOut : 0n;
      if (feeBig > MAX_FEE_MOJO || isBundle) feeBig = 0n;

      inputsList.sort((a, b) => b.amt_m - a.amt_m);
      outputsList.sort((a, b) => b.amt_m - a.amt_m);

      blkEntry.sent = [
        {
          fee_mojo: Number(feeBig),
          is_bundle: isBundle,
          spent: inputsList.map((i) => ({
            id: i.id,
            mojo: i.amt_m,
            addr: i.addr,
            puzzle_hash: `0x${i.ph}`,
          })),
          created: outputsList.map((o) => ({
            id: o.id,
            mojo: o.amt_m,
            addr: o.addr,
            puzzle_hash: `0x${o.ph}`,
            change: localPhSet.has(o.ph),
          })),
        },
      ];
    }

    history.push(blkEntry);
  }

  return {
    address: phToAddr(cleanPh, hrp),
    balance_mojo: Number(balBig),
    total_blocks: sortedBlocks.length,
    page,
    per_page: perPage,
    history,
  };
}
