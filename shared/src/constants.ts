/**
 * Core spatial + world constants for Wanderlight.
 *
 * Locked in P0-CLI-03. Changing {@link CHUNK_SIZE} or {@link SEED_VERSION} is an
 * ADR-level decision (see decisions/ADR-001-chunk-coordinate-system) because both
 * are load-bearing for cross-client determinism: two clients only agree on the
 * world if they share the same chunking and seed version.
 */

/** Pixels per tile edge. Rendering-only; not part of the world coordinate contract. */
export const TILE_SIZE = 32;

/** Tiles per chunk edge. A chunk is CHUNK_SIZE x CHUNK_SIZE tiles. */
export const CHUNK_SIZE = 64;

/**
 * Version of the deterministic world seed / generation algorithm. Bumped only when
 * terrain generation changes in a way that alters output for an existing seed.
 * Recorded so clients on different versions can detect a mismatch.
 */
export const SEED_VERSION = 1;

/**
 * The world seed — the single number every deterministic generator (terrain, landmarks, motes of
 * light) is derived from. Shared so the client and server agree: e.g. the server validates a
 * mote-collection claim with the same seed the client used to spawn the mote. First Vale is fixed;
 * alternate worlds would vary this.
 */
export const WORLD_SEED = 12345;
