/**
 * Trace domain types, payload contracts, and the chunk read/prioritization core (P1).
 *
 * A **trace** is a mark a traveler leaves in the shared world — a signpost, a lantern, and (later
 * phases) gifts/shrines. This module is the single source of truth for their wire shape and the
 * pure prioritization used by the chunk read (P1-SRV-03/04). Framework-agnostic and pure — no
 * Fastify, pg, or DOM types — so client and server agree and it stays unit-testable in Node.
 *
 * The DB stores snake_case columns (see `server/migrations`); this module speaks the camelCase
 * application shape. The server repo layer maps between the two.
 */

/** Trace kinds implemented in the P1 vertical slice. Gift/shrine arrive in P2 (additive). */
export const TRACE_TYPES = ['signpost', 'lantern'] as const;
export type TraceType = (typeof TRACE_TYPES)[number];

/** Is `v` one of the known trace types? Narrows `unknown` at request boundaries. */
export function isTraceType(v: unknown): v is TraceType {
  return typeof v === 'string' && (TRACE_TYPES as readonly string[]).includes(v);
}

/** Warmth each trace type contributes to its chunk on placement. Lanterns are light, so warmer. */
export const TRACE_WARMTH: Readonly<Record<TraceType, number>> = {
  signpost: 1,
  lantern: 2,
};

/** How long each trace type lives before it is eligible for fade/GC (P2). Epoch-ms deltas. */
export const TRACE_TTL_MS: Readonly<Record<TraceType, number>> = {
  signpost: 30 * 24 * 60 * 60 * 1000,
  lantern: 30 * 24 * 60 * 60 * 1000,
};

/**
 * A curated signpost: a template id plus slot fills drawn from approved word banks (P1-CNT-01/02).
 * There is deliberately **no free-text field** — abuse-resistance without moderation (scope §9).
 */
export interface SignpostPayload {
  readonly templateId: string;
  /** slot name → chosen word. Both must exist in the content corpus; validated server-side. */
  readonly slots: Readonly<Record<string, string>>;
}

/** A lantern: a light left in the dark. No authored text; lighting raises chunk warmth. */
export interface LanternPayload {
  readonly note?: never;
}

export type TracePayload = SignpostPayload | LanternPayload;

/**
 * The application shape of a persisted trace. `x`/`y` are world-tile coordinates; `chunkX`/`chunkY`
 * are derived server-side from them (never trusted from the client) via `worldToChunk`.
 */
export interface Trace {
  readonly id: string;
  readonly type: TraceType;
  readonly chunkX: number;
  readonly chunkY: number;
  readonly x: number;
  readonly y: number;
  readonly authorId: string;
  readonly payload: TracePayload;
  /** Denormalized warmth contribution / light strength; feeds prioritization + chunk warmth. */
  readonly warmth: number;
  /** Count of appreciations received; a prioritization signal and an author-reward driver. */
  readonly appreciations: number;
  /** Epoch milliseconds. */
  readonly createdAt: number;
  /** Epoch milliseconds; traces past this are eligible for fade/GC (P2). `null` = no expiry. */
  readonly expiresAt: number | null;
}

// --- Chunk read / prioritization (P1-SRV-03) --------------------------------------------------

/**
 * Max traces returned per chunk (density cap). Keeps chunks legible and read latency bounded
 * regardless of how crowded a chunk gets. Enforced by {@link prioritizeTraces}; P2 revisits the cap.
 */
export const MAX_TRACES_PER_CHUNK = 24;

/** Weights for the freshness + appreciation + light priority score. Tuned in P1; see ADR-003. */
export const PRIORITY_WEIGHTS = {
  /** Half-life of the freshness term, in milliseconds (~7 days). */
  freshnessHalfLifeMs: 7 * 24 * 60 * 60 * 1000,
  appreciation: 3,
  warmth: 1,
} as const;

/**
 * Priority score for a trace at time `now`. Higher = more likely to survive the density cap.
 * Combines exponential freshness decay with appreciation and warmth (light) — the three signals
 * in the P1-SRV-03 strategy. Pure and monotonic in each signal.
 */
export function tracePriority(trace: Trace, now: number): number {
  const ageMs = Math.max(0, now - trace.createdAt);
  const freshness = Math.pow(2, -ageMs / PRIORITY_WEIGHTS.freshnessHalfLifeMs);
  return (
    freshness +
    PRIORITY_WEIGHTS.appreciation * trace.appreciations +
    PRIORITY_WEIGHTS.warmth * trace.warmth
  );
}

/**
 * Order `traces` by descending priority and return at most `cap` of them — the density-capped,
 * prioritized list a chunk read returns (P1-SRV-03/04). Ties break by `createdAt` desc then `id`
 * asc so the result is deterministic across clients and index-friendly. Does not mutate the input.
 */
export function prioritizeTraces(
  traces: readonly Trace[],
  now: number,
  cap: number = MAX_TRACES_PER_CHUNK,
): Trace[] {
  return [...traces]
    .sort((a, b) => {
      const byPriority = tracePriority(b, now) - tracePriority(a, now);
      if (byPriority !== 0) return byPriority;
      if (b.createdAt !== a.createdAt) return b.createdAt - a.createdAt;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    })
    .slice(0, Math.max(0, cap));
}

// --- API contracts (P1-SRV-04/05/07) ----------------------------------------------------------

/** `POST /trace` body. Server derives chunk coords + `expires_at`; never trusts client chunk ids. */
export interface PlaceTraceRequest {
  readonly type: TraceType;
  readonly x: number;
  readonly y: number;
  readonly payload: TracePayload;
}

export interface PlaceTraceResponse {
  readonly trace: Trace;
  /** Author's mote balance after paying the placement cost. */
  readonly motes: number;
}

/** `GET /world/chunks?ids=cx,cy;cx,cy` response: capped, prioritized traces + warmth per chunk. */
export interface ChunkTraces {
  readonly chunkId: string;
  readonly warmth: number;
  readonly traces: readonly Trace[];
}

export interface ChunksResponse {
  readonly chunks: readonly ChunkTraces[];
}

/** `POST /trace/:id/appreciate` response. `applied` is false when it was a duplicate no-op. */
export interface AppreciateResponse {
  readonly traceId: string;
  readonly appreciations: number;
  readonly applied: boolean;
}
