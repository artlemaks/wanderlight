import { describe, it, expect } from 'vitest';
import { isReportReason, statusForAction } from './moderation';

describe('moderation', () => {
  it('validates report reasons', () => {
    expect(isReportReason('spam')).toBe(true);
    expect(isReportReason('offensive')).toBe(true);
    expect(isReportReason('nonsense')).toBe(false);
    expect(isReportReason(42)).toBe(false);
  });

  it('maps moderator actions to statuses', () => {
    expect(statusForAction('remove')).toBe('actioned');
    expect(statusForAction('dismiss')).toBe('dismissed');
  });
});
