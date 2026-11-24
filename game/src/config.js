// Every tuning number for the whole game, in one place so the rest of the code stays readable.
export const STEP = 1 / 60;

export const CITY = {
  seed: 20260,
  side: 9,          // grid blocks per side; the city spans side x side blocks
  block: 92,        // block edge in world units (roads included, so buildings sit inside)
  road: 24,         // road width between buildings
  sidewalk: 5,      // sidewalk strip along each building edge
  beach: 90,        // beach depth on the ocean side
  pierX: 420,       // boardwalk pier position
  pierZ: -660,
};

export const WORLD = {
  bounds: CITY.side * CITY.block + 60,   // soft wall radius for the player/cars
  gravity: 30,
  date: 'Sunny, 29 °C — Azure Cove, the Lume Coast',
};

export const BUILD = {
  minStoreys: 2,
  maxStoreys: 15,
  storeyH: 3.4,
  setbackChance: 0.55,
  towerChance: 0.22,
};

export const PALETTE = {
  skyTop: 0x1f7ed6,
  skyHorizon: 0xd8f2ff,
  sun: 0xfff0c0,
  haze: 0xf6ead4,
  water: 0x27b3c9,
  waterDeep: 0x0e7f9b,
  sand: 0xf2dcb0,
  sandDark: 0xdfc084,
  road: 0x3c4048,
  roadDark: 0x2d3038,
  sidewalk: 0xc8c0b0,
  curb: 0x9d9688,
  grass: 0x8fd98a,
  grassDark: 0x6ec377,
  line: 0xf2e294,
  whiteLine: 0xf4f6f0,
};

export const PLAYER = {
  walkSpeed: 6.5,
  runSpeed: 11,
  health: 100,
  radius: 0.55,
  height: 1.8,
  hurtCooldown: 0.9,
  gunRange: 120,
  gunDamage: 34,
  gunCooldown: 0.24,
  fireError: 0.04, // radians of aim spread
};

export const CAMERA = {
  fov: 62,
  near: 0.1,
  far: 2400,
  follow: 10,
  height: 4.4,
  lookAhead: 6,
  targetDistance: 9.5,
  targetHeight: 3.6,
  targetDistanceCar: 11.5,
  targetHeightCar: 4.6,
  sensitivity: 0.0035,
  pitchMin: 0.08,
  pitchMax: 1.15,
};

export const CAR = {
  enterRange: 4,
  exitOffset: 2.2,
  idleSpeed: 8,
  target: 11,
  accel: 22,
  brake: 34,
  reverse: 12,
  maxReverse: 7,
  turnRate: 2.1,
  driftTurnRate: 3.2,
  driftFriction: 1.35,
  gripFriction: 0.985,
  speedMul: 0.62,     // units/second per speed-unit
  handbrakeMul: 0.62, // traction loss during a slide
  handbrakeStop: 6,
  maxHealth: 100,
};

export const TRAFFIC = {
  count: 16,
  laneOffset: 3.6,
  minSpeed: 7,
  maxSpeed: 13,
  stopDist: 11,
  stopLight: 22,
};

export const PEDESTRIANS = {
  count: 26,
  speed: 2.6,
  walkRadius: 34,
};

export const WANTED = {
  crimeToStar: 90,      // crime points per star
  decayRate: 1.9,       // crime points lost per second when out of sight
  maxStars: 5,
  copSight: 26,
  copLoseSight: 48,
  searchDuration: 14,
  escapeCooldown: 6,
  bustRange: 3.2,
};

export const POLICE = {
  maxCops: 8,
  spawnDist: 150,
  spawnRadius: 30,
  despawnDist: 320,
  cruiseSpeed: 11,
  ramSpeed: 19,
  ramDistance: 4.5,
  catchRange: 3.6,
  catchSpeed: 2.2,
};

export const MISSIONS = [
  {
    id: 'm1',
    title: 'First Gear — A Borrowed Car',
    summary: 'Walk to a parked car, steal it and lose the heat.',
    deliver: 'Lose any wanted level with the car delivered to the Palm & Pier Motel.',
  },
  {
    id: 'm2',
    title: 'Hot Parcel — Boardwalk Run',
    summary: 'Deliver the package to the boardwalk before sundown.',
    deliver: 'Reach the boardwalk pier and drop the parcel at the marker.',
  },
  {
    id: 'm3',
    title: 'Riptide — A Final Errand',
    summary: 'Take Harrow a last parcel, then escape the cops.',
    deliver: 'Reach the northern surf shop, then survive the wanted level that follows.',
  },
];

export const ACTIVITY = {
  boostAmount: 120,
  boostWarm: 8,
};

export const AUDIO = {
  master: 0.55,
  click: 0.07,
};

export const KEYS = {
  W: ['KeyW', 'ArrowUp'],
  A: ['KeyA', 'ArrowLeft'],
  S: ['KeyS', 'ArrowDown'],
  D: ['KeyD', 'ArrowRight'],
  ENTER_CAR: ['KeyE'],
  HANDBRAKE: ['Space'],
  SHOOT: ['KeyF'],
  RUN: ['ShiftLeft', 'ShiftRight'],
  PAUSE: ['Escape'],
  MUTE: ['KeyM'],
  START: ['Space', 'Enter'],
};