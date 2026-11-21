// Lamplight's front door: the canvas, the frame loop, the menus' buttons,
// and the sounds the world asks for. A ?shot=name URL freezes one staged
// frame instead of playing, so screenshots are always the same picture.
import { VIEW_W, VIEW_H } from './config.js';
import { World, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_CAUGHT, SCREEN_CLEAR, SCREEN_WIN } from './world.js';
import { render } from './render.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const ctx = canvas.getContext('2d');
const statusLine = document.getElementById('status');

const world = new World();
const input = new Input(canvas);
const sounds = new SoundBank();
let lastTime = performance.now();
let announcedScreen = '';

function playSound(name) {
  if (name === 'step') sounds.footstep(false);
  else if (name === 'step-quiet') sounds.footstep(true);
  else if (name === 'pebble') sounds.pebble();
  else if (name === 'pickup') sounds.pickup();
  else if (name === 'suspicious') sounds.suspicious();
  else if (name === 'alarm') sounds.alarm();
  else if (name === 'caught') sounds.caught();
  else if (name === 'clear') sounds.levelClear();
}

function drainSounds() {
  while (world.sounds.length > 0) playSound(world.sounds.shift());
}

function clickButton(id) {
  if (!world.uiButtons) return false;
  return world.uiButtons.some(
    (button) => button.id === id
      && input.mouse.clickX >= button.x && input.mouse.clickX <= button.x + button.w
      && input.mouse.clickY >= button.y && input.mouse.clickY <= button.y + button.h,
  );
}

function announce() {
  if (world.screen === announcedScreen) return;
  announcedScreen = world.screen;
  const lines = {
    [SCREEN_TITLE]: 'Lamplight title screen. Press Enter to begin the heist.',
    [SCREEN_PLAY]: `${world.level.name}. Loot ${world.lootTaken} of ${world.totalLoot}.`,
    [SCREEN_PAUSED]: 'Paused.',
    [SCREEN_CAUGHT]: 'Caught! Press R to try the wing again.',
    [SCREEN_CLEAR]: 'Wing cleared.',
    [SCREEN_WIN]: `You win. Final score ${world.score}. ${world.rating()}.`,
  };
  statusLine.textContent = lines[world.screen] || '';
}

function handleMenus() {
  sounds.unlock();
  if (input.wasPressed('m')) sounds.muted = !sounds.muted;
  if (world.screen === SCREEN_TITLE) {
    if (input.wasPressed('enter') || input.mouse.clicked) world.startGame();
  } else if (world.screen === SCREEN_PLAY) {
    if (input.wasPressed('p')) world.screen = SCREEN_PAUSED;
    else if (input.wasPressed('r')) world.resetLevel();
  } else if (world.screen === SCREEN_PAUSED) {
    if (input.wasPressed('p') || input.wasPressed('enter') || clickButton('resume')) world.screen = SCREEN_PLAY;
  } else if (world.screen === SCREEN_CAUGHT) {
    if (input.wasPressed('r') || input.wasPressed('enter') || clickButton('retry')) world.resetLevel();
  } else if (world.screen === SCREEN_CLEAR) {
    if (input.wasPressed('enter') || clickButton('next')) world.nextLevel();
  } else if (world.screen === SCREEN_WIN) {
    if (input.wasPressed('enter') || clickButton('again')) world.startGame();
  }
}

function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  handleMenus();
  if (world.screen === SCREEN_PLAY) world.update(dt, input);
  drainSounds();
  render(ctx, world, now / 1000);
  announce();
  input.endFrame();
  requestAnimationFrame(frame);
}

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  // A staged screenshot: one frozen frame, no loop, no input.
  stageShot(shot, world);
  document.title = `Lamplight — ${shot}`;
  requestAnimationFrame(() => {
    render(ctx, world, 1.7);
    statusLine.textContent = `Lamplight screenshot: ${shot}.`;
  });
} else {
  requestAnimationFrame(frame);
}
