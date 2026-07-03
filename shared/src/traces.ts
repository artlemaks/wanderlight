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

/**
 * Trace kinds. P1 shipped `signpost`/`lantern`; P2 adds `gift` (a wrapped light a finder may claim
 * once) and `shrine` (a shared, growing structure at a landmark). All are additive.
 */
export const TRACE_TYPES = ['signpost', 'lantern', 'gift', 'shrine'] as const;
export type TraceType = (typeof TRACE_TYPES)[number];

/**
 * Trace kinds a *player* may place directly via `POST /trace`. Shrines are not placed here — they
 * are system-authored and grown through offerings (P2-SRV-02) — so they are excluded.
 */
export const PLACEABLE_TRACE_TYPES = ['signpost', 'lantern', 'gift'] as const;
export type PlaceableTraceType = (typeof PLACEABLE_TRACE_TYPES)[number];

/** Is `v` one of the known trace types? Narrows `unknown` at request boundaries. */
export function isTraceType(v: unknown): v is TraceType {
  return typeof v === 'string' && (TRACE_TYPES as readonly string[]).includes(v);
}

/** Is `v` a player-placeable trace type (excludes system-only `shrine`)? */
export function isPlaceableTraceType(v: unknown): v is PlaceableTraceType {
  return typeof v === 'string' && (PLACEABLE_TRACE_TYPES as readonly string[]).includes(v);
}

/**
 * Warmth each trace type contributes to its chunk on placement. Lanterns are light; shrines are
 * landmark hearths, so warmest.
 */
export const TRACE_WARMTH: Readonly<Record<TraceType, number>> = {
  signpost: 1,
  lantern: 2,
  gift: 1,
  shrine: 3,
};

/**
 * How long each trace type lives before it is eligible for fade/GC (P2-SRV-07). Epoch-ms deltas;
 * `null` means the trace never expires. Shrines are permanent shared structures, so they never GC.
 */
export const TRACE_TTL_MS: Readonly<Record<TraceType, number | null>> = {
  signpost: 30 * 24 * 60 * 60 * 1000,
  lantern: 30 * 24 * 60 * 60 * 1000,
  gift: 30 * 24 * 60 * 60 * 1000,
  shrine: null,
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

/**
 * A gift: a wrapped light one traveler leaves for whoever finds it next. Carries no authored text
 * (abuse-resistance, scope §9); the "gift" is the mote reward a finder claims exactly once.
 */
export interface GiftPayload {
  readonly note?: never;
}

/** A shrine: a shared, growing structure at a landmark. Offerings accumulate against it (P2-SRV-02). */
export interface ShrinePayload {
  readonly note?: never;
}

export type TracePayload = SignpostPayload | LanternPayload | GiftPayload | ShrinePayload;

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
  /**
   * Times a lantern has been (re)lit by other travelers (P2-DATA-01). Only meaningful for lanterns;
   * `0` for other kinds. Each light raises chunk warmth, idempotent per player.
   */
  readonly litCount: number;
  /**
   * For gifts (P2-SRV-01): the player who claimed this gift, or `null` if unclaimed. A gift may be
   * claimed exactly once. `null` for non-gift kinds.
   */
  readonly claimedBy: string | null;
  /**
   * `true` for system-authored seed traces (P2-SRV-08) — flagged for slow/never GC and to keep them
   * visually indistinguishable to players while being distinguishable to the GC job.
   */
  readonly systemAuthored: boolean;
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

// --- Fade + garbage collection (P2-SRV-07) -----------------------------------------------------

/**
 * Is `trace` eligible for garbage collection at `now`? A trace is collected only when it is **old,
 * unappreciated, and expired** — and never when it carries lasting community value. Concretely, all
 * of: it has a finite `expiresAt` that is now in the past, no appreciations, no lantern lightings,
 * and is not system-authored (seed traces are kept). This is the single safety predicate the GC job
 * relies on, so it lives here (shared, pure, unit-tested) rather than in a SQL WHERE clause.
 */
export function isGcEligible(trace: Trace, now: number): boolean {
  if (trace.systemAuthored) return false;
  if (trace.expiresAt == null || trace.expiresAt > now) return false;
  if (trace.appreciations > 0) return false;
  if (trace.litCount > 0) return false;
  return true;
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

/**
 * `POST /trace/:id/claim` response (P2-SRV-01). `applied` is false when the gift was already claimed.
 * `motes` is the claimant's balance after receiving the gift reward.
 */
export interface ClaimGiftResponse {
  readonly traceId: string;
  readonly applied: boolean;
  readonly motes: number;
}

/**
 * `POST /trace/:id/light` response (P2-DATA-01). `applied` is false when this player already lit it.
 * `litCount` is the lantern's total lights after the attempt.
 */
export interface LightLanternResponse {
  readonly traceId: string;
  readonly litCount: number;
  readonly applied: boolean;
}

/** A shrine's readable, accumulating state (P2-SRV-02). */
export interface ShrineState {
  readonly chunkId: string;
  readonly offerings: number;
  readonly warmth: number;
}

/** `POST /shrine/offering` body — server derives the chunk + landmark from (x, y). */
export interface ShrineOfferingRequest {
  readonly x: number;
  readonly y: number;
}

/** `POST /shrine/offering` response: the shrine's new state + the offerer's remaining motes. */
export interface ShrineOfferingResponse {
  readonly shrine: ShrineState;
  readonly motes: number;
}
