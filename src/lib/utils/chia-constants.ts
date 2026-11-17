import { fromHex } from "chia-wallet-sdk-wasm";
import { ChiaNetwork } from "./chia-rpc-client";

export const GENESIS_CHALLENGES: Record<ChiaNetwork, string> = {
  mainnet: 'ccd5bb71183532bff220ba46c268991a3ff07eb358e8255a65c30a2dce0e5fbb',
  testnet11: '37a90eb5185a9c4439a91ddc98bbadce7b4feba060d50116a067de66bf236615',
};

export function getGenesisBytes(network: ChiaNetwork): Uint8Array {
  const hex = GENESIS_CHALLENGES[network];
  if (!hex) throw new Error(`Unknown network: ${network}`);
  return fromHex(hex);
}
