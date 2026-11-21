import {
  Clvm,
  Coin,
  PublicKey,
  Program,
  fromHex,
  toHex,
} from 'chia-wallet-sdk-wasm';
import { sha256 } from '@noble/hashes/sha2';
import { bech32m } from 'bech32';
import { callChiaRpc, ChiaNetwork } from './chia-rpc-client';
import { getGenesisBytes } from './chia-constants';

const GROUP_ORDER = 0x73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001n;

const DEFAULT_HIDDEN_PUZZLE_HASH = fromHex(
  '711d6c4e32c92e53179b199484cf8c897542bc57f2b22582799f9d657eec4699'
);

export function addressToPuzzleHashBytes(address: string): Uint8Array {
  const decoded = bech32m.decode(address.trim());
  const bytes = Uint8Array.from(bech32m.fromWords(decoded.words));
  if (bytes.length !== 32) {
    throw new Error('Некорректная длина puzzle_hash адреса');
  }
  return bytes;
}

function calculateSyntheticOffsetHex(pkBytes: Uint8Array): string {
  const concat = new Uint8Array(pkBytes.length + DEFAULT_HIDDEN_PUZZLE_HASH.length);
  concat.set(pkBytes, 0);
  concat.set(DEFAULT_HIDDEN_PUZZLE_HASH, pkBytes.length);

  const hashBytes = sha256(concat);
  const hashHex = toHex(hashBytes);
  let rawBigInt = BigInt('0x' + hashHex);

  // Эмулируем Python int.from_bytes(..., signed=True)
  if ((hashBytes[0] & 0x80) !== 0) {
    rawBigInt -= 1n << 256n;
  }

  // Положительный остаток по модулю GROUP_ORDER (как % в Python)
  const offsetBigInt = ((rawBigInt % GROUP_ORDER) + GROUP_ORDER) % GROUP_ORDER;

  return offsetBigInt.toString(16).padStart(64, '0');
}

export interface BuildSpendBundleInput {
  network: ChiaNetwork;
  inputs: Array<{
    coin_pk_hex: string;
    coin_to_spend: {
      parent_coin_info: string;
      puzzle_hash: string;
      amount: number;
    };
    wallet_index: number;
  }>;
  send_to_address: string;
  mojos_to_send: number;
  fee_mojos: number;
}

