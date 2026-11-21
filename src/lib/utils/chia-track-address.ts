import { bech32m } from 'bech32';
import { calculateChiaCoinId } from '@/lib/utils/crypto';
import { callChiaRpc, ChiaNetwork } from '@/lib/utils/chia-rpc-client';

const ZERO_PARENT = '0'.repeat(64);
const MAX_FEE_MOJO = 5_000_000_000_000n;
const CHUNK_SIZE = 50;
// Локальный массив окон (не мутируем!)
const DEFAULT_WINDOWS = [2_000, 15_000, 100_000, 500_000, 2_000_000];

const phToAddr = (ph: string, hrp: 'xch' | 'txch'): string | null => {
  try {
    const clean = ph.replace(/^0x/i, '').toLowerCase();
    if (clean.length !== 64) return null;
    const bytes = Uint8Array.from(clean.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
    return bech32m.encode(hrp, bech32m.toWords(bytes));
  } catch { return null; }
};

const toCleanPh = (input: string, hrp?: 'xch' | 'txch'): string | null => {
  const val = input.trim();
  if (/^t?xch/i.test(val)) {
    try {
      const dec = bech32m.decode(val);
      if (hrp && dec.prefix !== hrp) return null;
      const bytes = Uint8Array.from(bech32m.fromWords(dec.words));
      return bytes.length === 32 ? Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('') : null;
    } catch { return null; }
  }
  const clean = val.replace(/^0x/i, '').toLowerCase();
  return /^[0-9a-f]{64}$/.test(clean) ? clean : null;
};

function parseCoin(raw: any, hrp: 'xch' | 'txch') {
  const entry = raw?.coin_record ?? raw ?? {};
  const c = entry.coin ?? raw?.coin ?? {};
  const amtBig = BigInt(c.amount ?? 0);
  const ph = String(c.puzzle_hash ?? '').replace(/^0x/i, '').toLowerCase();
  const pid = String(c.parent_coin_info ?? '').replace(/^0x/i, '').toLowerCase();
  const c_blk = Number(entry.confirmed_block_index ?? entry.confirmed_block ?? raw?.confirmed_block_index ?? 0);
  const s_blk = Number(entry.spent_block_index ?? entry.spent_block ?? raw?.spent_block_index ?? 0);

  let id = String(raw?.name ?? entry.name ?? '').replace(/^0x/i, '').toLowerCase();
  if (id.length !== 64 && pid.length === 64 && ph.length === 64) {
    try { id = calculateChiaCoinId(pid, ph, amtBig).toLowerCase(); } catch {}
  }

  return {
    id, pid, ph, amt_m: Number(amtBig), amt_big: amtBig, c_blk, s_blk,
    addr: ph.length === 64 ? phToAddr(ph, hrp) : null,
    ts: Number(entry.timestamp ?? raw?.timestamp ?? 0),
    spent: Boolean(entry.spent || entry.is_spent || s_blk > 0),
  };
}

type ParsedCoin = ReturnType<typeof parseCoin>;

async function fetchByParentIds(net: ChiaNetwork, ids: string[]) {
  if (!ids.length) return [];
  const chunks = Array.from({ length: Math.ceil(ids.length / CHUNK_SIZE) }, (_, i) => ids.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
  const res = await Promise.all(
    chunks.map((parent_ids) => callChiaRpc(net, 'get_coin_records_by_parent_ids', { parent_ids, include_spent_coins: true }).catch(() => null))
  );
  return res.flatMap((r) => r?.coin_records ?? []);
}

export async function trackAddress(addressOrPh: string, network: string, page = 1, perPage = 10) {
  if (network !== 'mainnet' && network !== 'testnet11') return null;
  const net = network as ChiaNetwork;
  const hrp = net === 'mainnet' ? 'xch' : 'txch';
  const cleanPh = toCleanPh(addressOrPh, hrp);
  if (!cleanPh) return null;

  // 1. Сначала берём только пик блокчейна (мгновенно, ~5 мс)
  const stateRes = await callChiaRpc(net, 'get_blockchain_state', {}).catch(() => null);
  const peak = Number(stateRes?.blockchain_state?.peak?.height ?? 0);
  const needed = page * perPage + 1;

  // 2. Сразу грузим узкое окно (последние 2000 блоков ≈ 10 часов)
  // Для пулов и бирж этого ОДНОГО запроса хватит на всю первую страницу за ~100 мс!
  const coinsMap = new Map<string, ParsedCoin>();
  const blocks = new Set<number>();
  let end: number | undefined = peak > 0 ? peak + 1 : undefined;
  let reachedGenesis = false;
  let stepIndex = 0;

  while (stepIndex <= DEFAULT_WINDOWS.length) {
    const win = DEFAULT_WINDOWS[stepIndex];
    const start = end !== undefined && win !== undefined ? Math.max(0, end - win) : 0;

    const res = await callChiaRpc(net, 'get_coin_records_by_puzzle_hashes', {
      puzzle_hashes: [`0x${cleanPh}`],
      include_spent_coins: true,
      start_height: start,
      ...(end !== undefined && { end_height: end }),
    }).catch(() => null);

    // Если запрос не прошёл (504 / таймаут), не долбим ноду дальше — выходим с тем, что успели собрать
    if (!res) break;

    for (const r of res.coin_records ?? []) {
      const p = parseCoin(r, hrp);
      if (p.id.length !== 64) continue;
      coinsMap.set(p.id, p);
      if (p.c_blk > 0) blocks.add(p.c_blk);
      if (p.s_blk > 0) blocks.add(p.s_blk);
    }

    if (start === 0 || end === undefined) { reachedGenesis = true; break; }
    if (blocks.size >= needed) break;

    end = start;
    stepIndex++;
  }

  // 3. Баланс: если уже дошли до генезиса — считаем точно из собранных монет (0 лишних запросов!)
  // Если не дошли (остановились на окне) — пробуем быстрый запрос unspent (только если история не забита спамом)
  let balBig = 0n;
  let isHeavyBalance = false;

  if (reachedGenesis) {
    for (const c of coinsMap.values()) {
      if (!c.spent) balBig += c.amt_big;
    }
  } else {
    // Если за 2000 блоков уже больше 500 монет — адрес точно пылевой, не вешаем ноду запросом без высоты
    if (coinsMap.size > 500) {
      isHeavyBalance = true;
      for (const c of coinsMap.values()) {
        if (!c.spent) balBig += c.amt_big;
      }
    } else {
      const unspentRes = await callChiaRpc(net, 'get_coin_records_by_puzzle_hashes', {
        puzzle_hashes: [`0x${cleanPh}`],
        include_spent_coins: false,
      }).catch(() => null);

      if (unspentRes?.coin_records) {
        for (const r of unspentRes.coin_records) {
          balBig += BigInt((r?.coin_record?.coin ?? r?.coin)?.amount ?? 0);
        }
      } else {
        isHeavyBalance = true;
        for (const c of coinsMap.values()) {
          if (!c.spent) balBig += c.amt_big;
        }
      }
    }
  }

  const parsedCoins = Array.from(coinsMap.values());
  const sortedBlocks = Array.from(blocks).sort((a, b) => b - a);
  const paginatedBlocks = sortedBlocks.slice((page - 1) * perPage, page * perPage);

  if (!paginatedBlocks.length) {
    return { address: phToAddr(cleanPh, hrp), balance_mojo: Number(balBig), is_heavy_balance: isHeavyBalance, total_blocks: sortedBlocks.length, has_more_history: !reachedGenesis, page, per_page: perPage, history: [] };
  }

  // 4. Подтягиваем входы/выходы только для 10 блоков текущей страницы
  const pageSet = new Set(paginatedBlocks);
  const spentInPage = parsedCoins.filter((c) => c.spent && pageSet.has(c.s_blk));
  const inputsByParent = new Map<string, ParsedCoin[]>();
  const childrenByParent = new Map<string, ParsedCoin[]>();

  if (spentInPage.length) {
    const parentIds = Array.from(new Set(spentInPage.filter((c) => c.pid !== ZERO_PARENT).map((c) => `0x${c.pid}`)));
    for (const r of await fetchByParentIds(net, parentIds)) {
      const p = parseCoin(r, hrp);
      if (p.spent && pageSet.has(p.s_blk)) {
        const k = `${p.s_blk}_${p.pid}`;
        inputsByParent.set(k, [...(inputsByParent.get(k) ?? []), p]);
      }
    }

    const inputIds = new Set(spentInPage.flatMap((sc) => (inputsByParent.get(`${sc.s_blk}_${sc.pid}`) ?? [sc]).map((s) => `0x${s.id}`)));
    for (const r of await fetchByParentIds(net, Array.from(inputIds))) {
      const ch = parseCoin(r, hrp);
      childrenByParent.set(ch.pid, [...(childrenByParent.get(ch.pid) ?? []), ch]);
    }
  }

  const history = paginatedBlocks.flatMap((blk) => {
    const received = parsedCoins.filter((c) => c.c_blk === blk).sort((a, b) => b.amt_m - a.amt_m);
    const spent = parsedCoins.filter((c) => c.spent && c.s_blk === blk);
    if (!received.length && !spent.length) return [];

      const entry: Record<string, any> = { block: blk, ts: received[0]?.ts || spent[0]?.ts || 0 };

    if (received.length) {
      entry.received = received.map((rc) => ({
        id: rc.id, pid: rc.pid, mojo: rc.amt_m, type: rc.pid === ZERO_PARENT ? 'COINBASE' : 'RECEIVE', puzzle_hash: `0x${rc.ph}`, addr: rc.addr,
      }));
    }

    if (spent.length) {
      const inMap = new Map<string, ParsedCoin>();
      const outMap = new Map<string, ParsedCoin>();
      for (const sc of spent) {
        for (const ip of inputsByParent.get(`${blk}_${sc.pid}`) ?? [sc]) {
          inMap.set(ip.id, ip);
          for (const op of childrenByParent.get(ip.id) ?? []) outMap.set(op.id, op);
        }
      }

      const inList = Array.from(inMap.values()).sort((a, b) => b.amt_m - a.amt_m);
      const outList = Array.from(outMap.values()).sort((a, b) => b.amt_m - a.amt_m);
      const isBundle = inList.some((i) => i.ph !== cleanPh) || new Set(inList.map((i) => i.ph).filter(Boolean)).size > 1;
      const totalIn = inList.reduce((acc, i) => acc + i.amt_big, 0n);
      const totalOut = outList.reduce((acc, o) => acc + o.amt_big, 0n);
      let fee = totalIn > totalOut ? totalIn - totalOut : 0n;
      if (fee > MAX_FEE_MOJO || isBundle) fee = 0n;

      entry.sent = [{
        fee_mojo: Number(fee), is_bundle: isBundle,
        spent: inList.map((i) => ({ id: i.id, mojo: i.amt_m, addr: i.addr, puzzle_hash: `0x${i.ph}` })),
        created: outList.map((o) => ({ id: o.id, mojo: o.amt_m, addr: o.addr, puzzle_hash: `0x${o.ph}`, change: o.ph === cleanPh })),
      }];
    }

    return [entry];
  });

  return {
    address: phToAddr(cleanPh, hrp),
    balance_mojo: Number(balBig),
    is_heavy_balance: isHeavyBalance,
    total_blocks: sortedBlocks.length,
    has_more_history: !reachedGenesis,
    page,
    per_page: perPage,
    history,
  };
}
