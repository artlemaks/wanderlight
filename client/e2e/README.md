# Client e2e tests

End-to-end journeys driven through a real browser with Playwright. **Not yet wired into CI.**

## Status

- `trace-loop.spec.ts` — P1-TST-02, the place → discover → appreciate loop. **Drafted** as a step
  plan; not executable until the harness below is set up. Tracked as WM-77 (stays In Progress).

## Activation

1. `npm i -D @playwright/test && npx playwright install --with-deps chromium`
2. Run the server (in-memory datastore is fine) and the Vite client.
3. Translate `P1_E2E_LOOP_STEPS` into a real `test(...)` using two browser contexts (one per traveler).
4. Add a CI job that boots both services and runs `playwright test` headless.

Until then the unit + API-integration suites (`npm test`) cover the loop server-side; the browser
half is a human visual check under the P1 review gate.
