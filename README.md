# Wanderlight

A shared, deterministic, painterly wander-world. See [`docs/MVP_Task_Breakdown.md`](docs/MVP_Task_Breakdown.md)
for the full phase plan (P0–P6).

## Monorepo layout

| Workspace  | What                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------- |
| `shared/`  | Framework-agnostic TS: chunk coordinates, world constants, config. Importable by client & server. |
| `client/`  | Vite + TypeScript + PixiJS app (WebGL 2D).                                                        |
| `server/`  | Node + Fastify API (thin skeleton at P0; grows in P1).                                            |
| `content/` | Word-banks, signpost templates, seed corpus, art/audio source.                                    |
| `docs/`    | Planning docs + ADRs.                                                                             |
| `infra/`   | IaC / deploy config.                                                                              |

## Prerequisites

- Node **>= 20** (`.nvmrc` pins 20)
- npm (workspaces)

## Getting started

```bash
npm install
cp .env.example .env   # fill in as needed; .env is gitignored
```

## Common commands

| Command              | Does                                                     |
| -------------------- | -------------------------------------------------------- |
| `npm run dev`        | Serve the PixiJS client (Vite) at http://localhost:5173  |
| `npm run dev:server` | Run the Fastify API (`/health`) at http://localhost:3000 |
| `npm test`           | Run the Vitest suite once                                |
| `npm run typecheck`  | Project-wide `tsc --build`                               |
| `npm run lint`       | ESLint across workspaces                                 |
| `npm run format`     | Prettier write                                           |

## Environment variables

Declared in [`.env.example`](.env.example): `POSTHOG_KEY`, `POSTHOG_HOST`, `SENTRY_DSN`,
`DATABASE_URL`, `PORT`. Never commit real secrets.
