import os from 'node:os';
import path from 'node:path';

const CHIA_ROOT = path.join(os.homedir(), '.chia');

export const NODES = {
  mainnet: {
    port: 8557,
    cert: path.join(CHIA_ROOT, 'real_mainnet', 'config', 'ssl', 'full_node', 'private_full_node.crt'),
    key: path.join(CHIA_ROOT, 'real_mainnet', 'config', 'ssl', 'full_node', 'private_full_node.key'),
  },
  testnet11: {
    port: 8555,
    cert: path.join(CHIA_ROOT, 'mainnet', 'config', 'ssl', 'full_node', 'private_full_node.crt'),
    key: path.join(CHIA_ROOT, 'mainnet', 'config', 'ssl', 'full_node', 'private_full_node.key'),
  },
} as const;

export type Network = keyof typeof NODES;

export const LIMITS = {
  MAX_BLOCK_RANGE_DEFAULT: 20_000,      // макс. диапазон блоков для поиска монет
  MAX_BLOCK_RANGE_BLOCKS: 100,          // макс. диапазон для get_blocks / get_block_records
  MAX_ARRAY_ITEMS: 50,                  // макс. длина массивов puzzle_hashes / parent_ids
  NODE_TIMEOUT_MS: 10_000,              // таймаут запроса к ноде (10 сек)
  MAX_RESPONSE_BYTES: 5 * 1024 * 1024,  // макс. размер ответа от ноды (5 МБ)
};
