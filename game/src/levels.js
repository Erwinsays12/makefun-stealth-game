// The three wings of the night museum. A level is built from coordinates,
// so no hand-counted rows can drift out of shape:
//
//   walls   rectangles [x, y, width, height] of solid wall (plus the border)
//   crates  [x, y] cover — blocks movement and sight, hide behind it
//   bushes  [x, y] walkable for the thief only; hides you, blocks sight
//   lamps   [x, y] pools of warm light; being seen there is worse
//   loot    [x, y] walk it over to pocket it
//   exit    [x, y] opens once every loot is pocketed
//   player  [x, y] where the thief slips in
//   guards  patrol waypoints, walked in order and back again; every leg
//           must be a straight, unblocked corridor
export const COLS = 26;
export const ROWS = 15;

export const LEVELS = [
  {
    name: 'I — The Marble Hall',
    hint: 'Stay out of the cones. Crates block sight; bushes hide you.',
    seed: 11,
    walls: [[8, 1, 1, 6], [8, 8, 1, 6], [16, 1, 1, 2], [16, 4, 1, 6], [16, 11, 1, 3]],
    crates: [[4, 3], [10, 2], [11, 8], [20, 4], [13, 12]],
    bushes: [[10, 6], [18, 10]],
    lamps: [[14, 1], [5, 13]],
    loot: [[21, 1], [21, 6], [3, 13]],
    exit: [23, 13],
    player: [1, 1],
    guards: [
      { waypoints: [[2, 2], [6, 2], [6, 12], [2, 12]], pause: 1.2 },
      { waypoints: [[19, 2], [23, 2], [23, 11], [19, 11]], pause: 1.0 },
    ],
  },
  {
    name: 'II — The Gallery of Moths',
    hint: 'Lamplight exposes you. Run and they will hear your steps.',
    seed: 23,
    walls: [[8, 1, 1, 4], [8, 6, 1, 8], [16, 1, 1, 1], [16, 3, 1, 5], [16, 10, 1, 4], [9, 7, 3, 1], [13, 7, 3, 1]],
    crates: [[3, 3], [10, 3], [18, 6], [11, 9], [22, 3], [5, 11]],
    bushes: [[10, 6], [18, 12]],
    lamps: [[12, 1], [6, 11], [20, 5]],
    loot: [[21, 1], [3, 12], [22, 10]],
    exit: [23, 13],
    player: [1, 1],
    guards: [
      { waypoints: [[2, 2], [6, 2], [6, 6], [2, 6]], pause: 0.9 },
      { waypoints: [[11, 2], [14, 2], [14, 6], [11, 6]], pause: 1.1 },
      { waypoints: [[19, 2], [23, 2], [23, 12], [19, 12]], pause: 1.0 },
    ],
  },
  {
    name: 'III — The Vault Wing',
    hint: 'Four guards, short patrols, no safe route twice.',
    seed: 37,
    walls: [
      [8, 1, 1, 1], [8, 3, 1, 6], [8, 11, 1, 3],
      [16, 1, 1, 4], [16, 6, 1, 5], [16, 13, 1, 1],
      [1, 7, 3, 1], [5, 7, 3, 1], [17, 7, 3, 1], [21, 7, 4, 1],
    ],
    crates: [[3, 3], [10, 3], [20, 3], [12, 9], [22, 11], [5, 12]],
    bushes: [[10, 6], [19, 11]],
    lamps: [[11, 1], [6, 12], [20, 9]],
    loot: [[20, 1], [3, 12], [22, 8], [13, 13]],
    exit: [23, 13],
    player: [1, 1],
    guards: [
      { waypoints: [[2, 2], [6, 2], [6, 6], [2, 6]], pause: 0.8 },
      { waypoints: [[11, 2], [14, 2], [14, 6], [11, 6]], pause: 1.1 },
      { waypoints: [[19, 2], [23, 2], [23, 6], [19, 6]], pause: 0.8 },
      { waypoints: [[2, 10], [6, 10], [6, 13], [2, 13]], pause: 1.0 },
    ],
  },
];

// Build a level's tile grid plus the interesting positions.
export function parseLevel(level) {
  const tiles = [];
  for (let y = 0; y < ROWS; y += 1) {
    const row = [];
    for (let x = 0; x < COLS; x += 1) {
      row.push(x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1 ? '#' : '.');
    }
    tiles.push(row);
  }
  for (const [x, y, w, h] of level.walls) {
    for (let yy = y; yy < y + h; yy += 1) {
      for (let xx = x; xx < x + w; xx += 1) tiles[yy][xx] = '#';
    }
  }
  for (const [x, y] of level.crates) tiles[y][x] = 'C';
  for (const [x, y] of level.bushes) tiles[y][x] = 'B';
  for (const [x, y] of level.lamps) tiles[y][x] = 'l';
  const loot = level.loot.map(([x, y]) => ({ x, y, taken: false }));
  for (const item of loot) tiles[item.y][item.x] = 'o';
  tiles[level.exit[1]][level.exit[0]] = 'E';
  tiles[level.player[1]][level.player[0]] = 'P';
  const lamps = level.lamps.map(([x, y]) => ({ x, y }));
  return {
    tiles,
    loot,
    lamps,
    player: { x: level.player[0], y: level.player[1] },
    exit: { x: level.exit[0], y: level.exit[1] },
  };
}

export function isWallTile(tile) {
  return tile === '#' || tile === 'C';
}

export function isBushTile(tile) {
  return tile === 'B';
}