export async function buildSpendBundleClient(params: BuildSpendBundleInput) {
  const { network, inputs, send_to_address, fee_mojos } = params;
  let mojos_to_send = params.mojos_to_send;

  if (!inputs.length) {
    throw new Error('Список монет пуст!');
  }

  const [stateData, genesisBytes] = await Promise.all([
    callChiaRpc(network, 'get_blockchain_state', {}),
    getGenesisBytes(network),
  ]);

  if (!stateData?.blockchain_state?.sync?.synced) {
    throw new Error('Полная нода Chia синхронизируется. Попробуйте позже.');
  }

  const clvm = new Clvm();
  let totalInputAmount = 0;

  interface ParsedCoinItem {
    coin: Coin;
    coinIdBytes: Uint8Array;
    puzzle: Program;
    puzzleHashBytes: Uint8Array;
    pkBytes: Uint8Array;
    walletIndex: number;
  }

  const parsedCoins: ParsedCoinItem[] = [];

  for (const item of inputs) {
    if (item.wallet_index === undefined || item.wallet_index === null) {
      throw new Error('Критическая ошибка: Не передан wallet_index!');
    }

    const cSrc = item.coin_to_spend;
    const parentBytes = fromHex(String(cSrc.parent_coin_info).replace(/^0x/i, ''));
    const puzzleHashBytes = fromHex(String(cSrc.puzzle_hash).replace(/^0x/i, ''));
    const amt = BigInt(cSrc.amount);

    totalInputAmount += Number(amt);

    const pkBytes = fromHex(String(item.coin_pk_hex).replace(/^0x/i, ''));
    const sdkPk = PublicKey.fromBytes(pkBytes);
    const syntheticPk = sdkPk.deriveSynthetic();

    const baseMod = (clvm as any).p2DelegatedPuzzleOrHiddenPuzzle() as Program;
    const pkAtom = clvm.atom(syntheticPk.toBytes());
    const puzzle = baseMod.curry(Array.of(pkAtom));
    const computedPhHex = toHex(puzzle.treeHash()).toLowerCase();

    if (toHex(puzzleHashBytes).toLowerCase() !== computedPhHex) {
      throw new Error('Критическая ошибка: Пузл-хэш монеты не совпадает с ключом!');
    }

    const coin = new Coin(parentBytes, puzzleHashBytes, amt);
    parsedCoins.push({
      coin,
      coinIdBytes: coin.coinId(),
      puzzle,
      puzzleHashBytes,
      pkBytes,
      walletIndex: Number(item.wallet_index),
    });
  }

  mojos_to_send = mojos_to_send - fee_mojos;
  if (mojos_to_send <= 0) {
    throw new Error('Сумма перевода слишком мала для покрытия комиссии сети!');
  }

  const required = mojos_to_send + fee_mojos;
  if (totalInputAmount < required) {
    throw new Error('Недостаточно выбранных монет на балансе!');
  }

  const targetPhBytes = addressToPuzzleHashBytes(send_to_address);
  const changeAmount = totalInputAmount - required;

  const leadItem = parsedCoins.at(0)!;

  const leadConditions: Program[] = [
    clvm.createCoin(targetPhBytes, BigInt(mojos_to_send)),
  ];

  if (changeAmount > 0) {
    leadConditions.push(
      clvm.createCoin(leadItem.puzzleHashBytes, BigInt(changeAmount))
    );
  }

  if (parsedCoins.length > 1) {
    for (let idx = 1; idx < parsedCoins.length; idx++) {
      const donor = parsedCoins.at(idx)!;
      leadConditions.push(clvm.createPuzzleAnnouncement(donor.coinIdBytes));
    }
  }

  const coinSpendsJsonList: any[] = [];

  for (let idx = 0; idx < parsedCoins.length; idx++) {
    const item = parsedCoins.at(idx)!;
    let currentConds: Program[];

    if (idx === 0) {
      currentConds = leadConditions;
    } else {
      const msgConcat = new Uint8Array(leadItem.puzzleHashBytes.length + item.coinIdBytes.length);
      msgConcat.set(leadItem.puzzleHashBytes, 0);
      msgConcat.set(item.coinIdBytes, leadItem.puzzleHashBytes.length);
      const announcementHash = sha256(msgConcat);
      currentConds = Array.of(clvm.assertPuzzleAnnouncement(announcementHash));
    }

    const condsListProgram = clvm.alloc(currentConds);
    const delegatedPuzzle = clvm.pair(clvm.int(1n), condsListProgram);
    // Стандартное решение для p2_delegated_puzzle_or_hidden_puzzle: (nil delegated_puzzle nil)
    const solution = clvm.alloc(Array.of(clvm.nil(), delegatedPuzzle, clvm.nil()));

    const delTreeHash = delegatedPuzzle.treeHash();
    const signPayload = new Uint8Array(delTreeHash.length + item.coinIdBytes.length + genesisBytes.length);
    signPayload.set(delTreeHash, 0);
    signPayload.set(item.coinIdBytes, delTreeHash.length);
    signPayload.set(genesisBytes, delTreeHash.length + item.coinIdBytes.length);

    const msgHex = toHex(signPayload).toLowerCase();
    const syntheticOffsetHex = calculateSyntheticOffsetHex(item.pkBytes);

    coinSpendsJsonList.push({
      wallet_index: item.walletIndex,
      message_to_sign_hex: msgHex,
      synthetic_offset_hex: syntheticOffsetHex,
      coin: {
        parent_coin_info: '0x' + toHex(item.coin.parentCoinInfo).toLowerCase(),
        puzzle_hash: '0x' + toHex(item.coin.puzzleHash).toLowerCase(),
        amount: Number(item.coin.amount),
      },
      puzzle_reveal: '0x' + toHex(item.puzzle.serialize()).toLowerCase(),
      solution: '0x' + toHex(solution.serialize()).toLowerCase(),
    });
  }

  return {
    success: true,
    integrity_token: 'client-side-verified',
    coin_spends: coinSpendsJsonList,
    verified_target_address: send_to_address,
    verified_mojos_to_send: mojos_to_send,
    audit_info: {
      summary: {
        total_inputs_mojo: totalInputAmount,
        total_outputs_mojo: totalInputAmount,
        fee_network_mojo: fee_mojos,
        is_dust_fee_collected: false,
        is_dust_split_applied: false,
      },
      disposition: {
        target: {
          address: send_to_address,
          puzzle_hash: '0x' + toHex(targetPhBytes).toLowerCase(),
          amount_mojo: mojos_to_send,
        },
        standard_change: {
          wallet_index: leadItem.walletIndex,
          puzzle_hash: '0x' + toHex(leadItem.puzzleHashBytes).toLowerCase(),
          amount_mojo: changeAmount,
        },
      },
    },
  };
}
