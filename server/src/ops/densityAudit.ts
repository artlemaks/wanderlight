/**
 * Post-beta density audit (P6-OPS-03).
 *
 * Measures the trace-count distribution across the world's chunks and flags any **thin** chunk (below
 * a target density) — the launch-gate check that no visited chunk feels barren (scope §12 DoD; risk
 * gd-1). Pure over a chunk→count map so it is unit-tested; the ops script feeds it real
 * `chunk_state.trace_count` (or a `getChunkTraces` sweep). A non-empty `thinChunks` triggers a
 * P5-CNT-05-style seed top-up before the go/no-go.
 */

/** Default minimum traces a visited chunk should carry to not read as barren. */
export const TARGET_CHUNK_DENSITY = 3;

export interface DensityAuditInput {
  /** Chunk id (`"cx,cy"`) → number of (visible) traces in it. */
  readonly countsByChunk: Readonly<Record<string, number>>;
  /** Minimum acceptable density; defaults to {@link TARGET_CHUNK_DENSITY}. */
  readonly target?: number;
}

export interface DensityAuditReport {
  readonly chunksAudited: number;
  readonly target: number;
  readonly minCount: number;
  readonly meanCount: number;
  /** Chunk ids below target, ascending by count then id — the top-up work list. */
  readonly thinChunks: readonly string[];
  /** True when every audited chunk meets target (launch-gate density criterion). */
  readonly pass: boolean;
}

/** Run the density audit over a chunk→count map. */
export function auditDensity(input: DensityAuditInput): DensityAuditReport {
  const target = input.target ?? TARGET_CHUNK_DENSITY;
  const entries = Object.entries(input.countsByChunk);
  const counts = entries.map(([, n]) => n);
  const chunksAudited = entries.length;
  const minCount = counts.length ? Math.min(...counts) : 0;
  const meanCount = counts.length ? counts.reduce((a, b) => a + b, 0) / counts.length : 0;
  const thinChunks = entries
    .filter(([, n]) => n < target)
    .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
    .map(([id]) => id);
  return {
    chunksAudited,
    target,
    minCount,
    meanCount,
    thinChunks,
    pass: thinChunks.length === 0 && chunksAudited > 0,
  };
}
