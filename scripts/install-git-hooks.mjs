#!/usr/bin/env node
// P0-INFRA-03: install repo-tracked git hooks into .git/hooks without a hook manager.
//
// Copies each hook from .githooks/ into .git/hooks/, preserving any hooks already
// there (e.g. graphify's post-commit/post-checkout). Idempotent and safe to run
// anywhere: it no-ops outside a git working tree. Wired as the `prepare` npm
// script so it self-installs on `npm install` — adding a script does not change
// the lockfile, so `npm ci` stays green.

import { chmodSync, copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = join(repoRoot, '.githooks');
const gitDir = join(repoRoot, '.git');

// Skip silently when there's nothing to install into (fresh checkout, CI cache,
// or a consumer that vendored the package). Never fail an install over this.
if (!existsSync(sourceDir) || !existsSync(gitDir) || !statSync(gitDir).isDirectory()) {
  process.exit(0);
}

const hooksDir = join(gitDir, 'hooks');
mkdirSync(hooksDir, { recursive: true });

for (const name of readdirSync(sourceDir)) {
  const src = join(sourceDir, name);
  if (!statSync(src).isFile()) continue;
  const dest = join(hooksDir, name);
  copyFileSync(src, dest);
  chmodSync(dest, 0o755);
  console.log(`installed git hook: ${name}`);
}
