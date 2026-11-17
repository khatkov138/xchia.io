import { z } from 'zod';
import { LIMITS } from './config';

const blockRangeSchema = z
  .object({
    start_height: z.number().int().min(0),
    end_height: z.number().int().min(0),
  })
  .refine((d) => d.end_height >= d.start_height, {
    message: 'end_height must be >= start_height',
  });

const METHOD_SCHEMAS: Record<string, z.ZodType> = {
  // 1. Методы без тяжелых параметров
  get_blockchain_state: z.looseObject({}),
  get_all_mempool_tx_ids: z.looseObject({}),
  get_mempool_item_by_tx_id: z.looseObject({ tx_id: z.string().min(1) }),
  get_fee_estimate: z.looseObject({}),
  push_tx: z.looseObject({
    spend_bundle: z.looseObject({
      coin_spends: z.array(z.any()).min(1),
      aggregated_signature: z.string().min(1),
    }),
  }),
  get_connections: z.looseObject({}),

  // 2. Одиночные блоки и монеты
  get_block: z.looseObject({ header_hash: z.string().min(1) }),
  get_block_record: z.looseObject({ header_hash: z.string().min(1) }),
  get_block_record_by_height: z.looseObject({
    height: z.number().int().min(0),
  }),
  get_additions_and_removals: z.looseObject({ header_hash: z.string().min(1) }),
  get_coin_record_by_name: z.looseObject({ name: z.string().min(1) }),
  get_puzzle_and_solution: z.looseObject({
    coin_id: z.string().min(1),
    height: z.number().int().min(0),
  }),

  // 3. Методы получения списков блоков
  get_blocks: blockRangeSchema
    .extend({
      exclude_header_hash: z.boolean().optional(),
      exclude_reorged: z.boolean().optional(),
    })
    .loose()
    .refine((d) => d.end_height - d.start_height <= LIMITS.MAX_BLOCK_RANGE_BLOCKS, {
      message: `Max block range is ${LIMITS.MAX_BLOCK_RANGE_BLOCKS}`,
    }),

   get_block_records: z
    .object({
      start: z.number().int().min(0),
      end: z.number().int().min(0),
    })
    .loose()
    .refine((d) => d.end >= d.start, {
      message: 'end must be >= start',
    })
    .refine((d) => d.end - d.start <= LIMITS.MAX_BLOCK_RANGE_BLOCKS, {
      message: `Max block range is ${LIMITS.MAX_BLOCK_RANGE_BLOCKS}`,
    }),


  // 4. Поиск монет (обязательно с ограниченным окном блоков)
  get_coin_records_by_puzzle_hash: blockRangeSchema
    .extend({
      puzzle_hash: z.string().min(1),
      include_spent_coins: z.boolean().optional(),
    })
    .loose()
    .refine((d) => d.end_height - d.start_height <= LIMITS.MAX_BLOCK_RANGE_DEFAULT, {
      message: `Max block range is ${LIMITS.MAX_BLOCK_RANGE_DEFAULT}`,
    }),

  get_coin_records_by_puzzle_hashes: z.looseObject({
    puzzle_hashes: z.array(z.string().min(1)).min(1).max(LIMITS.MAX_ARRAY_ITEMS),
    start_height: z.number().int().min(0).optional(),
    end_height: z.number().int().min(0).optional(),
    include_spent_coins: z.boolean().optional(),
  }),

  get_coin_records_by_parent_ids: z.looseObject({
    parent_ids: z.array(z.string().min(1)).min(1).max(LIMITS.MAX_ARRAY_ITEMS),
    start_height: z.number().int().min(0).optional(),
    end_height: z.number().int().min(0).optional(),
    include_spent_coins: z.boolean().optional(),
  }),

  get_coin_records_by_hint: blockRangeSchema
    .extend({
      hint: z.string().min(1),
      include_spent_coins: z.boolean().optional(),
    })
    .loose()
    .refine((d) => d.end_height - d.start_height <= LIMITS.MAX_BLOCK_RANGE_DEFAULT, {
      message: `Max block range is ${LIMITS.MAX_BLOCK_RANGE_DEFAULT}`,
    }),
};

export function validateRequest(
  method: string,
  rawBody: unknown
): { ok: true; data: Record<string, unknown> } | { ok: false; error: string } {
  const schema = METHOD_SCHEMAS[method];

  if (!schema) {
    return { ok: false, error: `Method '${method}' is not allowed` };
  }

  const parsed = schema.safeParse(rawBody);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path?.length ? `${issue.path.join('.')}: ` : '';
    return { ok: false, error: `${path}${issue?.message ?? 'Validation error'}` };
  }

  return { ok: true, data: parsed.data as Record<string, unknown> };
}
