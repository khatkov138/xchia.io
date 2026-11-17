import { NextRequest, NextResponse } from 'next/server';
import https from 'node:https';
import fs from 'node:fs';
import { LIMITS, NODES, Network } from './config';
import { validateRequest } from './validator';

const agents: Partial<Record<Network, https.Agent>> = {};

const ALLOWED_ORIGINS = new Set([
  'http://localhost:3000',
  'https://xchia.io',
  'https://www.xchia.io',
]);

function getAgent(network: Network): https.Agent {
  if (!agents[network]) {
    const node = NODES[network];
    agents[network] = new https.Agent({
      cert: fs.readFileSync(node.cert),
      key: fs.readFileSync(node.key),
      rejectUnauthorized: false,
      keepAlive: true,
    });
  }
  return agents[network]!;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ network: string; method: string }> }
) {
  const apiKey = req.headers.get('x-api-key');

  if (apiKey) {
    // 1. Внешний разработчик (по API-ключу)
    // TODO: проверка ключа в БД и списание 1 запроса из суточного лимита (1000/день)
  } else {
    // 2. Внутренний запрос с фронтенда xchia.io (работает без суточных лимитов)
    const origin = req.headers.get('origin');
    const secFetchSite = req.headers.get('sec-fetch-site');

    const isSameOrigin = secFetchSite === 'same-origin';
    const isAllowedOrigin = origin !== null && ALLOWED_ORIGINS.has(origin);

    if (!isSameOrigin && !isAllowedOrigin) {
      return NextResponse.json(
        { success: false, error: 'Missing X-API-Key header' },
        { status: 401 }
      );
    }
  }

  const { network, method } = await params;

  if (!(network in NODES)) {
    return NextResponse.json({ success: false, error: 'Invalid network' }, { status: 400 });
  }

  let body: unknown = {};
  try {
    const raw = await req.text();
    if (raw.trim()) body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ success: false, error: 'Malformed JSON body' }, { status: 400 });
  }

  const validation = validateRequest(method, body);
  if (!validation.ok) {
    return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
  }

  const net = network as Network;
  const payload = JSON.stringify(validation.data);

  return new Promise<NextResponse>((resolve) => {
    const rpcReq = https.request(
      {
        hostname: '127.0.0.1',
        port: NODES[net].port,
        path: `/${method}`,
        method: 'POST',
        agent: getAgent(net),
        timeout: LIMITS.NODE_TIMEOUT_MS,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
          if (data.length > LIMITS.MAX_RESPONSE_BYTES) {
            rpcReq.destroy();
            resolve(NextResponse.json({ success: false, error: 'Response too large' }, { status: 413 }));
          }
        });
        res.on('end', () => {
          try {
            resolve(NextResponse.json(JSON.parse(data)));
          } catch {
            resolve(NextResponse.json({ success: false, error: 'Invalid response from node' }, { status: 502 }));
          }
        });
      }
    );

    rpcReq.on('timeout', () => {
      rpcReq.destroy();
      resolve(NextResponse.json({ success: false, error: 'Node RPC timeout' }, { status: 504 }));
    });

    rpcReq.on('error', (err) => {
      resolve(NextResponse.json({ success: false, error: err.message }, { status: 502 }));
    });

    rpcReq.write(payload);
    rpcReq.end();
  });
}
