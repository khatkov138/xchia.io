import {
  Clvm,
  Coin,
  CoinSpend,
  SpendBundle,
  Signature,
  fromHex,
  toHex,
} from 'chia-wallet-sdk-wasm';
import { ChiaNetwork } from './chia-rpc-client';
import { puzzleHashToAddress } from './crypto';

export interface PackageSpendBundleParams {
  coinSpendsList: any[];
  signaturesList: string[];
  network: ChiaNetwork;
}

export function packageSignedSpendBundle({
  coinSpendsList,
  signaturesList,
  network,
}: PackageSpendBundleParams) {
  // 1. Парсим и агрегируем 96-байтные BLS-подписи через нативный Rust WASM
  const sdkSignatures = signaturesList.map((sigHex) => {
    const clean = sigHex.replace(/^0x/i, '').trim().toLowerCase();
    return Signature.fromBytes(fromHex(clean));
  });

  const aggregatedSig = Signature.aggregate(sdkSignatures);
  const aggregatedSigHex = toHex(aggregatedSig.toBytes()).toLowerCase();

  // 2. Сборка нативного SpendBundle и инспектирование созданных монет через Rust CLVM
  const clvm = new Clvm();
  const sdkCoinSpends: CoinSpend[] = [];
  const spentCoinsInfo: any[] = [];
  const allOutputs: any[] = [];

  for (const cs of coinSpendsList) {
    const parentBytes = fromHex(String(cs.coin.parent_coin_info).replace(/^0x/i, ''));
    const phBytes = fromHex(String(cs.coin.puzzle_hash).replace(/^0x/i, ''));
    const amount = BigInt(cs.coin.amount);

    const coin = new Coin(parentBytes, phBytes, amount);
    const coinIdHex = '0x' + toHex(coin.coinId()).toLowerCase();

    spentCoinsInfo.push({
      coin_id: coinIdHex,
      puzzle_hash: '0x' + toHex(phBytes).toLowerCase(),
      addr: puzzleHashToAddress('0x' + toHex(phBytes).toLowerCase(), network),
      amount: Number(amount),
    });

    const revealBytes = fromHex(String(cs.puzzle_reveal).replace(/^0x/i, ''));
    const solutionBytes = fromHex(String(cs.solution).replace(/^0x/i, ''));

    const puzzleProg = clvm.deserialize(revealBytes);
    const solutionProg = clvm.deserialize(solutionBytes);

    // Прогоняем CLVM и достаем условия CREATE_COIN (код 51)
    const runOutput = puzzleProg.run(solutionProg, 11_000_000_000n, false);
    const condsList = runOutput.value.toList() ?? [];

    for (const cond of condsList) {
      const items = cond.toList() ?? [];
      if (items.length >= 3 && items.at(0)?.toInt() === 51n) {
        const outPhBytes = items.at(1)?.toAtom();
        const outAmt = items.at(2)?.toInt();

        if (outPhBytes && outAmt !== null && outAmt !== undefined) {
          const newCoin = new Coin(coin.coinId(), outPhBytes, outAmt);
          const outPhHex = '0x' + toHex(outPhBytes).toLowerCase();

          allOutputs.push({
            coin_id: '0x' + toHex(newCoin.coinId()).toLowerCase(),
            parent_coin_info: coinIdHex,
            puzzle_hash: outPhHex,
            addr: puzzleHashToAddress(outPhHex, network),
            amount: Number(outAmt),
          });
        }
      }
    }

    sdkCoinSpends.push(new CoinSpend(coin, revealBytes, solutionBytes));
  }

  // 3. Помечаем сдачу (третий выход по правилу кошелька: индекс 2)
  const createdCoins = allOutputs.map((out, idx) => ({
    ...out,
    is_change: idx === 2,
  }));

  const totalIn = spentCoinsInfo.reduce((s, c) => s + c.amount, 0);
  const totalOut = createdCoins.reduce((s, c) => s + c.amount, 0);
  const feeMojo = Math.max(0, totalIn - totalOut);

  const spendBundle = new SpendBundle(sdkCoinSpends, aggregatedSig);
  const txIdHex = '0x' + toHex(spendBundle.hash()).toLowerCase();

  const spendBundleJson = {
    coin_spends: coinSpendsList.map((cs) => ({
      coin: {
        parent_coin_info: cs.coin.parent_coin_info,
        puzzle_hash: cs.coin.puzzle_hash,
        amount: Number(cs.coin.amount),
      },
      puzzle_reveal: cs.puzzle_reveal,
      solution: cs.solution,
    })),
    aggregated_signature: '0x' + aggregatedSigHex,
  };

  return {
    txIdHex,
    spendBundleJson,
    trackedInfo: {
      fee_mojo: feeMojo,
      spent_coins: spentCoinsInfo,
      created_coins: createdCoins,
    },
  };
}
