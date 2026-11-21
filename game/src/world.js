// Lamplight's rules: the thief, the guards, sight, hearing and the win.
// Everything here is pure state — rendering lives in render.js.
import {
  TILE, COLS, ROWS, ORIGIN_X, ORIGIN_Y, WALK_SPEED, SNEAK_SPEED, GUARD_SPEED,
  CHASE_SPEED, PLAYER_RADIUS, GUARD_RADIUS, SIGHT_RANGE, SIGHT_HALF_ANGLE, SNEAK_VISIBILITY, BUSH_VISIBILITY,
  SHADOW_VISIBILITY, LIT_VISIBILITY, DETECT_FILL, DETECT_DECAY, SUSPICIOUS_AT,
  ALARM_AT, SEARCH_SECONDS, CATCH_RADIUS, NOISE_RUN_RADIUS, NOISE_PEBBLE_RADIUS,
  PEBBLES_PER_LEVEL,
} from './config.js';
import { LEVELS, parseLevel, isWallTile, isBushTile } from './levels.js';
import { makeRng } from './rng.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_CLEAR = 'clear';
export const SCREEN_WIN = 'win';

const LOOK_AROUND_SECONDS = 1.6;
const LOSE_SIGHT_SECONDS = 2.5;
const STEP_SECONDS_WALK = 0.42;
const STEP_SECONDS_SNEAK = 0.62;

function tileAt(tiles, px, py) {
  const tx = Math.floor((px - ORIGIN_X) / TILE);
  const ty = Math.floor((py - ORIGIN_Y) / TILE);
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
  return tiles[ty][tx];
}

function tileCenter(tx, ty) {
  return { x: ORIGIN_X + (tx + 0.5) * TILE, y: ORIGIN_Y + (ty + 0.5) * TILE };
}

// True when the straight line between two points crosses no wall, crate or bush.
function lineOfSight(tiles, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const distance = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(distance / 6));
  for (let i = 1; i < steps; i += 1) {
    const tile = tileAt(tiles, x0 + (dx * i) / steps, y0 + (dy * i) / steps);
    if (isWallTile(tile) || isBushTile(tile)) return false;
  }
  return true;
}

