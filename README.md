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

## Core Architecture Features

1. **Non-Custodial Security:** Mnemonics (24 words) and private keys are processed strictly locally within the user's browser. Only final aggregated cryptographic signatures are transmitted to the backend.
2. **Network Optimization:** Node state requests (latest blocks, fresh coins) are debounced on the frontend to prevent HTTP request flooding during high block frequencies.
3. **Universal Search:** A single smart endpoint automatically detects the entity type (Block Height, Bech32m Address, Coin ID, Block Hash, or Puzzle Hash) and handles SPA routing seamlessly.

## License

MIT. Created by the community, for the community.
