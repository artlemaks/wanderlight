/**
 * Client HTTP layer (P2) — the single typed seam between the game client and the server API.
 *
 * The P1 slice computed *what* to fetch (`world/chunkFetch`) but never made the calls; this module is
 * that missing seam. It carries the anonymous device token across requests (mirrored back by the
 * server in the `x-device-token` header) so a returning visitor is the same player. Kept dependency-
 * free (just `fetch`) so it runs in the browser and is easy to fake in tests. The pure helpers
 * (`chunkIdsParam`, token storage) are unit-tested; the network methods are thin.
 */

import type {
  ChunksResponse,
  PlaceTraceRequest,
  PlaceTraceResponse,
  AppreciateResponse,
  ClaimGiftResponse,
  LightLanternResponse,
  ShrineOfferingResponse,
} from '@wanderlight/shared';

const DEVICE_TOKEN_HEADER = 'x-device-token';
const DEVICE_TOKEN_STORAGE_KEY = 'wl.deviceToken';

/** Serialize chunk coords into the `ids=cx,cy;cx,cy` query value the world/shrine reads expect. */
export function chunkIdsParam(chunks: ReadonlyArray<{ cx: number; cy: number }>): string {
  return chunks.map(({ cx, cy }) => `${cx},${cy}`).join(';');
}

/** Minimal key/value store the token persists in — `localStorage` in the browser, a Map in tests. */
export interface TokenStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface ApiClientOptions {
  readonly baseUrl?: string;
  readonly store?: TokenStore;
  readonly fetchFn?: typeof fetch;
}

export interface ApiClient {
  startSession(): Promise<{ playerId: string; motes: number }>;
  getChunks(chunks: ReadonlyArray<{ cx: number; cy: number }>): Promise<ChunksResponse>;
  placeTrace(req: PlaceTraceRequest): Promise<PlaceTraceResponse>;
  appreciate(traceId: string): Promise<AppreciateResponse>;
  claimGift(traceId: string): Promise<ClaimGiftResponse>;
  lightLantern(traceId: string): Promise<LightLanternResponse>;
  makeOffering(x: number, y: number): Promise<ShrineOfferingResponse>;
}

/**
 * Build an API client. `baseUrl` defaults to same-origin. Reads/writes the device token via `store`
 * (defaults to `localStorage` when available) so callers never manage it.
 */
export function createApiClient(opts: ApiClientOptions = {}): ApiClient {
  const baseUrl = opts.baseUrl ?? '';
  const fetchFn = opts.fetchFn ?? fetch;
  const store: TokenStore | null =
    opts.store ?? (typeof localStorage !== 'undefined' ? localStorage : null);

  function readToken(): string | null {
    return store?.getItem(DEVICE_TOKEN_STORAGE_KEY) ?? null;
  }

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('content-type', 'application/json');
    const token = readToken();
    if (token) headers.set(DEVICE_TOKEN_HEADER, token);

    const res = await fetchFn(`${baseUrl}${path}`, { ...init, headers });
    const returned = res.headers.get(DEVICE_TOKEN_HEADER);
    if (returned) store?.setItem(DEVICE_TOKEN_STORAGE_KEY, returned);
    if (!res.ok) {
      throw new Error(`${init.method ?? 'GET'} ${path} failed: ${res.status}`);
    }
    return (await res.json()) as T;
  }

  return {
    startSession() {
      return request('/session', { method: 'POST' });
    },
    getChunks(chunks) {
      return request(`/world/chunks?ids=${encodeURIComponent(chunkIdsParam(chunks))}`);
    },
    placeTrace(req) {
      return request('/trace', { method: 'POST', body: JSON.stringify(req) });
    },
    appreciate(traceId) {
      return request(`/trace/${encodeURIComponent(traceId)}/appreciate`, { method: 'POST' });
    },
    claimGift(traceId) {
      return request(`/trace/${encodeURIComponent(traceId)}/claim`, { method: 'POST' });
    },
    lightLantern(traceId) {
      return request(`/trace/${encodeURIComponent(traceId)}/light`, { method: 'POST' });
    },
    makeOffering(x, y) {
      return request('/shrine/offering', { method: 'POST', body: JSON.stringify({ x, y }) });
    },
  };
}
