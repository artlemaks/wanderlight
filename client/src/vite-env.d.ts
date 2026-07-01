/// <reference types="vite/client" />

// Client-exposed analytics config (P0-ANL-01). Vite only exposes vars prefixed `VITE_` to the
// browser bundle, so these are distinct from the server-side `POSTHOG_KEY`/`POSTHOG_HOST`.
interface ImportMetaEnv {
  readonly VITE_POSTHOG_KEY?: string;
  readonly VITE_POSTHOG_HOST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
