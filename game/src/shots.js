// The staged scenes behind ?shot=cover|title|alert|win. Each one sets the
// world to a fixed, hand-placed moment — a real frame of the real game,
// frozen so the same URL always gives the same picture.
import { TILE, ORIGIN_X, ORIGIN_Y } from './config.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_WIN } from './world.js';

function centre(tx, ty) {
  return { x: ORIGIN_X + (tx + 0.5) * TILE, y: ORIGIN_Y + (ty + 0.5) * TILE };
}

function place(body, tx, ty, facing) {
  const at = centre(tx, ty);
  body.x = at.x;
  body.y = at.y;
  body.facing = facing;
}

// The cover: the thief crouched behind a crate while a guard's cone sweeps
// just past her, the gold glinting a few steps away.
function stageCover(world) {
  world.loadLevel(0);
  world.screen = SCREEN_PLAY;
  place(world.player, 5, 2, 0.35);
  world.player.sneaking = true;
  const guard = world.guards[0];
  place(guard, 6, 5, -Math.PI / 2);
  guard.state = 'patrol';
  guard.detection = 0.35;
  const other = world.guards[1];
  place(other, 19, 4, Math.PI * 0.75);
  other.state = 'patrol';
  other.detection = 0;
  world.showMessage('Stay out of the cones — crates block their sight.');
}

// The near miss: a guard has the thief dead to rights under a lamp, the
// alarm is up, and the exit is still two wings away.
function stageAlert(world) {
  world.loadLevel(1);
  world.screen = SCREEN_PLAY;
  place(world.player, 13, 5, Math.PI / 2);
  world.player.sneaking = false;
  world.loot[0].taken = true;
  world.lootTaken = 1;
  world.score = 500;
  const hunter = world.guards[1];
  place(hunter, 12, 3, Math.PI / 2);
  hunter.state = 'alert';
  hunter.detection = 1;
  hunter.lastSeen = { x: world.player.x, y: world.player.y };
  const watcher = world.guards[0];
  place(watcher, 4, 4, 0);
  watcher.state = 'patrol';
  const far = world.guards[2];
  place(far, 20, 8, -Math.PI / 2);
  far.state = 'patrol';
  world.showMessage('SPOTTED! Break line of sight — now!');
}

// The end of a good night: every wing cleared, barely ever seen.
function stageWin(world) {
  world.loadLevel(2);
  world.score = 4850;
  world.timesSpotted = 1;
  world.ghostLevels = 2;
  world.screen = SCREEN_WIN;
}

export function stageShot(name, world) {
  if (name === 'cover') stageCover(world);
  else if (name === 'alert') stageAlert(world);
  else if (name === 'win') stageWin(world);
  else world.screen = SCREEN_TITLE;
}
