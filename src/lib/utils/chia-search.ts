import { bech32m } from 'bech32';
import { callChiaRpc, ChiaNetwork } from '@/lib/utils/chia-rpc-client';

const BECH32M_REGEX = /^(xch|txch)1[a-z0-9]{58}$/i;
const HEX64_REGEX = /^(0x)?[0-9a-f]{64}$/i;

export interface SearchResult {
  entity_type: 'block_height' | 'address' | 'block_hash' | 'coin_id' | 'puzzle_hash';
  redirect_url: string;
}

export async function resolveChiaSearch(query: string, network: string): Promise<SearchResult> {
  const cleanQuery = query.trim();
  if (!cleanQuery || (network !== 'mainnet' && network !== 'testnet11')) {
    throw new Error('Invalid search parameters');
  }

  const net = network as ChiaNetwork;
  const expectedPrefix = net === 'mainnet' ? 'xch' : 'txch';

  // 1. Высота блока (целое число)
  if (/^\d+$/.test(cleanQuery)) {
    const height = Number(cleanQuery);
    return {
      entity_type: 'block_height',
      redirect_url: `/explorer/${net}/block/${height}`,
    };
  }

  // 2. Bech32m адрес (xch1... / txch1...)
  if (BECH32M_REGEX.test(cleanQuery)) {
    const lowerAddr = cleanQuery.toLowerCase();
    if (!lowerAddr.startsWith(expectedPrefix)) {
      throw new Error(`Invalid address prefix for ${net}`);
    }

    const decoded = bech32m.decode(lowerAddr);
    const bytes = Uint8Array.from(bech32m.fromWords(decoded.words));
    if (decoded.prefix !== expectedPrefix || bytes.length !== 32) {
      throw new Error('Bad Bech32m address format');
    }

    return {
      entity_type: 'address',
      redirect_url: `/explorer/${net}/address/${lowerAddr}`,
    };
  }

  // 3. 64-символьный Hex: проверяем Coin ID, Puzzle Hash и Block Hash параллельно
  if (HEX64_REGEX.test(cleanQuery)) {
    const hexClean = cleanQuery.replace(/^0x/i, '').toLowerCase();
    const hexPrefixed = `0x${hexClean}`;

    const [coinRes, phRes, blockRes] = await Promise.allSettled([
      callChiaRpc(net, 'get_coin_record_by_name', { name: hexPrefixed }),
      callChiaRpc(net, 'get_coin_records_by_puzzle_hashes', {
        puzzle_hashes: [hexPrefixed],
        include_spent_coins: true,
        start_height: 0,
      }),
      callChiaRpc(net, 'get_block_record', { header_hash: hexPrefixed }),
    ]);

    // Приоритет 1: Точное совпадение по Coin ID
    if (coinRes.status === 'fulfilled' && coinRes.value?.coin_record) {
      return {
        entity_type: 'coin_id',
        redirect_url: `/explorer/${net}/coin/${hexClean}`,
      };
    }

    // Приоритет 2: Хэш блока (header_hash) -> редирект на высоту блока
    if (blockRes.status === 'fulfilled' && blockRes.value?.block_record?.height !== undefined) {
      const height = Number(blockRes.value.block_record.height);
      return {
        entity_type: 'block_hash',
        redirect_url: `/explorer/${net}/block/${height}`,
      };
    }

    // Приоритет 3: Puzzle Hash (есть история монет) -> конвертируем в xch1/txch1
    if (phRes.status === 'fulfilled' && (phRes.value?.coin_records?.length ?? 0) > 0) {
      const bytes = Uint8Array.from(hexClean.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
      const bech32Addr = bech32m.encode(expectedPrefix, bech32m.toWords(bytes));
      return {
        entity_type: 'puzzle_hash',
        redirect_url: `/explorer/${net}/address/${bech32Addr}`,
      };
    }

    // Если в ноде пока не найдено, по умолчанию открываем страницу аудита монеты (как в Python)
    return {
      entity_type: 'coin_id',
      redirect_url: `/explorer/${net}/coin/${hexClean}`,
    };
  }

  throw new Error('Invalid search query format');
}
