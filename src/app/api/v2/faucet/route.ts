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
const recentlySpentCoins = new Map<string, number>();
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

  const mnemonic = process.env.FAUCET_MNEMONIC?.trim();
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
    // 1. Вычисляем и кэшируем только 1-й адрес (index = 0)
    if (!cachedFaucetAddr) {
      const masterPkHex = await deriveMasterPublicKey(mnemonic);
      cachedFaucetAddr = deriveWalletAddressData(masterPkHex, 0, 'testnet11');
    }
    const faucetAddr = cachedFaucetAddr;

    // Запрещаем отправку на адрес самого крана
    if (targetAddr === faucetAddr.address.toLowerCase()) {
      return NextResponse.json(
        { error: 'Cannot send to the faucet treasury address itself' },
        { status: 400 }
      );
    }



    // 2. Забираем непотраченные монеты с 1-го адреса
    const coinsRes = await callChiaRpc('testnet11', 'get_coin_records_by_puzzle_hashes', {
      puzzle_hashes: [faucetAddr.puzzle_hash],
      include_spent_coins: false,
    });

    // Чистим локальный кэш потраченных монет старше 3 минут
    const threeMinAgo = Date.now() - 3 * 60 * 1000;
    for (const [cid, ts] of recentlySpentCoins.entries()) {
      if (ts < threeMinAgo) recentlySpentCoins.delete(cid);
    }

    // 3. Подбираем свободные монеты под 0.5 TXCH + комиссии
    const builderFee = Number(process.env.NEXT_PUBLIC_BUILDER_FEE_MOJOS || 10_000_000_000);
    const totalToSendWithFees = DRIP_MOJOS + FEE_MOJOS + builderFee;

    const available = (coinsRes?.coin_records ?? [])
      .filter((r: any) => !r.spent)
      .filter((r: any) => {
        const cid = calculateChiaCoinId(r.coin.parent_coin_info, r.coin.puzzle_hash, r.coin.amount).toLowerCase();
        return !recentlySpentCoins.has(cid);
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
      if (totalIn >= totalToSendWithFees || selectedInputs.length >= 25) break;
    }

    if (totalIn < totalToSendWithFees) {
      return NextResponse.json(
        {
          error: 'Faucet is out of funds or waiting for block confirmation',
          deposit_address: faucetAddr.address,
          total_found_mojo: totalIn,
        },
        { status: 503 }
      );
    }

    // 4. Собираем, подписываем и упаковываем SpendBundle
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
        walletIndex: 0,
        messageHex: cs.message_to_sign_hex,
        syntheticOffsetHex: cs.synthetic_offset_hex,
      })
    );

    const packaged = packageSignedSpendBundle({
      coinSpendsList: built.coin_spends,
      signaturesList,
      network: 'testnet11',
    });

    // 5. Отправляем в сеть
    const pushRes = await callChiaRpc<{ status?: string }>('testnet11', 'push_tx', {
      spend_bundle: packaged.spendBundleJson,
    });

    if (pushRes.status && pushRes.status !== 'SUCCESS') {
      throw new Error(`Node rejected tx: ${pushRes.status}`);
    }

    const spentTs = Date.now();
    for (const inp of selectedInputs) {
      const cid = calculateChiaCoinId(
        inp.coin_to_spend.parent_coin_info,
        inp.coin_to_spend.puzzle_hash,
        inp.coin_to_spend.amount
      ).toLowerCase();
      recentlySpentCoins.set(cid, spentTs);
    }

    cooldownMap.set(`addr:${targetAddr}`, spentTs);
    if (ip !== 'unknown') cooldownMap.set(`ip:${ip}`, spentTs);

    return NextResponse.json({
      success: true,
      txId: packaged.txIdHex,
      amount_mojo: DRIP_MOJOS,
    });
  } catch (err: any) {
    process.stderr.write(`[FAUCET_ERR] ${err?.stack || err}\n`);
    return NextResponse.json({ error: err?.message || 'Faucet broadcast failed' }, { status: 500 });
  } finally {
    releaseMutex();
  }
}


// Добавь этот экспорт в конец файла src/app/api/v2/faucet/route.ts
export async function GET() {
  try {
    const mnemonic = process.env.FAUCET_MNEMONIC?.trim();
    if (!mnemonic) {
      return NextResponse.json({ address: null, balance_mojo: 0 });
    }

    if (!cachedFaucetAddr) {
      const masterPkHex = await deriveMasterPublicKey(mnemonic);
      cachedFaucetAddr = deriveWalletAddressData(masterPkHex, 0, 'testnet11');
    }

    const coinsRes = await callChiaRpc('testnet11', 'get_coin_records_by_puzzle_hashes', {
      puzzle_hashes: [cachedFaucetAddr.puzzle_hash],
      include_spent_coins: false,
    }).catch(() => ({ coin_records: [] }));

    const balanceMojo = (coinsRes?.coin_records ?? [])
      .filter((r: any) => !r.spent)
      .reduce((acc: number, r: any) => acc + Number(r.coin.amount || 0), 0);

    return NextResponse.json({
      address: cachedFaucetAddr.address,
      balance_mojo: balanceMojo,
    });
  } catch {
    return NextResponse.json({ address: null, balance_mojo: 0 });
  }
}
