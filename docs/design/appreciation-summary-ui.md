# Appreciation-Summary UI — Design (P2-CLI-07)

**Status:** draft — pending director (Artur) sign-off. Design only; **not wired** (wiring lands in P3).

## Purpose

Close the emotional loop of leaving a trace: when a traveler returns, show them that their
signpost/lantern/gift _mattered_ — "**N travelers thanked your signpost**". This is the surface the
P3 return-notification (`return_post_appreciation`) drives players back to.

## Where the data comes from (already built in P2)

- Per-trace `appreciations` count — returned on every `GET /world/chunks` trace and on
  `POST /trace/:id/appreciate`.
- The author's `receive_appreciation` journal events (`GET /journal`) — one per appreciation, with
  `refId` = the trace id. Lets us group "which of my traces, how many, how recently".
- Analytics `receive_appreciation` (P2-ANL-01) already fires under the author — the metric backing
  the surface exists.

No new endpoint is required for the MVP version; the journal feed + per-trace counts are sufficient.

## Surface & states

A small, calm card (not a toast/interrupt — Wanderlight is cozy, non-notification-spammy):

```
┌────────────────────────────────────────────┐
│  ✿  Your signpost near the Quiet Grove      │
│     was thanked by 4 travelers               │
│     ·  most recently a little while ago      │
│                          [ visit it ]  [ x ] │
└────────────────────────────────────────────┘
```

- **Empty:** no card (never show "0 travelers thanked you" — that reads as failure).
- **Single:** "was thanked by **1** traveler".
- **Many:** "was thanked by **N** travelers".
- **Multiple traces:** stack up to 3 cards, newest first; a "…and more in your journal" link past that.

Copy is warm + specific (name the place via the nearest landmark), never gamey ("+5 motes!" belongs
on the HUD, not here). Relative time only ("a little while ago" / "earlier today") — never exact
timestamps.

## Wiring plan (P3)

1. On session resume, call `GET /journal`, filter `receive_appreciation`, group by `refId`.
2. Resolve each trace's place label from its chunk/landmark.
3. Render the card stack; "visit it" pans the camera to the trace.
4. Fire `return_post_appreciation` when a card is shown for a trace whose appreciation arrived while
   the author was away (the P3 return-rate metric).

## Open questions for sign-off

- Card vs. a dedicated "your traces" tab in the journal? (This doc assumes a lightweight card.)
- Cap on cards per session (proposed: 3 + journal overflow).
- Tone of the place label — landmark name vs. coordinates vs. nothing.

## Acceptance

Design approved by director → ready to wire in P3 (P3-CLI). No code ships from this task.
