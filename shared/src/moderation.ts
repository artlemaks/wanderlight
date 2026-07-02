/**
 * Reporting + moderation (P4-DATA-03 / P4-SRV-09 / P4-OPS-01).
 *
 * Any trace is reportable; reports feed an admin queue. Because signpost text is curated (template +
 * word-bank, never free text — P1-CLI-04), the moderation surface is small by design (scope risk-5),
 * but reports still exist for tone/placement issues. Pure shapes + status/reason validation.
 */

/** Why a trace was reported. Bounded — curated content means the space of complaints is narrow. */
export const REPORT_REASONS = ['spam', 'misplaced', 'offensive', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export function isReportReason(v: unknown): v is ReportReason {
  return typeof v === 'string' && (REPORT_REASONS as readonly string[]).includes(v);
}

/** A report's lifecycle. `open` → `actioned` (trace removed/faded) or `dismissed`. */
export const REPORT_STATUSES = ['open', 'actioned', 'dismissed'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

/** What a moderator did when resolving a report. */
export type ModeratorAction = 'remove' | 'dismiss';

export interface Report {
  readonly id: string;
  readonly traceId: string;
  readonly reporterId: string;
  readonly reason: ReportReason;
  readonly status: ReportStatus;
  readonly createdAt: number;
}

/** Map a moderator action to the resulting report status. */
export function statusForAction(action: ModeratorAction): ReportStatus {
  return action === 'remove' ? 'actioned' : 'dismissed';
}
