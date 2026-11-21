// Lamplight's hand-in program (Node 22, standard library only).
//
// It takes the repository's game/ and screenshots/ and writes them into the
// grader's output directory, together with the dossier the judge reads —
// the summary buildDossier writes from exactly those files. Run it locally
// with MAKEFUN_OUTPUT_DIR set to a scratch folder:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The grader runs it twice in a fresh container with no network, a read-only
// copy of this repository and a writable /output, so it does nothing here
// that needs the network, the clock, or anything outside this directory.
import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The dossier caps mirror the gate's own limits, so a local run refuses an
// entry the gate would refuse instead of handing in a broken one.
const DOSSIER_OPTIONS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function fail(message) {
  throw new Error(`Lamplight hand-in: ${message}`);
}

function checkTreePresent() {
  const gameDir = join(repoRoot, 'game');
  if (!existsSync(join(gameDir, 'index.html'))) fail('game/index.html is missing');
  const shotsDir = join(repoRoot, 'screenshots');
  if (!existsSync(shotsDir)) fail('screenshots/ is missing');
  const shots = readdirSync(shotsDir).filter((name) => !name.startsWith('.'));
  if (shots.length < 3 || shots.length > 4) fail(`expected 3 or 4 screenshots, found ${shots.length}`);
  for (const name of shots) {
    const size = statSync(join(shotsDir, name)).size;
    if (size > 262144) fail(`screenshot ${name} is ${size} bytes, over the 256 KiB cap`);
  }
}

checkTreePresent();
mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, DOSSIER_OPTIONS));
