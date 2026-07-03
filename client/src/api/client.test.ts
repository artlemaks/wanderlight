import { describe, it, expect } from 'vitest';
import { createApiClient, chunkIdsParam, type TokenStore } from './client';

function mapStore(): TokenStore {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

/** A fetch fake that records requests and replies with a fixed body + optional device token. */
function fakeFetch(deviceToken?: string) {
  const calls: Array<{ url: string; method: string; headers: Headers; body?: string }> = [];
  const fn = (async (url: string, init: RequestInit = {}) => {
    calls.push({
      url,
      method: init.method ?? 'GET',
      headers: new Headers(init.headers),
      body: init.body as string | undefined,
    });
    const headers = new Headers();
    if (deviceToken) headers.set('x-device-token', deviceToken);
    return {
      ok: true,
      status: 200,
      headers,
      json: async () => ({ ok: true }),
    } as unknown as Response;
  }) as unknown as typeof fetch;
  return { fn, calls };
}

describe('chunkIdsParam', () => {
  it('serializes coords into the ids query format', () => {
    expect(
      chunkIdsParam([
        { cx: 0, cy: 0 },
        { cx: -1, cy: 2 },
      ]),
    ).toBe('0,0;-1,2');
  });
});

describe('ApiClient', () => {
  it('persists the device token returned by the server and sends it on later calls', async () => {
    const store = mapStore();
    const { fn, calls } = fakeFetch('tok-123');
    const api = createApiClient({ store, fetchFn: fn });

    await api.startSession();
    expect(store.getItem('wl.deviceToken')).toBe('tok-123');

    await api.appreciate('trace-1');
    expect(calls[1]!.headers.get('x-device-token')).toBe('tok-123');
    expect(calls[1]!.url).toContain('/trace/trace-1/appreciate');
    expect(calls[1]!.method).toBe('POST');
  });

  it('builds the chunk read URL from coords', async () => {
    const { fn, calls } = fakeFetch();
    const api = createApiClient({ store: mapStore(), fetchFn: fn });
    await api.getChunks([{ cx: 1, cy: 2 }]);
    expect(decodeURIComponent(calls[0]!.url)).toContain('ids=1,2');
  });

  it('throws on a non-ok response', async () => {
    const fn = (async () =>
      ({
        ok: false,
        status: 402,
        headers: new Headers(),
        json: async () => ({}),
      }) as unknown as Response) as unknown as typeof fetch;
    const api = createApiClient({ store: mapStore(), fetchFn: fn });
    await expect(api.placeTrace({ type: 'lantern', x: 0, y: 0, payload: {} })).rejects.toThrow(
      /402/,
    );
  });
});
