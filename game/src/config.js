// Lamplight — a top-down stealth game in a night museum.
// Shared tuning: tile size, movement, sight and hearing.
export const TILE = 48;
export const COLS = 26;
export const ROWS = 15;
export const HUD_H = 64;
export const VIEW_W = COLS * TILE + 32;
export const VIEW_H = HUD_H + ROWS * TILE + 16;
export const ORIGIN_X = 16;
export const ORIGIN_Y = HUD_H + 8;

// How fast the thief moves, in pixels per second.
export const WALK_SPEED = 150;
export const SNEAK_SPEED = 82;
export const GUARD_SPEED = 78;
export const CHASE_SPEED = 132;
export const PLAYER_RADIUS = 13;
export const GUARD_RADIUS = 14;

// Sight: how far a guard sees, and how wide the cone is.
export const SIGHT_RANGE = 265;
export const SIGHT_HALF_ANGLE = 0.62; // radians, about 35 degrees each side
export const SNEAK_VISIBILITY = 0.45; // sneaking is much harder to spot
export const BUSH_VISIBILITY = 0.12; // hidden in a bush unless nearly touching
export const SHADOW_VISIBILITY = 0.6; // dark floor hides you a little
export const LIT_VISIBILITY = 1.35; // standing in lamplight exposes you

// Detection: 0 is unseen, 1 is caught in the act.
export const DETECT_FILL = 0.9; // per second at point blank, full light
export const DETECT_DECAY = 0.35; // per second while unseen
export const SUSPICIOUS_AT = 0.45; // guard comes to look
export const ALARM_AT = 1.0; // guard gives chase
export const SEARCH_SECONDS = 4.0; // how long a guard hunts the last seen spot
export const CATCH_RADIUS = 24; // guard touches the thief: caught

// Hearing: running is loud, sneaking is silent.
export const NOISE_RUN_RADIUS = 170;
export const NOISE_PEBBLE_RADIUS = 210;
export const PEBBLES_PER_LEVEL = 3;

export const COLORS = {
  floorA: '#2b3350',
  floorB: '#262d47',
  floorLine: '#323b5e',
  wall: '#171c30',
  wallTop: '#3d4a7d',
  crate: '#6b4f2a',
  crateTop: '#8a6a3c',
  bush: '#1e4d2e',
  bushLeaf: '#2f7a44',
  lampGlow: '#ffd27a',
  exit: '#39d98a',
  gold: '#f5c542',
  player: '#e8e4d8',
  playerCloak: '#7a5fd0',
  guard: '#d8d3c3',
  guardUniform: '#3e5a8a',
  coneCalm: 'rgba(255, 214, 120, 0.20)',
  coneSuspicious: 'rgba(255, 170, 60, 0.30)',
  coneAlarm: 'rgba(255, 70, 70, 0.34)',
  hud: '#10142a',
  text: '#eef1ff',
  dim: '#9aa3c7',
};
