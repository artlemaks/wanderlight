# P3 Review Gate + Scope Audit — P3-GOV-01

> Applies the `docs/Review_Gate_and_Scope_Audit.md` process to the P3 slice (accounts + cosmetics +
> appreciation loop). **Human sign-off pending** (per `director-signoff-not-self-granted`); this
> records what was built and the scope check for the reviewer.

## Delivered (code + tests green in CI)

| Epic                            | Tasks                               | Evidence                                                                                                                                                              |
| ------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P3.A accounts/auth              | P3-SRV-01/02/03                     | `routes/account.ts`, `repo.upgradePlayerToEmail` (memory + postgres), `auth.ts`; upgrade-preserves-data + cross-device-link tests in `account/p3.integration.test.ts` |
| P3.B appreciation notifications | P3-SRV-04, P3-CLI-01, P3-ANL-01     | `notifications.ts` (shared), `routes/notifications.ts`, `appreciation_notice` feed; `client/notifications/returnSummary.ts`; summary + seen-clearing tests            |
| P3.C cosmetics                  | P3-DATA-01, P3-SRV-05, P3-CLI-02/03 | `cosmetics.ts` (shared catalog + attunement), `cosmetics/service.ts`, `routes/cosmetics.ts`, `client/wardrobe/wardrobe.ts`; unlock + equip + ownership-guard tests    |
| P3.D content                    | P3-CNT-01, P3-CNT-02                | `content/seed-traces.json` (45 traces, density audit test); `docs/design/cosmetic-specs.md` (In Review)                                                               |
| P3.E tests/gov                  | P3-TST-01/02, P3-GOV-01             | `account/p3.integration.test.ts`, `content/seed-density.test.ts`; this doc                                                                                            |

## Scope check (scope §6 In-Scope only)

- ✅ Anonymous → email upgrade with cross-device continuity — in scope (§6, §8.2).
- ✅ Wardrobe + attunement cosmetics — in scope (§6 cosmetics); **no power**, all free-earnable (§9).
- ✅ Appreciation notifications/summaries — in scope (§6, the key retention feature, gd-2).
- ✅ Seed corpus — in scope (cold-start mechanism, §6 / risk gd-1).

## Out-of-scope watch (nothing crept in)

- ❌ No friends/guilds/direct targeting, no real-time presence — deferred (§5.G). Linking is account
  continuity only, not a social graph.
- ❌ No email marketing/digest send yet — the notification feed is in-app; email digest is opt-in and
  lands with the P4 notification service wiring, not here.
- ❌ Payments/embers untouched — belongs to P4.

## Guardrail compliance (§9)

- `cosmetics.test.ts` asserts **every** non-default cosmetic is free-earnable on the attunement track,
  and that all items are reachable at max level. No `embers-only` unlock kind exists in the type.
- Equip is server-validated against owned set (`validate-client-claims-against-generator`).

## Reviewer sign-off

- [ ] Artur — functional/visual review of upgrade + wardrobe + return summary
- [ ] Artur — approve cosmetic spec (`cosmetic-specs.md`) for P5 art
- [ ] Confirm no out-of-scope items; log any to §5.G
