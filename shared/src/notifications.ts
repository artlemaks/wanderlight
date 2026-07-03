/**
 * Appreciation notifications & summaries (P3-SRV-04 / P3-CLI-01) — the highest-leverage retention
 * surface (scope §12, gd-2). When a traveler returns, they learn how many strangers thanked their
 * traces while they were away: "3 travelers thanked your signpost."
 *
 * Pure aggregation only. The server records one `AppreciationNotice` per received appreciation and
 * marks them seen on read; these helpers fold the unseen notices into a per-trace summary. Kept in
 * `shared` so the server aggregates and the client renders the same shape, and the wording lives in
 * one place.
 */

/** One recorded "someone thanked your trace" event, from the author's perspective. */
export interface AppreciationNotice {
  readonly id: string;
  /** The author being notified. */
  readonly authorId: string;
  readonly traceId: string;
  /** The trace's type, so the summary can name it ("signpost", "lantern"…). */
  readonly traceType: string;
  readonly createdAt: number;
  /** Whether the author has already seen this notice (cleared on return). */
  readonly seen: boolean;
}

/** A per-trace roll-up: how many distinct thanks a given trace received. */
export interface TraceAppreciationSummary {
  readonly traceId: string;
  readonly traceType: string;
  readonly count: number;
}

/** The return-summary payload: total new thanks + a per-trace breakdown. `GET /notifications`. */
export interface AppreciationSummary {
  readonly totalNew: number;
  readonly traces: readonly TraceAppreciationSummary[];
}

/**
 * Fold a set of notices into a summary (newest-trace first by count then recency). Pass only the
 * notices you want counted — typically the unseen ones — so the summary reflects "since last visit".
 */
export function summarizeAppreciations(
  notices: readonly AppreciationNotice[],
): AppreciationSummary {
  const byTrace = new Map<string, TraceAppreciationSummary & { last: number }>();
  for (const n of notices) {
    const cur = byTrace.get(n.traceId);
    if (cur) {
      byTrace.set(n.traceId, {
        ...cur,
        count: cur.count + 1,
        last: Math.max(cur.last, n.createdAt),
      });
    } else {
      byTrace.set(n.traceId, {
        traceId: n.traceId,
        traceType: n.traceType,
        count: 1,
        last: n.createdAt,
      });
    }
  }
  const traces = [...byTrace.values()]
    .sort((a, b) => b.count - a.count || b.last - a.last)
    .map(({ traceId, traceType, count }) => ({ traceId, traceType, count }));
  return { totalNew: notices.length, traces };
}

/**
 * Human wording for a single trace's summary line. One place so client + email digest agree, and the
 * pluralization is right: "1 traveler thanked your signpost" / "3 travelers thanked your lantern".
 */
export function appreciationLine(s: TraceAppreciationSummary): string {
  const who = s.count === 1 ? '1 traveler' : `${s.count} travelers`;
  return `${who} thanked your ${s.traceType}`;
}
