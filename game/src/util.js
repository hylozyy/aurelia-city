// Small shared helpers: a seeded random generator, math utilities, colour helpers and a
// DOM builder for the HUD. No other module depends on Three.js through this file.
export function createRandom(seed) {
  let a = seed >>> 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function damp(a, b, lambda, dt) {
  return lerp(a, b, 1 - Math.exp(-lambda * dt));
}

export function angleLerp(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

/** Exponential smoothing toward an angle, for (a, b, rate, dt) callers. */
export function dampAngle(a, b, rate, dt) {
  return angleLerp(a, b, 1 - Math.exp(-rate * dt));
}

export function dist2(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}

export function angleTo(x, z) {
  return Math.atan2(x, z);
}

/** A random element from an array. */
export function pick(random, list) {
  return list[Math.floor(random() * list.length)];
}

const PALETTE = [
  '#e8883a', '#e8553f', '#f2b84b', '#d99a2b', '#2fb7c9', '#3fae6b', '#5f8fdb',
  '#d76bb0', '#7a8dd6', '#e0a4c0', '#75c4a0', '#f08a4b', '#c9a6db', '#f2e2ec',
];
export function randomBuildingColor(random) {
  return pick(random, PALETTE);
}

const ACCENTS = ['#ffca6b', '#2f9fd0', '#ff8f6b', '#2fae87', '#e98ad1', '#5f8ff2', '#f4a261', '#5fc9d8'];
export function randomAccent(random) {
  return pick(random, ACCENTS);
}

/** A hex colour like #a1b2c3 to a THREE.Color. */
export function css(c) {
  return new THREE.Color(c);
}

export function vec3(x, y, z) {
  return new THREE.Vector3(x, y, z);
}

export function hue(h, s, l) {
  return new THREE.Color().setHSL(h, s, l);
}

export function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** A tiny spatial-grid accelerator for finding nearby things in 2D. */
export function makeGrid(cell) {
  const cells = new Map();
  function key(cx, cz) {
    return cx * 100000 + cz;
  }
  return {
    clear() {
      cells.clear();
    },
    insert(ix, iz, item) {
      const k = key(Math.floor(ix / cell), Math.floor(iz / cell));
      let arr = cells.get(k);
      if (!arr) {
        arr = [];
        cells.set(k, arr);
      }
      arr.push(item);
    },
    query(ix, iz, radius) {
      const out = [];
      const minX = Math.floor((ix - radius) / cell);
      const maxX = Math.floor((ix + radius) / cell);
      const minZ = Math.floor((iz - radius) / cell);
      const maxZ = Math.floor((iz + radius) / cell);
      for (let x = minX; x <= maxX; x++) {
        for (let z = minZ; z <= maxZ; z++) {
          const arr = cells.get(key(x, z));
          if (arr) for (const item of arr) out.push(item);
        }
      }
      return out;
    },
  };
}