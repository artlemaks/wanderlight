/**
 * P1-TST-02 — First e2e loop test (DRAFT, not yet wired into CI).
 *
 * The P1 exit demo as an automated journey: one traveler places a signpost, a second independent
 * session discovers it and leaves an appreciation. This file documents the scripted flow but is NOT
 * run yet — Playwright and a running client+server stack are not available in CI (see e2e/README.md).
 * It is a plain module (no `@playwright/test` import) so it lives in the repo with zero new deps and
 * passes typecheck/lint. On activation, translate `P1_E2E_LOOP_STEPS` into a real `test(...)` body.
 */

/** The ordered steps the real Playwright test will perform, kept here as the executable spec's plan. */
export const P1_E2E_LOOP_STEPS = [
  'Traveler A opens the world and moves near an empty chunk.',
  'A opens the placement radial and selects "signpost".',
  'A fills a template from the word banks and confirms → POST /trace returns 201.',
  'Traveler B opens a fresh browser context and navigates to the same chunk.',
  'B sees the signpost render at the correct world position and reads it.',
  'B clicks "thanks" → POST /trace/:id/appreciate; the count reflects and the button disables.',
  'A reloads and still sees the signpost (persisted), now with one appreciation.',
] as const;
