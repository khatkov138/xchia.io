import chiaBls from 'chia-bls';
import { sha256 } from '@noble/hashes/sha2';
import { PublicKey, standardPuzzleHash, toHex } from 'chia-wallet-sdk-wasm';
import { puzzleHashToAddress } from './crypto';

const { PrivateKey, JacobianPoint } = chiaBls;
const GROUP_ORDER = 0x73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001n;

export interface DerivedWalletAddress {
  index: number;
  address: string;
  puzzle_hash: string;
  address_pubkey_hex: string;
}

const addressCache = new Map<string, DerivedWalletAddress>();

function bytesToScalarSk(hashBytes: Uint8Array): any {
  const hashHex = Buffer.from(hashBytes).toString('hex');
  const scalarBigInt = BigInt('0x' + hashHex) % GROUP_ORDER;

  const scalarBytes = new Uint8Array(32);
  let temp = scalarBigInt;
  for (let i = 31; i >= 0; i--) {
    scalarBytes[i] = Number(temp & 0xffn);
    temp >>= 8n;
  }
  return PrivateKey.fromBytes(scalarBytes);
}

// 1. Unhardened деривация публичного ключа через chia-bls
export function chiaDeriveChildPkUnhardened(parentPk: any, index: number): any {
  const parentPkBytes = parentPk.toBytes();

  const buffer = new ArrayBuffer(4);
  new DataView(buffer).setUint32(0, index, false);
  const indexBytes = new Uint8Array(buffer);

  const concat = new Uint8Array(52);
  concat.set(parentPkBytes, 0);
  concat.set(indexBytes, 48);

  const hashBytes = sha256(concat);
  const offsetSk = bytesToScalarSk(hashBytes);

  return parentPk.add(offsetSk.getG1());
}

// 2. Получение публичного ключа кошелька по пути m/12381/8444/2/index
export function getWalletPkUnhardened(masterPkHex: string, index: number): any {
  const cleanHex = masterPkHex.replace(/^0x/i, '').trim();
  const masterPk = JacobianPoint.fromHex(cleanHex, false);

  const lvl1 = chiaDeriveChildPkUnhardened(masterPk, 12381);
  const lvl2 = chiaDeriveChildPkUnhardened(lvl1, 8444);
  const walletBranchPk = chiaDeriveChildPkUnhardened(lvl2, 2);

  return chiaDeriveChildPkUnhardened(walletBranchPk, index);
}

// 3. Главная функция с автоматическим кэшированием
export function deriveWalletAddressData(
  masterPkHex: string,
  index: number,
  network: 'mainnet' | 'testnet11'
): DerivedWalletAddress {
  const cacheKey = `${network}:${masterPkHex}:${index}`;
  const cached = addressCache.get(cacheKey);
  if (cached) return cached;

  const walletPk = getWalletPkUnhardened(masterPkHex, index);
  const walletPkBytes = walletPk.toBytes();

  // Делаем синтетический ключ и считаем стандартный puzzle_hash через Rust WASM
  const sdkPk = PublicKey.fromBytes(walletPkBytes);
  const puzzleHashBytes = standardPuzzleHash(sdkPk.deriveSynthetic());

  const puzzleHash = '0x' + toHex(puzzleHashBytes).toLowerCase();
  const address = puzzleHashToAddress(puzzleHash, network);

  const result: DerivedWalletAddress = {
    index,
    address,
    puzzle_hash: puzzleHash,
    address_pubkey_hex: '0x' + Buffer.from(walletPkBytes).toString('hex').toLowerCase(),
  };

  addressCache.set(cacheKey, result);
  return result;
}
