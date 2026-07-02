# Wanderlight signpost content

This folder holds the curated content that powers **signposts** — the short, kind
messages wanderers leave for strangers passing through the valley. To keep the
world warm and safe, the game **never accepts free text**. Every message is built
from an approved template plus curated words drawn from word banks.

## Files

### `signpost-templates.json` (task P1-CNT-01)

40 signpost message templates, 8 in each of 5 categories:
`encourage`, `warn`, `discover`, `gift`, `mystery`.

Schema:

```json
{
  "version": 1,
  "task": "P1-CNT-01",
  "status": "draft-pending-director-signoff",
  "categories": ["encourage", "warn", "discover", "gift", "mystery"],
  "templates": [
    {
      "id": "encourage-01",
      "category": "encourage",
      "text": "...{slot}...",
      "slots": ["slot"]
    }
  ]
}
```

- `id` — stable identifier, `<category>-NN` (e.g. `encourage-01` .. `encourage-08`).
- `text` — the message, with slot markers where words are filled in.
- `slots` — exactly the slot names appearing in `text`, deduplicated, in order of
  first appearance.

### `word-banks.json` (task P1-CNT-02)

One approved word bank per slot name used anywhere in the templates
(~20–40 words each). Every word is on-theme (cozy / painterly / nature / wander)
and free of offensive, violent, political, or crude terms.

Schema:

```json
{
  "version": 1,
  "task": "P1-CNT-02",
  "status": "draft-pending-director-signoff",
  "banks": {
    "adjective": ["gentle", "quiet"],
    "place": ["meadow", "grove"]
  }
}
```

## Slot-marker convention

Variable words appear in template text as `{slotName}` — lowercase, single word,
curly braces, e.g. `{adjective}`, `{place}`, `{action}`, `{emotion}`,
`{direction}`, `{creature}`, `{time}`, `{thing}`. A small shared set of slot
names is reused across templates so the banks stay compact and shared.

**Invariant:** every slot name referenced by any template has a matching key in
`word-banks.json`. This is the acceptance criterion for the pair of files.

## How the game consumes this

1. **Template picker** — the game selects a template (by category / context) from
   `signpost-templates.json`.
2. **Slot filling** — for each name in the template's `slots`, it picks an
   approved word from the matching bank in `word-banks.json` and substitutes it
   into `{slotName}`.
3. The composed message is shown. Because both the template and every word come
   from curated content, **no free text ever reaches another player.**

## Status — DRAFTS

Both JSON files are **drafts pending art / content-director (Artur) sign-off**.
They are intentionally marked `draft-pending-director-signoff` and must **not** be
treated as approved or shipped until that review is complete.
