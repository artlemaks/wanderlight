import { Application } from 'pixi.js';
import { TILE_SIZE, visibleChunkIds } from '@wanderlight/shared';

/**
 * P0-INFRA-02: boot a PixiJS stage to a blank canvas. The stage is intentionally empty —
 * terrain, traveler, and camera arrive in later P0 tasks (P0-CLI-01/02/04/05). We import from
 * `@wanderlight/shared` here so the cross-workspace wiring is exercised from the client.
 */
async function boot(): Promise<void> {
  const app = new Application();
  await app.init({
    resizeTo: window,
    background: '#0e0f14',
    antialias: true,
  });
  document.body.appendChild(app.canvas);

  const camera = {
    x: 0,
    y: 0,
    width: window.innerWidth / TILE_SIZE,
    height: window.innerHeight / TILE_SIZE,
  };
  console.info('[wanderlight] visible chunks at origin:', visibleChunkIds(camera));
}

void boot();
