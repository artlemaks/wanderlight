import { Application, Container, Graphics } from 'pixi.js';
import { SEED_VERSION, TILE_SIZE, type Camera } from '@wanderlight/shared';
import { ChunkGridRenderer } from './world/chunkGridRenderer';
import { TRAVELER_COLOR, TRAVELER_RADIUS_TILES } from './world/palette';
import { updateCamera } from './world/followCamera';
import { createTraveler, updateTraveler } from './traveler';
import { KeyboardInput } from './input/keyboard';
import { ClickToMove } from './input/clickToMove';
import { capture, initAnalytics } from './analytics/posthog';

/**
 * Wanderlight client bootstrap. Assembles the first playable slice from the P0 pieces:
 *  - P0-CLI-04 chunk grid + culling (`ChunkGridRenderer` over the seeded `@wanderlight/shared` world)
 *  - P0-CNT-02 grey-box placeholder art (`palette.ts` terrain colors + traveler dot)
 *  - P0-CLI-01 input + movement (keyboard / click-to-move → `updateTraveler`)
 *  - P0-CLI-02 follow camera (`updateCamera` soft-lerp centering on the traveler)
 *
 * The world is unbounded (see `@wanderlight/shared` coords), so the follow camera runs without
 * clamp bounds here. All movement/camera state lives in pure modules; this file is just the wiring
 * and the per-frame ticker.
 */

/** Fixed world seed for the prototype. A real seed-selection flow arrives with persistence (P1+). */
const WORLD_SEED = 12345;

async function boot(): Promise<void> {
  const app = new Application();
  await app.init({
    resizeTo: window,
    background: '#0e0f14',
    antialias: true,
  });
  document.body.appendChild(app.canvas);

  // Analytics (P0-ANL-01): fire session_start once the (guarded) client is ready. No-ops until
  // VITE_POSTHOG_KEY is set + posthog-js is installed, so it's inert in local dev.
  void initAnalytics().then(() => capture('session_start', { seedVersion: SEED_VERSION }));

  // World container is panned to follow the camera; terrain sits under the traveler entity.
  const world = new Container();
  app.stage.addChild(world);

  const chunks = new ChunkGridRenderer(WORLD_SEED);
  world.addChild(chunks.container);

  const travelerSprite = new Graphics()
    .circle(0, 0, TRAVELER_RADIUS_TILES * TILE_SIZE)
    .fill(TRAVELER_COLOR);
  world.addChild(travelerSprite); // added after chunks → always drawn on top

  let traveler = createTraveler(0, 0);

  // Camera state (top-left, world tiles). Extent is refreshed from the viewport each frame.
  const camera: Camera = {
    x: -window.innerWidth / TILE_SIZE / 2,
    y: -window.innerHeight / TILE_SIZE / 2,
    width: window.innerWidth / TILE_SIZE,
    height: window.innerHeight / TILE_SIZE,
  };
  let cam = camera;

  const keyboard = new KeyboardInput();
  const clickToMove = new ClickToMove(() => cam);

  app.ticker.add((ticker) => {
    const dt = ticker.deltaMS / 1000;

    // 1. Advance the traveler from this frame's input.
    traveler = updateTraveler(
      traveler,
      { dir: keyboard.direction(), clickTarget: clickToMove.consume() },
      dt,
    );

    // 2. Follow-camera eases toward centering the traveler; extent tracks the (possibly resized) viewport.
    cam = updateCamera(
      { x: cam.x, y: cam.y, width: window.innerWidth / TILE_SIZE, height: window.innerHeight / TILE_SIZE },
      traveler.x,
      traveler.y,
      dt,
    );

    // 3. Cull + mount chunks for the new view, then pan the world and place the traveler.
    chunks.update(cam);
    world.x = -cam.x * TILE_SIZE;
    world.y = -cam.y * TILE_SIZE;
    travelerSprite.x = traveler.x * TILE_SIZE;
    travelerSprite.y = traveler.y * TILE_SIZE;
  });
}

void boot();
