import { NextRequest, NextResponse } from 'next/server';
import { callChiaRpc } from '@/lib/utils/chia-rpc-client';
import { deriveWalletAddressData } from '@/lib/utils/chia-address';

import { signChiaTransaction, calculateChiaCoinId, deriveMasterPublicKey } from '@/lib/utils/crypto';
import { validateChiaAddress } from '@/lib/utils/chia-validator';
import { buildSpendBundleClient } from '@/lib/utils/chia-tx-builder';
import { packageSignedSpendBundle } from '@/lib/utils/chia-bundle-packager';

const DRIP_MOJOS = 500_000_000_000; // 0.5 TXCH
const FEE_MOJOS = 50_000_000;       // 0.00005 TXCH комиссия сети
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

const cooldownMap = new Map<string, number>();
let faucetMutex: Promise<void> = Promise.resolve();
let cachedFaucetAddr: ReturnType<typeof deriveWalletAddressData> | null = null;

export async function POST(req: NextRequest) {
  let body: { address?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const targetAddr = String(body.address || '').trim().toLowerCase();
  const validation = validateChiaAddress(targetAddr, 'testnet11');
  if (!validation.isValid) {
    return NextResponse.json({ error: validation.error || 'Invalid txch1 address' }, { status: 400 });
  }

  console.log('ENV KEYS:', Object.keys(process.env).filter(k => k.includes('FAUCET') || k.includes('NEXT')));

console.log(333)
  const mnemonic = process.env.FAUCET_MNEMONIC?.trim();
  console.log(mnemonic)
  if (!mnemonic) {
    return NextResponse.json({ error: 'Faucet wallet is not configured' }, { status: 500 });
  }

  // Антиспам: 1 раз в 24 часа на адрес и IP
  const forwarded = req.headers.get('x-forwarded-for') ?? '';
  const ip = forwarded.split(',').at(0)?.trim() || 'unknown';

  const now = Date.now();
  if (
    now - (cooldownMap.get(`addr:${targetAddr}`) ?? 0) < COOLDOWN_MS ||
    (ip !== 'unknown' && now - (cooldownMap.get(`ip:${ip}`) ?? 0) < COOLDOWN_MS)
  ) {
    return NextResponse.json({ error: 'Rate limit exceeded: 1 request per 24 hours' }, { status: 429 });
  }

  let releaseMutex!: () => void;
  const prevMutex = faucetMutex;
  faucetMutex = new Promise<void>((resolve) => {
    releaseMutex = resolve;
  });
  await prevMutex;

  try {
    // 1. Вычисляем и кэшируем 0-й адрес крана из FAUCET_MNEMONIC
    if (!cachedFaucetAddr) {
      const masterPkHex = await deriveMasterPublicKey(mnemonic);
      cachedFaucetAddr = deriveWalletAddressData(masterPkHex, 0, 'testnet11');
    }
    const faucetAddr = cachedFaucetAddr;

    // 2. Берем непотраченные монеты крана и проверяем мемпул
    const [coinsRes, mempoolRes] = await Promise.all([
      callChiaRpc('testnet11', 'get_coin_records_by_puzzle_hashes', {
        puzzle_hashes: [faucetAddr.puzzle_hash],
        include_spent_coins: false,
      }),
      callChiaRpc('testnet11', 'get_all_mempool_tx_ids', {}).catch(() => ({ tx_ids: [] })),
    ]);

    const mempoolSpentIds = new Set<string>();
    const txIds: string[] = mempoolRes?.tx_ids ?? [];
    if (txIds.length > 0) {
      const items = await Promise.all(
        txIds.slice(0, 20).map((id) =>
          callChiaRpc('testnet11', 'get_mempool_item_by_tx_id', { tx_id: id }).catch(() => null)
        )
      );
      for (const item of items) {
        for (const cs of item?.mempool_item?.spend_bundle?.coin_spends ?? []) {
          const cid = calculateChiaCoinId(cs.coin.parent_coin_info, cs.coin.puzzle_hash, cs.coin.amount);
          mempoolSpentIds.add(cid.toLowerCase());
        }
      }
    }

    // 3. Подбираем свободные монеты под 0.5 TXCH + комиссии
    const builderFee = Number(process.env.NEXT_PUBLIC_BUILDER_FEE_MOJOS || 10_000_000_000);
    const totalToSendWithFees = DRIP_MOJOS + FEE_MOJOS + builderFee;

    const available = (coinsRes?.coin_records ?? [])
      .filter((r: any) => !r.spent)
      .filter((r: any) => {
        const cid = calculateChiaCoinId(r.coin.parent_coin_info, r.coin.puzzle_hash, r.coin.amount);
        return !mempoolSpentIds.has(cid.toLowerCase());
      })
      .sort((a: any, b: any) => Number(b.coin.amount) - Number(a.coin.amount));

    const selectedInputs: any[] = [];
    let totalIn = 0;
    for (const r of available) {
      selectedInputs.push({
        coin_pk_hex: faucetAddr.address_pubkey_hex,
        coin_to_spend: r.coin,
        wallet_index: 0,
      });
      totalIn += Number(r.coin.amount);
      if (totalIn >= totalToSendWithFees) break;
    }

    if (totalIn < totalToSendWithFees) {
      return NextResponse.json(
        { error: 'Faucet is out of funds or waiting for block confirmation' },
        { status: 503 }
      );
    }

    // 4. Собираем, подписываем и упаковываем через твои готовые функции
    const built = await buildSpendBundleClient({
      network: 'testnet11',
      inputs: selectedInputs,
      send_to_address: targetAddr,
      mojos_to_send: totalToSendWithFees,
      fee_mojos: FEE_MOJOS,
    });

    const signaturesList = built.coin_spends.map((cs) =>
      signChiaTransaction({
        mnemonic,
        walletIndex: cs.wallet_index,
        messageHex: cs.message_to_sign_hex,
        syntheticOffsetHex: cs.synthetic_offset_hex,
      })
    );

    const packaged = packageSignedSpendBundle({
      coinSpendsList: built.coin_spends,
      signaturesList,
      network: 'testnet11',
    });

    // 5. Отправляем в сеть через единый callChiaRpc
    const pushRes = await callChiaRpc<{ status?: string }>('testnet11', 'push_tx', {
      spend_bundle: packaged.spendBundleJson,
    });

    if (pushRes.status && pushRes.status !== 'SUCCESS') {
      throw new Error(`Node rejected tx: ${pushRes.status}`);
    }

    cooldownMap.set(`addr:${targetAddr}`, now);
    if (ip !== 'unknown') cooldownMap.set(`ip:${ip}`, now);

    return NextResponse.json({
      success: true,
      txId: packaged.txIdHex,
      amount_mojo: DRIP_MOJOS,
    });
  } catch (err: any) {
    console.error('Faucet error:', err);
    return NextResponse.json({ error: err.message || 'Faucet broadcast failed' }, { status: 500 });
  } finally {
    releaseMutex();
  }
}
