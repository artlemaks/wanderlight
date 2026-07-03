import { describe, it, expect } from 'vitest';
import { createScheduler, type Job } from './scheduler';

function job(name: string, fn: () => Promise<unknown>): Job {
  return { name, run: fn };
}

describe('scheduler runAll', () => {
  it('runs every job once and reports success', async () => {
    const ran: string[] = [];
    const scheduler = createScheduler([
      { job: job('a', async () => void ran.push('a')), intervalMs: 1000 },
      { job: job('b', async () => void ran.push('b')), intervalMs: 1000 },
    ]);
    const results = await scheduler.runAll();
    expect(ran).toEqual(['a', 'b']);
    expect(results).toEqual([
      { name: 'a', ok: true },
      { name: 'b', ok: true },
    ]);
  });

  it('isolates a failing job so the others still run', async () => {
    const ran: string[] = [];
    const scheduler = createScheduler([
      {
        job: job('boom', async () => {
          throw new Error('nope');
        }),
        intervalMs: 1000,
      },
      { job: job('ok', async () => void ran.push('ok')), intervalMs: 1000 },
    ]);
    const results = await scheduler.runAll();
    expect(results).toEqual([
      { name: 'boom', ok: false },
      { name: 'ok', ok: true },
    ]);
    expect(ran).toEqual(['ok']);
  });
});