function angleDifference(a, b) {
  let diff = a - b;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

export class World {
  constructor() {
    this.screen = SCREEN_TITLE;
    this.levelIndex = 0;
    this.score = 0;
    this.totalLoot = 0;
    this.lootTaken = 0;
    this.pebbles = PEBBLES_PER_LEVEL;
    this.levelTime = 0;
    this.timesSpotted = 0;
    this.ghostLevels = 0;
    this.bestStreak = 0;
    this.sounds = [];
    this.message = '';
    this.messageTimer = 0;
    this.pebbleFx = null;
    this.noiseFx = [];
    this.rng = makeRng(1);
    this.loadLevel(0);
  }

  loadLevel(index) {
    this.levelIndex = index;
    const level = LEVELS[index];
    this.level = level;
    const parsed = parseLevel(level);
    this.tiles = parsed.tiles;
    this.loot = parsed.loot;
    this.lamps = parsed.lamps;
    this.totalLoot = this.loot.length;
    this.lootTaken = 0;
    this.pebbles = PEBBLES_PER_LEVEL;
    this.levelTime = 0;
    this.levelSpotted = false;
    this.rng = makeRng(level.seed);
    const start = tileCenter(parsed.player.x, parsed.player.y);
    this.player = {
      x: start.x, y: start.y, facing: 0, sneaking: false, moving: false,
      stepTimer: 0, hidden: false,
    };
    const exit = tileCenter(parsed.exit.x, parsed.exit.y);
    this.exit = { x: exit.x, y: exit.y, open: false };
    this.guards = level.guards.map((def) => {
      const spawn = tileCenter(def.waypoints[0][0], def.waypoints[0][1]);
      return {
        waypoints: def.waypoints.map(([wx, wy]) => tileCenter(wx, wy)),
        pause: def.pause,
        x: spawn.x, y: spawn.y,
        facing: 0, targetIndex: 1, routeDir: 1, pauseTimer: 0,
        state: 'patrol', detection: 0, lastSeen: null,
        stateTimer: 0, loseTimer: 0, scanBase: 0,
      };
    });
    this.pebbleFx = null;
    this.noiseFx = [];
  }

  startGame() {
    this.score = 0;
    this.timesSpotted = 0;
    this.ghostLevels = 0;
    this.loadLevel(0);
    this.screen = SCREEN_PLAY;
  }

  resetLevel() {
    this.loadLevel(this.levelIndex);
    this.screen = SCREEN_PLAY;
  }

  nextLevel() {
    if (this.levelIndex + 1 >= LEVELS.length) {
      this.screen = SCREEN_WIN;
      return;
    }
    this.loadLevel(this.levelIndex + 1);
    this.screen = SCREEN_PLAY;
  }

  // Move a circle through the grid, sliding along walls. Bushes block guards
  // but never the thief; crates and walls block everyone.
  moveBody(body, dx, dy, radius, isGuard) {
    const blocked = (px, py) => {
      const tile = tileAt(this.tiles, px, py);
      if (isWallTile(tile)) return true;
      if (isGuard && isBushTile(tile)) return true;
      return false;
    };
    const nx = body.x + dx;
    if (!blocked(nx - radius, body.y - radius) && !blocked(nx + radius, body.y - radius)
      && !blocked(nx - radius, body.y + radius) && !blocked(nx + radius, body.y + radius)) {
      body.x = nx;
    }
    const ny = body.y + dy;
    if (!blocked(body.x - radius, ny - radius) && !blocked(body.x + radius, ny - radius)
      && !blocked(body.x - radius, ny + radius) && !blocked(body.x + radius, ny + radius)) {
      body.y = ny;
    }
  }

  playerTile() {
    return tileAt(this.tiles, this.player.x, this.player.y);
  }

  playerInLight() {
    for (const lamp of this.lamps) {
      const centre = tileCenter(lamp.x, lamp.y);
      if (Math.hypot(this.player.x - centre.x, this.player.y - centre.y) < TILE * 1.9) return true;
    }
    return false;
  }

  // How visible the thief is right now: 0 is invisible, higher is easier to spot.
  visibility() {
    if (isBushTile(this.playerTile())) return BUSH_VISIBILITY;
    let factor = this.playerInLight() ? LIT_VISIBILITY : SHADOW_VISIBILITY;
    if (this.player.sneaking) factor *= SNEAK_VISIBILITY;
    return factor;
  }

  guardSeesPlayer(guard) {
    const dx = this.player.x - guard.x;
    const dy = this.player.y - guard.y;
    const distance = Math.hypot(dx, dy);
    if (distance > SIGHT_RANGE) return 0;
    const angleTo = Math.atan2(dy, dx);
    if (Math.abs(angleDifference(angleTo, guard.facing)) > SIGHT_HALF_ANGLE) return 0;
    if (!lineOfSight(this.tiles, guard.x, guard.y, this.player.x, this.player.y)) return 0;
    const closeness = 1.35 - distance / SIGHT_RANGE;
    return Math.max(0.05, closeness) * this.visibility();
  }

  hearNoise(x, y, radius) {
    this.noiseFx.push({ x, y, radius, age: 0 });
    for (const guard of this.guards) {
      if (guard.state === 'alert') continue;
      if (Math.hypot(guard.x - x, guard.y - y) < radius) {
        guard.state = 'suspicious';
        guard.lastSeen = { x, y };
        guard.stateTimer = 0;
        guard.detection = Math.max(guard.detection, SUSPICIOUS_AT);
      }
    }
  }

  throwPebble(targetX, targetY) {
    if (this.pebbles <= 0 || this.screen !== SCREEN_PLAY) return;
    this.pebbles -= 1;
    this.pebbleFx = { x: targetX, y: targetY, age: 0 };
    this.sounds.push('pebble');
    this.hearNoise(targetX, targetY, NOISE_PEBBLE_RADIUS);
    this.showMessage('Clink! A pebble skitters across the marble.');
  }

  showMessage(text) {
    this.message = text;
    this.messageTimer = 3;
  }

  updateGuard(guard, dt) {
    const player = this.player;
    const seen = this.guardSeesPlayer(guard);
    if (seen > 0) {
      guard.lastSeen = { x: player.x, y: player.y };
      guard.loseTimer = 0;
      guard.detection = Math.min(1, guard.detection + DETECT_FILL * seen * dt);
    } else {
      guard.detection = Math.max(0, guard.detection - DETECT_DECAY * dt);
      guard.loseTimer += dt;
    }

    if (guard.detection >= ALARM_AT && guard.state !== 'alert') {
      guard.state = 'alert';
      guard.stateTimer = 0;
      this.sounds.push('alarm');
      if (!this.levelSpotted) {
        this.levelSpotted = true;
        this.timesSpotted += 1;
      }
      this.showMessage('SPOTTED! Break line of sight — now!');
    } else if (guard.detection >= SUSPICIOUS_AT && guard.state === 'patrol') {
      guard.state = 'suspicious';
      guard.stateTimer = 0;
      this.sounds.push('suspicious');
    }

    if (guard.state === 'patrol') {
      const target = guard.waypoints[guard.targetIndex];
      if (guard.pauseTimer > 0) {
        guard.pauseTimer -= dt;
        guard.facing += Math.sin((guard.scanBase += dt) * 1.1) * 0.9 * dt;
      } else {
        const dx = target.x - guard.x;
        const dy = target.y - guard.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 4) {
          guard.targetIndex += guard.routeDir;
          if (guard.targetIndex >= guard.waypoints.length || guard.targetIndex < 0) {
            guard.routeDir *= -1;
            guard.targetIndex += guard.routeDir * 2;
          }
          guard.pauseTimer = guard.pause;
          guard.scanBase = 0;
        } else {
          guard.facing = Math.atan2(dy, dx);
          this.moveBody(guard, (dx / distance) * GUARD_SPEED * dt, (dy / distance) * GUARD_SPEED * dt, GUARD_RADIUS, true);
        }
      }
    } else if (guard.state === 'suspicious') {
      guard.stateTimer += dt;
      const point = guard.lastSeen;
      if (point) {
        const dx = point.x - guard.x;
        const dy = point.y - guard.y;
        const distance = Math.hypot(dx, dy);
        if (distance > 10) {
          guard.facing = Math.atan2(dy, dx);
          this.moveBody(guard, (dx / distance) * GUARD_SPEED * dt, (dy / distance) * GUARD_SPEED * dt, GUARD_RADIUS, true);
        } else {
          guard.facing += Math.sin((guard.scanBase += dt) * 1.4) * 1.4 * dt;
          if (guard.stateTimer > LOOK_AROUND_SECONDS + 1.2) {
            guard.state = 'patrol';
            guard.detection = Math.min(guard.detection, SUSPICIOUS_AT - 0.05);
            guard.stateTimer = 0;
          }
        }
      }
    } else if (guard.state === 'alert') {
      const dx = player.x - guard.x;
      const dy = player.y - guard.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 2) {
        guard.facing = Math.atan2(dy, dx);
        this.moveBody(guard, (dx / distance) * CHASE_SPEED * dt, (dy / distance) * CHASE_SPEED * dt, GUARD_RADIUS, true);
      }
      if (guard.loseTimer > LOSE_SIGHT_SECONDS) {
        guard.state = 'search';
        guard.stateTimer = 0;
        guard.detection = SUSPICIOUS_AT + 0.1;
      }
    } else if (guard.state === 'search') {
      guard.stateTimer += dt;
      const point = guard.lastSeen;
      if (point) {
        const dx = point.x - guard.x;
        const dy = point.y - guard.y;
        const distance = Math.hypot(dx, dy);
        if (distance > 10) {
          guard.facing = Math.atan2(dy, dx);
          this.moveBody(guard, (dx / distance) * GUARD_SPEED * dt, (dy / distance) * GUARD_SPEED * dt, GUARD_RADIUS, true);
        } else {
          guard.facing += Math.sin((guard.scanBase += dt) * 1.2) * 1.2 * dt;
          if (guard.stateTimer > SEARCH_SECONDS) {
            guard.state = 'patrol';
            guard.detection = 0;
            guard.stateTimer = 0;
          }
        }
      }
    }

    if (Math.hypot(guard.x - player.x, guard.y - player.y) < CATCH_RADIUS) {
      this.screen = SCREEN_CAUGHT;
      this.sounds.push('caught');
    }
  }

  update(dt, input) {
    if (this.screen !== SCREEN_PLAY) return;
    this.levelTime += dt;
    if (this.messageTimer > 0) this.messageTimer -= dt;
    if (this.pebbleFx) {
      this.pebbleFx.age += dt;
      if (this.pebbleFx.age > 0.8) this.pebbleFx = null;
    }
    this.noiseFx = this.noiseFx.filter((fx) => {
      fx.age += dt;
      return fx.age < 0.9;
    });

    const move = input.moveVector();
    const moving = move.x !== 0 || move.y !== 0;
    this.player.sneaking = input.sneaking;
    this.player.moving = moving;
    if (moving) {
      const length = Math.hypot(move.x, move.y);
      const speed = this.player.sneaking ? SNEAK_SPEED : WALK_SPEED;
      const dx = (move.x / length) * speed * dt;
      const dy = (move.y / length) * speed * dt;
      this.player.facing = Math.atan2(move.y, move.x);
      this.moveBody(this.player, dx, dy, PLAYER_RADIUS, false);
      this.player.stepTimer -= dt;
      if (this.player.stepTimer <= 0) {
        this.player.stepTimer = this.player.sneaking ? STEP_SECONDS_SNEAK : STEP_SECONDS_WALK;
        this.sounds.push(this.player.sneaking ? 'step-quiet' : 'step');
        if (!this.player.sneaking) {
          this.hearNoise(this.player.x, this.player.y, NOISE_RUN_RADIUS);
        }
      }
    }

    if (input.mouse.clicked) {
      this.throwPebble(input.mouse.clickX, input.mouse.clickY);
    }
    if (input.wasPressed('q')) {
      this.throwPebble(
        this.player.x + Math.cos(this.player.facing) * TILE * 4,
        this.player.y + Math.sin(this.player.facing) * TILE * 4,
      );
    }

    this.player.hidden = isBushTile(this.playerTile());

    for (const item of this.loot) {
      if (!item.taken) {
        const centre = tileCenter(item.x, item.y);
        if (Math.hypot(this.player.x - centre.x, this.player.y - centre.y) < TILE * 0.55) {
          item.taken = true;
          this.lootTaken += 1;
          this.score += 500;
          this.sounds.push('pickup');
          this.showMessage(`Pocketed a treasure (${this.lootTaken}/${this.totalLoot}).`);
          if (this.lootTaken === this.totalLoot) {
            this.exit.open = true;
            this.showMessage('The exit glows green — slip out unseen!');
          }
        }
      }
    }

    for (const guard of this.guards) {
      this.updateGuard(guard, dt);
      if (this.screen !== SCREEN_PLAY) return;
    }

    const exitTile = tileAt(this.tiles, this.player.x, this.player.y);
    if (exitTile === 'E') {
      if (this.exit.open) {
        const timeBonus = Math.max(0, Math.round((240 - this.levelTime) * 5));
        const ghostBonus = this.levelSpotted ? 0 : 750;
        if (!this.levelSpotted) this.ghostLevels += 1;
        this.score += timeBonus + ghostBonus;
        this.levelBonus = { timeBonus, ghostBonus };
        this.sounds.push('clear');
        this.screen = SCREEN_CLEAR;
      } else if (this.messageTimer <= 0) {
        this.showMessage('Locked — pocket every treasure first.');
      }
    }
  }

  // The rating the win screen shows, from how often the thief was spotted.
  rating() {
    if (this.timesSpotted === 0) return 'GHOST — never once spotted';
    if (this.timesSpotted <= 2) return 'SHADOW — spotted, but never caught';
    return 'LOUD — the night watch knows your name';
  }

  maxDetection() {
    return Math.max(0, ...this.guards.map((g) => g.detection));
  }

  anyAlert() {
    return this.guards.some((g) => g.state === 'alert');
  }
}
