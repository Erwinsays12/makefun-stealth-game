// Everything the eye sees: the museum floor, the guards and their cones of
// sight, the lamplight, the thief, the HUD and the menu screens.
import {
  TILE, COLS, ROWS, ORIGIN_X, ORIGIN_Y, VIEW_W, VIEW_H, HUD_H,
  SIGHT_RANGE, SIGHT_HALF_ANGLE, PEBBLES_PER_LEVEL, GUARD_RADIUS, COLORS,
} from './config.js';
import { isWallTile, isBushTile } from './levels.js';
import {
  SCREEN_TITLE, SCREEN_PAUSED, SCREEN_CAUGHT, SCREEN_CLEAR, SCREEN_WIN,
} from './world.js';

const TITLE_FONT = 'Georgia, "Times New Roman", serif';
const UI_FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

let lightCanvas = null;

function tileCenter(tx, ty) {
  return { x: ORIGIN_X + (tx + 0.5) * TILE, y: ORIGIN_Y + (ty + 0.5) * TILE };
}

function tileAt(tiles, px, py) {
  const tx = Math.floor((px - ORIGIN_X) / TILE);
  const ty = Math.floor((py - ORIGIN_Y) / TILE);
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
  return tiles[ty][tx];
}

// March a ray from a guard until it hits a wall, a crate or a bush.
function rayLength(tiles, x, y, angle) {
  const step = 6;
  const dx = Math.cos(angle) * step;
  const dy = Math.sin(angle) * step;
  let px = x;
  let py = y;
  for (let d = 0; d < SIGHT_RANGE; d += step) {
    px += dx;
    py += dy;
    const tile = tileAt(tiles, px, py);
    if (isWallTile(tile) || isBushTile(tile)) return d;
  }
  return SIGHT_RANGE;
}

function drawFloor(ctx, world) {
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const tile = world.tiles[y][x];
      const px = ORIGIN_X + x * TILE;
      const py = ORIGIN_Y + y * TILE;
      if (tile === '#') continue;
      const shade = (x * 7 + y * 13) % 5 === 0 ? COLORS.floorB : COLORS.floorA;
      ctx.fillStyle = shade;
      ctx.fillRect(px, py, TILE, TILE);
      ctx.strokeStyle = COLORS.floorLine;
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, TILE, TILE);
    }
  }
}

function drawWalls(ctx, world) {
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (world.tiles[y][x] !== '#') continue;
      const px = ORIGIN_X + x * TILE;
      const py = ORIGIN_Y + y * TILE;
      ctx.fillStyle = COLORS.wall;
      ctx.fillRect(px, py, TILE, TILE);
      // A lit top edge where the wall meets open floor, for depth.
      if (y + 1 < ROWS && world.tiles[y + 1][x] !== '#') {
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(px, py + TILE - 5, TILE, 5);
      }
      ctx.strokeStyle = '#0c0f1e';
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, TILE, TILE);
    }
  }
}

