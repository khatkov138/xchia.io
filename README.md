# xchia.io

A community-driven non-custodial wallet and blockchain network explorer for the Chia Network ecosystem. This project combines secure client-side transaction signing with a fast, reactive blockchain web explorer.

## Links

- **Official Website:** [xchia.io](https://xchia.io)
- **Developer / Feedback:** [@khatkov138](https://t.me) (Telegram)

## Tech Stack

### Frontend
- Next.js 16 (App Router)
- React Query (@tanstack/react-query)
- Tailwind CSS / Lucide React
- Client-side BLS cryptographic signing (WASM/JS)

### Backend
- Python 3.10+
- FastAPI
- Uvicorn
- Chia Full Node RPC integration

## Why xchia.io? (Philosophy & Trust)

This project was initially created for personal use. The official Chia clients are heavy and slow, while third-party alternatives often lack transparency, making it hard to trust them with substantial funds. **I personally hold and manage my own XCH assets using this platform.** 

Since security is a major concern in the Web3 space, **the entire repository is open-source, and I highly welcome any independent audits, code reviews, and bug bounty contributions.** If you find any vulnerabilities or have suggestions to improve the cryptographic boundaries, feel free to open an issue or reach out directly.

---

## Core Features & Architecture

### 1. Unified Ecosystem (Built-in Explorer)
You don't need to rely on third-party websites or external tools to track your operations. The app features a **fully integrated, real-time blockchain explorer**. You can review blocks, track fresh coins, and inspect address histories instantly without ever leaving the secure platform context.

### 2. Strict Non-Custodial Security (Client-Side Signing)
**Your mnemonic phrase (24 words) and private keys NEVER leave your browser.** 
- The backend handles contract preparation, puzzle serialization, and public key mapping.
- The actual cryptographic signing is performed strictly locally inside your browser using raw BLS/WASM libraries.
- The server only receives final, aggregated signatures (`signatures_list`) to broadcast them to the Chia mempool. It is mathematically impossible for the server to steal your keys.

### 3. Smart Universal Search
A single unified endpoint automatically detects the nature of any query format (Block Height, Bech32m Address, Coin ID, Block Hash, or Puzzle Hash) and seamlessly triggers SPA routing on the frontend, saving database overhead and node RPC calls.

### 4. Network Flooding Prevention
To handle high block generation bursts in the Chia network without crashing the node, the frontend utilizes customized debouncing layers. Heavy HTTP node requests are bundled and throttled, ensuring a clean, stutter-free user interface.

## License

MIT. Created by the community, for the community.