function drawProps(ctx, world, time) {
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const tile = world.tiles[y][x];
      const px = ORIGIN_X + x * TILE;
      const py = ORIGIN_Y + y * TILE;
      if (tile === 'C') {
        ctx.fillStyle = COLORS.crate;
        ctx.fillRect(px + 5, py + 5, TILE - 10, TILE - 10);
        ctx.fillStyle = COLORS.crateTop;
        ctx.fillRect(px + 5, py + 5, TILE - 10, 7);
        ctx.strokeStyle = '#3d2c15';
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 5, py + 5, TILE - 10, TILE - 10);
        ctx.beginPath();
        ctx.moveTo(px + 5, py + 5);
        ctx.lineTo(px + TILE - 5, py + TILE - 5);
        ctx.moveTo(px + TILE - 5, py + 5);
        ctx.lineTo(px + 5, py + TILE - 5);
        ctx.stroke();
      } else if (tile === 'B') {
        ctx.fillStyle = COLORS.bush;
        ctx.beginPath();
        ctx.arc(px + TILE / 2, py + TILE / 2, TILE / 2 - 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COLORS.bushLeaf;
        for (let i = 0; i < 5; i += 1) {
          const angle = (i / 5) * Math.PI * 2 + 0.4;
          ctx.beginPath();
          ctx.arc(px + TILE / 2 + Math.cos(angle) * 11, py + TILE / 2 + Math.sin(angle) * 11, 8, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (tile === 'l') {
        const glow = ctx.createRadialGradient(px + TILE / 2, py + TILE / 2, 4, px + TILE / 2, py + TILE / 2, TILE * 1.6);
        glow.addColorStop(0, 'rgba(255, 210, 122, 0.30)');
        glow.addColorStop(1, 'rgba(255, 210, 122, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(px - TILE, py - TILE, TILE * 3, TILE * 3);
        ctx.fillStyle = '#2a2118';
        ctx.fillRect(px + TILE / 2 - 3, py + 8, 6, TILE - 14);
        ctx.fillStyle = COLORS.lampGlow;
        ctx.beginPath();
        ctx.arc(px + TILE / 2, py + 12, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawLoot(ctx, world, time) {
  for (const item of world.loot) {
    if (item.taken) continue;
    const centre = tileCenter(item.x, item.y);
    const bob = Math.sin(time * 2 + item.x) * 3;
    const glow = ctx.createRadialGradient(centre.x, centre.y + bob, 2, centre.x, centre.y + bob, 26);
    glow.addColorStop(0, 'rgba(245, 197, 66, 0.55)');
    glow.addColorStop(1, 'rgba(245, 197, 66, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(centre.x - 26, centre.y + bob - 26, 52, 52);
    ctx.save();
    ctx.translate(centre.x, centre.y + bob);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(-8, -8, 16, 16);
    ctx.strokeStyle = '#8a6d1d';
    ctx.lineWidth = 2;
    ctx.strokeRect(-8, -8, 16, 16);
    ctx.restore();
  }
}

function drawExit(ctx, world, time) {
  const { x, y } = world.exit;
  const pulse = 0.6 + Math.sin(time * 3) * 0.25;
  ctx.save();
  ctx.globalAlpha = world.exit.open ? pulse : 0.35;
  ctx.fillStyle = world.exit.open ? COLORS.exit : '#c94f4f';
  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = world.exit.open ? '#d8ffe9' : '#e8b0b0';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#0d2b1a';
  ctx.font = 'bold 15px ' + UI_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(world.exit.open ? 'EXIT' : 'LOCK', x, y);
}

function drawCone(ctx, world, guard) {
  const rays = 26;
  const start = guard.facing - SIGHT_HALF_ANGLE;
  const end = guard.facing + SIGHT_HALF_ANGLE;
  let color = COLORS.coneCalm;
  if (guard.state === 'alert') color = COLORS.coneAlarm;
  else if (guard.state === 'suspicious' || guard.state === 'search') color = COLORS.coneSuspicious;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  for (let i = 0; i <= rays; i += 1) {
    const angle = start + ((end - start) * i) / rays;
    const length = rayLength(world.tiles, guard.x, guard.y, angle);
    ctx.lineTo(guard.x + Math.cos(angle) * length, guard.y + Math.sin(angle) * length);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = color.replace(/[\d.]+\)$/, '0.5)');
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawGuard(ctx, guard, time) {
  ctx.save();
  ctx.translate(guard.x, guard.y);
  // Shadow.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 8, 14, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body: uniform coat, facing the patrol direction.
  ctx.rotate(guard.facing);
  ctx.fillStyle = COLORS.guardUniform;
  ctx.beginPath();
  ctx.arc(0, 0, GUARD_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.guard;
  ctx.beginPath();
  ctx.arc(6, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  // Cap brim and a lamp on the chest.
  ctx.fillStyle = '#22345e';
  ctx.fillRect(8, -8, 6, 16);
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(2, 0, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // State mark and the detection ring above the head.
  const mark = guard.state === 'alert' ? '!' : (guard.state === 'suspicious' || guard.state === 'search' ? '?' : '');
  if (mark) {
    ctx.font = 'bold 22px ' + UI_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = guard.state === 'alert' ? '#ff5b5b' : '#ffb43c';
    ctx.fillText(mark, guard.x, guard.y - 30);
  }
  if (guard.detection > 0.04 && guard.state !== 'alert') {
    ctx.strokeStyle = 'rgba(255, 180, 60, 0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 20, -Math.PI / 2, -Math.PI / 2 + guard.detection * Math.PI * 2);
    ctx.stroke();
  }
}

function drawPlayer(ctx, world) {
  const player = world.player;
  ctx.save();
  ctx.translate(player.x, player.y);
  if (player.hidden) ctx.globalAlpha = 0.55;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(0, 9, 13, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(player.facing);
  // Cloak.
  ctx.fillStyle = COLORS.playerCloak;
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(-10, -11);
  ctx.lineTo(-7, 0);
  ctx.lineTo(-10, 11);
  ctx.closePath();
  ctx.fill();
  // Hood and face shadow.
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.arc(2, 0, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#241d3a';
  ctx.beginPath();
  ctx.arc(6, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (player.sneaking) {
    ctx.font = '11px ' + UI_FONT;
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.dim;
    ctx.fillText('sneaking', player.x, player.y - 24);
  }
}

function drawEffects(ctx, world) {
  for (const fx of world.noiseFx) {
    const progress = fx.age / 0.9;
    ctx.strokeStyle = `rgba(255, 220, 130, ${0.7 * (1 - progress)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, fx.radius * progress, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (world.pebbleFx) {
    const fx = world.pebbleFx;
    ctx.fillStyle = '#cfd4e8';
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawDarkness(ctx, world) {
  if (!lightCanvas) {
    lightCanvas = document.createElement('canvas');
    lightCanvas.width = VIEW_W;
    lightCanvas.height = VIEW_H;
  }
  const dark = lightCanvas.getContext('2d');
  dark.clearRect(0, 0, VIEW_W, VIEW_H);
  dark.fillStyle = 'rgba(3, 5, 16, 0.5)';
  dark.fillRect(0, 0, VIEW_W, VIEW_H);
  dark.globalCompositeOperation = 'destination-out';
  const hole = (x, y, radius, strength) => {
    const gradient = dark.createRadialGradient(x, y, 4, x, y, radius);
    gradient.addColorStop(0, `rgba(0, 0, 0, ${strength})`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    dark.fillStyle = gradient;
    dark.beginPath();
    dark.arc(x, y, radius, 0, Math.PI * 2);
    dark.fill();
  };
  for (const lamp of world.lamps) {
    const centre = tileCenter(lamp.x, lamp.y);
    hole(centre.x, centre.y, TILE * 2.6, 0.95);
  }
  hole(world.player.x, world.player.y, TILE * 2.0, 0.8);
  hole(world.exit.x, world.exit.y, TILE * 1.6, world.exit.open ? 0.9 : 0.4);
  dark.globalCompositeOperation = 'source-over';
  ctx.drawImage(lightCanvas, 0, 0);
}

function drawHud(ctx, world) {
  ctx.fillStyle = COLORS.hud;
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.fillStyle = '#232a4a';
  ctx.fillRect(0, HUD_H - 2, VIEW_W, 2);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 17px ' + UI_FONT;
  ctx.fillText('LAMPLIGHT', 18, 24);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '13px ' + UI_FONT;
  ctx.fillText(world.level.name, 18, 46);
  // Loot pips.
  for (let i = 0; i < world.totalLoot; i += 1) {
    const x = 300 + i * 30;
    ctx.save();
    ctx.translate(x, 32);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = i < world.lootTaken ? COLORS.gold : '#3a4066';
    ctx.fillRect(-7, -7, 14, 14);
    ctx.restore();
  }
  ctx.fillStyle = COLORS.dim;
  ctx.font = '13px ' + UI_FONT;
  ctx.fillText(`Loot ${world.lootTaken}/${world.totalLoot}`, 300 + world.totalLoot * 30 + 8, 32);
  // Pebbles.
  ctx.fillStyle = COLORS.text;
  ctx.font = '13px ' + UI_FONT;
  ctx.fillText(`Pebbles: ${'●'.repeat(world.pebbles)}${'○'.repeat(PEBBLES_PER_LEVEL - world.pebbles)}  (click or Q to throw)`, 520, 32);
  // Detection meter.
  const detection = world.maxDetection();
  ctx.fillStyle = COLORS.dim;
  ctx.font = 'bold 12px ' + UI_FONT;
  ctx.fillText('SEEN', 860, 24);
  ctx.fillStyle = '#2a3054';
  ctx.fillRect(860, 34, 170, 10);
  ctx.fillStyle = detection > 0.66 ? '#ff5b5b' : detection > 0.33 ? '#ffb43c' : '#7ad08a';
  ctx.fillRect(860, 34, 170 * detection, 10);
  // Score and time.
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 16px ' + UI_FONT;
  ctx.fillText(`Score ${world.score}`, VIEW_W - 18, 24);
  const minutes = Math.floor(world.levelTime / 60);
  const seconds = Math.floor(world.levelTime % 60).toString().padStart(2, '0');
  ctx.fillStyle = COLORS.dim;
  ctx.font = '13px ' + UI_FONT;
  ctx.fillText(`${minutes}:${seconds}`, VIEW_W - 18, 46);
  ctx.textAlign = 'left';

  if (world.anyAlert()) {
    ctx.fillStyle = 'rgba(180, 30, 30, 0.85)';
    ctx.fillRect(VIEW_W / 2 - 110, HUD_H + 10, 220, 34);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px ' + UI_FONT;
    ctx.textAlign = 'center';
    ctx.fillText('! SPOTTED !', VIEW_W / 2, HUD_H + 28);
    ctx.textAlign = 'left';
  }
  if (world.messageTimer > 0 && world.message) {
    ctx.fillStyle = 'rgba(10, 14, 32, 0.8)';
    const width = ctx.measureText(world.message).width + 28;
    ctx.fillRect(VIEW_W / 2 - width / 2, VIEW_H - 44, width, 30);
    ctx.fillStyle = COLORS.text;
    ctx.font = '14px ' + UI_FONT;
    ctx.textAlign = 'center';
    ctx.fillText(world.message, VIEW_W / 2, VIEW_H - 29);
    ctx.textAlign = 'left';
  }
}

function drawButton(ctx, id, label, x, y, w, h, world) {
  ctx.fillStyle = '#3a2f7d';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#8a7ae0';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 17px ' + UI_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  ctx.textAlign = 'left';
  world.uiButtons.push({ id, x, y, w, h });
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(8, 11, 28, 0.92)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#4a5488';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

function drawTitle(ctx, world) {
  ctx.fillStyle = '#0a0d20';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const glow = ctx.createRadialGradient(VIEW_W / 2, 300, 20, VIEW_W / 2, 300, 420);
  glow.addColorStop(0, 'rgba(255, 210, 122, 0.16)');
  glow.addColorStop(1, 'rgba(255, 210, 122, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.gold;
  ctx.font = '64px ' + TITLE_FONT;
  ctx.fillText('LAMPLIGHT', VIEW_W / 2, 190);
  ctx.fillStyle = COLORS.text;
  ctx.font = 'italic 21px ' + TITLE_FONT;
  ctx.fillText('A thief in the night museum', VIEW_W / 2, 240);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '16px ' + UI_FONT;
  ctx.fillText('Pocket every treasure in each wing, then slip out through the green exit — unseen.', VIEW_W / 2, 300);
  ctx.fillText('Guards patrol with cones of sight. Crates block their view, bushes hide you,', VIEW_W / 2, 328);
  ctx.fillText('lamplight exposes you, and running is loud. Sneak with Shift. Throw a pebble', VIEW_W / 2, 356);
  ctx.fillText('with a click or Q to pull a guard away. Three wings. One quiet night.', VIEW_W / 2, 384);
  ctx.fillStyle = COLORS.text;
  ctx.font = '15px ' + UI_FONT;
  ctx.fillText('Move — WASD or arrows      Sneak — Shift      Pebble — click / Q', VIEW_W / 2, 440);
  ctx.fillText('Pause — P      Mute — M      Restart wing — R', VIEW_W / 2, 466);
  drawButton(ctx, 'start', 'Begin the heist', VIEW_W / 2 - 130, 520, 260, 56, world);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '13px ' + UI_FONT;
  ctx.fillText('An original game — no art, music or names borrowed from anyone.', VIEW_W / 2, 620);
  ctx.textAlign = 'left';
}

function drawPaused(ctx, world) {
  ctx.fillStyle = 'rgba(5, 8, 20, 0.7)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  panel(ctx, VIEW_W / 2 - 260, VIEW_H / 2 - 110, 520, 220);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 34px ' + TITLE_FONT;
  ctx.fillText('Paused', VIEW_W / 2, VIEW_H / 2 - 50);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '15px ' + UI_FONT;
  ctx.fillText('The guards wait. Take a breath.', VIEW_W / 2, VIEW_H / 2 - 8);
  drawButton(ctx, 'resume', 'Keep sneaking', VIEW_W / 2 - 110, VIEW_H / 2 + 22, 220, 50, world);
  ctx.textAlign = 'left';
}

function drawCaught(ctx, world) {
  ctx.fillStyle = 'rgba(20, 4, 8, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  panel(ctx, VIEW_W / 2 - 280, VIEW_H / 2 - 140, 560, 280);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff6b6b';
  ctx.font = 'bold 44px ' + TITLE_FONT;
  ctx.fillText('CAUGHT!', VIEW_W / 2, VIEW_H / 2 - 80);
  ctx.fillStyle = COLORS.text;
  ctx.font = '16px ' + UI_FONT;
  ctx.fillText('A guard laid hands on the thief. The wing resets — the loot is still there.', VIEW_W / 2, VIEW_H / 2 - 30);
  ctx.fillStyle = COLORS.dim;
  ctx.fillText(`${world.level.name}   •   Loot ${world.lootTaken}/${world.totalLoot}   •   Score ${world.score}`, VIEW_W / 2, VIEW_H / 2 + 4);
  drawButton(ctx, 'retry', 'Try the wing again  (R)', VIEW_W / 2 - 140, VIEW_H / 2 + 34, 280, 52, world);
  ctx.textAlign = 'left';
}

function drawClear(ctx, world) {
  ctx.fillStyle = 'rgba(4, 16, 10, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  panel(ctx, VIEW_W / 2 - 280, VIEW_H / 2 - 150, 560, 300);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.exit;
  ctx.font = 'bold 38px ' + TITLE_FONT;
  ctx.fillText('Wing cleared!', VIEW_W / 2, VIEW_H / 2 - 92);
  ctx.fillStyle = COLORS.text;
  ctx.font = '16px ' + UI_FONT;
  const bonus = world.levelBonus || { timeBonus: 0, ghostBonus: 0 };
  ctx.fillText(`${world.level.name} — all ${world.totalLoot} treasures pocketed.`, VIEW_W / 2, VIEW_H / 2 - 46);
  ctx.fillStyle = COLORS.dim;
  ctx.fillText(`Time bonus  +${bonus.timeBonus}`, VIEW_W / 2, VIEW_H / 2 - 12);
  ctx.fillText(bonus.ghostBonus > 0 ? `Ghost bonus  +${bonus.ghostBonus}  (never spotted)` : 'Ghost bonus  +0  (the guards saw you)', VIEW_W / 2, VIEW_H / 2 + 16);
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 18px ' + UI_FONT;
  ctx.fillText(`Score ${world.score}`, VIEW_W / 2, VIEW_H / 2 + 52);
  const last = world.levelIndex + 1 >= 3;
  drawButton(ctx, 'next', last ? 'See the final tally' : 'Enter the next wing', VIEW_W / 2 - 150, VIEW_H / 2 + 82, 300, 52, world);
  ctx.textAlign = 'left';
}

function drawWin(ctx, world) {
  ctx.fillStyle = '#0a0d20';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const glow = ctx.createRadialGradient(VIEW_W / 2, 260, 20, VIEW_W / 2, 260, 460);
  glow.addColorStop(0, 'rgba(245, 197, 66, 0.2)');
  glow.addColorStop(1, 'rgba(245, 197, 66, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.gold;
  ctx.font = '52px ' + TITLE_FONT;
  ctx.fillText('The Velvet Ledger is yours', VIEW_W / 2, 200);
  ctx.fillStyle = COLORS.text;
  ctx.font = 'italic 20px ' + TITLE_FONT;
  ctx.fillText('Three wings, every treasure, and the dawn none the wiser.', VIEW_W / 2, 248);
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 22px ' + UI_FONT;
  ctx.fillText(`Final score  ${world.score}`, VIEW_W / 2, 320);
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 26px ' + UI_FONT;
  ctx.fillText(world.rating(), VIEW_W / 2, 366);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '15px ' + UI_FONT;
  ctx.fillText(`Spotted ${world.timesSpotted} time${world.timesSpotted === 1 ? '' : 's'}   •   Ghost wings ${world.ghostLevels} of 3`, VIEW_W / 2, 404);
  drawButton(ctx, 'again', 'Steal it all again', VIEW_W / 2 - 130, 470, 260, 54, world);
  ctx.textAlign = 'left';
}

export function render(ctx, world, time) {
  world.uiButtons = [];
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  if (world.screen === SCREEN_TITLE) {
    drawTitle(ctx, world);
    return;
  }
  drawFloor(ctx, world);
  drawProps(ctx, world, time);
  drawLoot(ctx, world, time);
  drawExit(ctx, world, time);
  drawWalls(ctx, world);
  drawDarkness(ctx, world);
  for (const guard of world.guards) drawCone(ctx, world, guard);
  for (const guard of world.guards) drawGuard(ctx, guard, time);
  drawPlayer(ctx, world);
  drawEffects(ctx, world);
  drawHud(ctx, world);
  if (world.screen === SCREEN_PAUSED) drawPaused(ctx, world);
  else if (world.screen === SCREEN_CAUGHT) drawCaught(ctx, world);
  else if (world.screen === SCREEN_CLEAR) drawClear(ctx, world);
  else if (world.screen === SCREEN_WIN) drawWin(ctx, world);
}
