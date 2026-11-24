// Procedural Azure Cove: a sun-soaked coastal grid city. Every building is built from many
// parts — stepped towers, balconies, window frames, awnings, rooftop plant — each with its own
// materials so no two fronts read the same. Roads, sidewalks, palms, street lamps, traffic
// lights, a pier, a boardwalk, beach and low coastal grass fill out the open world.
import { CITY, BUILD, PALETTE, TRAFFIC, PEDESTRIANS } from './config.js';
import { createRandom, randomBuildingColor, randomAccent, css, hue, clamp } from './util.js';

const ROAD = CITY.road;
const BLOCK = CITY.block;
const SIDE = CITY.side;
const SIDEWALK = CITY.sidewalk;
const HALF = (SIDE * BLOCK) / 2;

const cachedGeo = new Map();

function box(w, h, d, m, s) {
  const key = `${w}|${h}|${d}`;
  let geo = cachedGeo.get(key);
  if (!geo) {
    geo = new THREE.BoxGeometry(w, h, d, s ?? 1, s ?? 1, s ?? 1);
    cachedGeo.set(key, geo);
  }
  return new THREE.Mesh(geo, m);
}

function isRoadAt(x, z) {
  // Returns the road lane axis crossing cell (x, z), or null when it is on a building/sidewalk cell.
  const lm = Math.floor((x + ROAD + SIDEWALK) / BLOCK) * BLOCK - SIDEWALK - ROAD / 2;
  const lz = Math.floor((z + ROAD + SIDEWALK) / BLOCK) * BLOCK - SIDEWALK - ROAD / 2;
  const dx = Math.abs(x - lm);
  const dz = Math.abs(z - lz);
  if (dx < ROAD / 2 && dz < ROAD / 2) {
    // At an intersection or a straight: pick the closer axis.
    return dx < dz ? 'z' : 'x';
  }
  return null;
}

function addRoofPlant(parent, x, z, random) {
  const unit = new THREE.Group();
  unit.position.set(x, 0, z);
  const base = box(12, 2, 12, roofMat, 1);
  base.position.y = 1;
  base.castShadow = false;
  unit.add(base);
  const tank = new THREE.Group();
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 5.6, 10), metalMat);
  cyl.position.y = 4.8;
  tank.add(cyl);
  const cap = box(5.2, 0.8, 5.2, metalMat, 1);
  cap.position.y = 7.9;
  tank.add(cap);
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 3.4, 8), metalMat);
  pipe.position.set(2, 6, 0);
  pipe.rotation.z = 0.4;
  tank.add(pipe);
  tank.position.y = 2;
  tank.position.x = 4.4;
  tank.rotation.y = random() * Math.PI * 2;
  unit.add(tank);
  parent.add(unit);
}

function streetLamp() {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 9, 8), metalMat);
  pole.position.y = 4.5;
  pole.castShadow = true;
  g.add(pole);
  const arm = box(3.6, 0.24, 0.24, metalMat);
  arm.position.set(1.7, 8.8, 0);
  g.add(arm);
  const head = box(1, 0.34, 0.5, lampMat, 2);
  head.position.set(3.4, 8.7, 0);
  g.add(head);
  const glow = new THREE.PointLight(0xfff2cf, 0.0, 26);
  glow.position.set(3.4, 8.6, 0);
  g.add(glow);
  return g;
}

function trafficLight() {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 8, 8), metalMat);
  pole.position.y = 4;
  pole.castShadow = true;
  g.add(pole);
  const boxBody = box(0.9, 2.8, 1.1, metalMat, 2);
  boxBody.position.y = 6.3;
  g.add(boxBody);
  const red = box(0.5, 0.5, 0.1, css('#e5483a'));
  red.position.set(0, 7.3, 0.6);
  g.add(red);
  const amber = box(0.5, 0.5, 0.1, css('#f2b03a'));
  amber.position.set(0, 6.55, 0.6);
  g.add(amber);
  const green = box(0.5, 0.5, 0.1, css('#4fd18c'));
  green.position.set(0, 5.8, 0.6);
  g.add(green);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 0.4, 8), metalMat);
  cap.position.y = 7.8;
  g.add(cap);
  return g;
}

function bench() {
  const g = new THREE.Group();
  const seat = box(2.6, 0.22, 0.9, woodMat, 2);
  seat.position.y = 0.55;
  g.add(seat);
  const back = box(2.6, 0.7, 0.16, woodMat, 2);
  back.position.set(0, 0.95, -0.4);
  g.add(back);
  for (const x of [-1, 1]) {
    const leg = box(0.16, 0.55, 0.7, metalMat);
    leg.position.set(x, 0.28, 0);
    g.add(leg);
  }
  return g;
}

function hydrant() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 1.4, 8), css('#d94f3d'));
  body.position.y = 0.7;
  g.add(body);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), css('#c73f31'));
  cap.position.y = 1.5;
  g.add(cap);
  return g;
}

function beachUmbrella(random) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 4.4, 6), woodMat);
  pole.position.y = 2.2;
  g.add(pole);
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(2.1, 1.5, 12), new THREE.MeshLambertMaterial({ color: randomAccent(random) }));
  canopy.position.y = 4.0;
  canopy.castShadow = true;
  g.add(canopy);
  return g;
}

function parkedSeagull(random) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), css('#ffffff'));
  body.scale.set(1.3, 0.8, 0.8);
  body.position.y = 0.3;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), css('#ffffff'));
  head.position.set(0.3, 0.52, 0);
  g.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.28, 6), css('#f2a23a'));
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0.44, 0.5, 0);
  g.add(beak);
  g.rotation.y = random() * Math.PI * 2;
  return g;
}

export function createCity(carFactory) {
  const random = createRandom(CITY.seed);
  const scene = new THREE.Group();
  const colliders = [];     // {minX,maxX,minZ,maxZ} building footprints (axis aligned)
  const roads = [];         // {axis, at, from, to} road stripes
  const sideSegments = [];  // sidewalk / drivable strips for cars
  const lights = [];        // street lamp base positions for the minimap
  const props = { palms: [], beachUmbrellas: [] };
  const pathNodes = [];     // simple drivable waypoints for traffic/police

  // Shared materials built once.
  const roadMat = new THREE.MeshLambertMaterial({ color: PALETTE.road });
  const curbMat = new THREE.MeshLambertMaterial({ color: PALETTE.curb });
  const sidewalkMat = new THREE.MeshLambertMaterial({ color: PALETTE.sidewalk });
  const lineMat = new THREE.MeshBasicMaterial({ color: PALETTE.line });
  const whiteMat = new THREE.MeshBasicMaterial({ color: PALETTE.whiteLine, fog: false });
  const asphaltMat = new THREE.MeshLambertMaterial({ color: PALETTE.roadDark });
  const sandMat = new THREE.MeshLambertMaterial({ color: PALETTE.sand });
  const sandDarkMat = new THREE.MeshLambertMaterial({ color: PALETTE.sandDark });
  const beachGrassMat = new THREE.MeshLambertMaterial({ color: PALETTE.grass });

  const groundSize = 3200;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(groundSize, groundSize), new THREE.MeshLambertMaterial({ color: PALETTE.sand }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  scene.add(ground);

  const boardwalk = new THREE.Mesh(new THREE.BoxGeometry(SIDE * BLOCK + 170, 0.55, 110), new THREE.MeshLambertMaterial({ color: 0xc9a06a }));
  boardwalk.position.set(0, 0.22, -HALF - 120);
  boardwalk.receiveShadow = true;
  scene.add(boardwalk);
  // Boardwalk planks.
  for (let i = -6; i <= 6; i += 1) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(SIDE * BLOCK + 160, 0.06, 1.1), new THREE.MeshLambertMaterial({ color: i % 2 ? 0xb98e52 : 0xd4ac74 }));
    plank.position.set(0, 0.52, -HALF - 120 + i * 4.2);
    plank.receiveShadow = true;
    scene.add(plank);
  }

  // Beach: a sloped strip at the ocean edge plus sand.
  const beach = new THREE.Mesh(new THREE.BoxGeometry(SIDE * BLOCK + 220, 0.6, CITY.beach), sandMat);
  beach.position.set(0, 0.0, -HALF - 60 - CITY.beach / 2 + 25);
  beach.receiveShadow = true;
  scene.add(beach);
  const wet = new THREE.Mesh(new THREE.BoxGeometry(SIDE * BLOCK + 220, 0.62, CITY.beach * 0.4), sandDarkMat);
  wet.position.set(0, 0.01, -HALF - 105 - CITY.beach * 0.2 + 25);
  wet.receiveShadow = true;
  scene.add(wet);

  // The pier, jutting into the ocean.
  const pier = new THREE.Group();
  pier.position.set(CITY.pierX, 0, CITY.pierZ);
  const pierDeck = new THREE.Mesh(new THREE.BoxGeometry(34, 0.6, 170), woodMat);
  pierDeck.position.y = 1.2;
  pierDeck.castShadow = true;
  pierDeck.receiveShadow = true;
  pier.add(pierDeck);
  for (let i = -7; i <= 7; i += 1) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(33, 0.06, 2.2), new THREE.MeshLambertMaterial({ color: i % 2 ? 0x9a7442 : 0xcaa06a }));
    plank.position.set(0, 1.55, i * 10);
    plank.receiveShadow = true;
    pier.add(plank);
  }
  for (let z = -78; z <= 78; z += 22) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 3.2, 8), woodMat);
    leg.position.set(Math.random() > 0.5 ? 14 : -14, -1.0, z);
    pier.add(leg);
  }
  const railMat = new THREE.MeshLambertMaterial({ color: 0xe8dcbc });
  for (const side of [-1, 1]) {
    const railH = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 150, 6), railMat);
    railH.rotation.x = Math.PI / 2;
    railH.position.set(side * 15.5, 2.1, 0);
    pier.add(railH);
    for (let z = -70; z <= 70; z += 12) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 2.0, 6), railMat);
      post.position.set(side * 15.5, 1.6, z);
      pier.add(post);
    }
  }
  const shack = new THREE.Group();
  const shackBase = box(12, 5, 13, css('#f4e2c0'));
  shackBase.position.y = 4.0;
  shackBase.castShadow = true;
  shack.add(shackBase);
  const shackRoof = new THREE.Mesh(new THREE.ConeGeometry(9, 3.2, 4), css('#d6514a'));
  shackRoof.position.y = 7.6;
  shackRoof.rotation.y = Math.PI / 4;
  shackRoof.castShadow = true;
  shack.add(shackRoof);
  const sign = box(9, 2.6, 0.4, css('#2ba3c8'));
  sign.position.set(0, 5.6, 6.8);
  shack.add(sign);
  shack.position.set(0, 0, -55);
  pier.add(shack);
  scene.add(pier);

  // Beach props.
  for (let i = 0; i < 14; i += 1) {
    const u = beachUmbrella(random);
    const bx = (random() - 0.5) * (SIDE * BLOCK - 120);
    const bz = -HALF - 55 - random() * 50;
    u.position.set(bx, 0.2, bz);
    scene.add(u);
    props.beachUmbrellas.push({ x: bx, z: bz });
  }
  for (let i = 0; i < 10; i += 1) {
    const g = parkedSeagull(random);
    g.position.set((random() - 0.5) * (SIDE * BLOCK - 80), 0.3, -HALF - 40 - random() * 60);
    scene.add(g);
  }

  // Build the grid: for each cell, a sidewalk rim, a road cross, and an optional building.
  for (let bx = 0; bx < SIDE; bx += 1) {
    for (let bz = 0; bz < SIDE; bz += 1) {
      const cx = -HALF + bx * BLOCK + BLOCK / 2;
      const cz = -HALF + bz * BLOCK + BLOCK / 2;
      const cell = new THREE.Group();
      cell.position.set(cx, 0, cz);
      scene.add(cell);

      const buildingW = BLOCK - ROAD - SIDEWALK * 2 - 3;
      const plot = BLOCK - ROAD - SIDEWALK * 2;

      // Sidewalk rim.
      const sidewalk = box(plot, 0.5, plot, sidewalkMat);
      sidewalk.position.y = 0.24;
      sidewalk.receiveShadow = true;
      cell.add(sidewalk);
      const curb = box(plot, 0.55, plot, curbMat);
      curb.position.y = -0.02;
      cell.add(curb);

      // Rooftop building body (multi-part).
      const offsetX = (random() - 0.5) * 8;
      const offsetZ = (random() - 0.5) * 8;
      const building = new THREE.Group();
      const storeys = BUILD.minStoreys + Math.floor(random() * (BUILD.maxStoreys - BUILD.minStoreys + 1));
      const h = storeys * BUILD.storeyH;
      const bwMax = buildingW * (0.55 + random() * 0.4);
      const bdMax = buildingW * (0.55 + random() * 0.4);
      const faceMat = new THREE.MeshLambertMaterial({ color: randomBuildingColor(random) });
      const glassMat = new THREE.MeshLambertMaterial({ color: css(randomAccent(random)).getHex(), emissive: 0x0a1a2a, transparent: true, opacity: 0.85 });
      const roofDeckMat = new THREE.MeshLambertMaterial({ color: 0x9aa2ad });
      // Base slab.
      const baseW = bwMax;
      const baseD = bdMax;
      const base = box(baseW, h * 0.7, baseD, faceMat, 2);
      base.position.y = h * 0.35;
      base.castShadow = true;
      base.receiveShadow = true;
      building.add(base);
      // Upper setback tower on tall buildings.
      if (storeys >= 4 && random() < BUILD.setbackChance) {
        const upW = bwMax * (0.72 + random() * 0.22);
        const upD = bdMax * (0.72 + random() * 0.22);
        const upH = h * 0.4;
        const up = box(upW, upH, upD, faceMat, 2);
        up.position.y = h * 0.7 + upH / 2 + 0.05;
        up.position.x = (random() - 0.5) * (baseW - upW) * 0.5;
        up.position.z = (random() - 0.5) * (baseD - upD) * 0.5;
        up.castShadow = true;
        up.receiveShadow = true;
        building.add(up);
        // Corner accents on the tower.
        for (const sx of [-1, 1]) {
          for (const sz of [-1, 1]) {
            const pil = box(0.7, upH, 0.7, css('#d9d3c4'));
            pil.position.set(up.position.x + sx * (upW / 2 - 0.5), up.position.y, up.position.z + sz * (upD / 2 - 0.5));
            building.add(pil);
          }
        }
      }
      // Rooftop plant on the main block or tower top.
      const roofY = storeys >= 4 && random() < BUILD.setbackChance ? h * 0.7 + h * 0.4 : h * 0.7;
      addRoofPlant(building, 0, 0, random);
      if (random() < 0.5) {
        const ac = box(bwMax * 0.5, 1.3, 1.4, css('#c9cfd4'));
        ac.position.set(2, roofY + 0.65, 2.5);
        building.add(ac);
        const fan = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.3, 6), metalMat);
        fan.position.set(2, roofY + 1.35, 2.5);
        building.add(fan);
      }
      // Glazing ridges: window frames on each face, each with two reflection panes.
      const glassCols = 3 + Math.floor(random() * 5);
      for (let f = 0; f < 4; f += 1) {
        const along = f % 2 === 0 ? baseW : baseD;
        const depth = f % 2 === 0 ? baseD : baseW;
        const span = along * 0.78;
        const w = span / glassCols;
        for (let c = 0; c < glassCols; c += 1) {
          const x = -span / 2 + w * (c + 0.5);
          const strip = box(w * 0.82, h * 0.84, depth + 0.06, glassMat, 2);
          const pad = box(w * 0.9, 0.22, depth + 0.02, css('#ddd8c8'), 2);
          pad.position.y = h * 0.05;
          building.add(pad);
          pad.position.y = h * 0.05;
          strip.position.y = h * 0.58 + (random() - 0.5) * 2.2;
          strip.position.x = x;
          strip.position.z = 0;
          building.add(strip);
        }
        // Balcony slabs on the sunny front only (z front, facing camera in screenshots).
        if (f === 2 || (storeys >= 7 && f === 0)) {
          for (let s = 1; s <= Math.min(storeys - 1, 5); s += 1) {
            const bal = box(baseW * 0.8, 1.2, 0.7, css('#cfc6b4'));
            bal.position.set(0, s * BUILD.storeyH, depth / 2 + 0.2);
            bal.castShadow = true;
            building.add(bal);
            const rail = box(baseW * 0.8, 0.5, 0.12, metalMat);
            rail.position.set(0, s * BUILD.storeyH + 0.75, depth / 2 + 0.55);
            building.add(rail);
          }
        }
      }
      building.position.set(offsetX, 0.5, offsetZ);
      cell.add(building);
      colliders.push({
        minX: cx + offsetX - baseW / 2,
        maxX: cx + offsetX + baseW / 2,
        minZ: cz + offsetZ - baseD / 2,
        maxZ: cz + offsetZ + baseD / 2,
      });
    }
  }

  // Roads: long asphalt strips with dashes and crosswalks.
  for (let i = 0; i <= SIDE; i += 1) {
    const at = -HALF + i * BLOCK;
    const strip = box(ROAD, 0.42, SIDE * BLOCK, roadMat, 1);
    strip.position.set(at, 0.1, 0);
    strip.receiveShadow = true;
    scene.add(strip);
    const stripZ = box(SIDE * BLOCK, 0.42, ROAD, roadMat, 1);
    stripZ.position.set(0, 0.1, at);
    stripZ.receiveShadow = true;
    scene.add(stripZ);
    // Lane dashes along each segment (skip the ocean-most road for the beach border).
    for (let s = 0; s < SIDE; s += 1) {
      const from = -HALF + s * BLOCK;
      const segLen = BLOCK - 6;
      const segMid = from + BLOCK / 2;
      if (i < SIDE) {
        roads.push({ axis: 'z', at: at + ROAD / 4, from, to: from + BLOCK });
        roads.push({ axis: 'z', at: at - ROAD / 4 + ROAD / 6, from, to: from + BLOCK });
      }
      if (i < SIDE) {
        roads.push({ axis: 'x', at: at + ROAD / 6, from: from, to: from + BLOCK });
        roads.push({ axis: 'x', at: at - ROAD / 4, from: from, to: from + BLOCK });
      }
    }
  }
  // Paint dashed centre lines.
  const dashMat = lineMat;
  const dashGeo = new THREE.BoxGeometry(4, 0.06, 2);
  for (let i = 0; i < SIDE; i += 1) {
    const at = -HALF + i * BLOCK + BLOCK / 2;
    for (const axis of ['x', 'z']) {
      for (let d = -HALF + 6; d < HALF - 6; d += 9) {
        const dash = new THREE.Mesh(dashGeo, dashMat);
        if (axis === 'x') {
          dash.scale.set(1, 1, 1.6);
          dash.position.set(d, 0.34, at);
        } else {
          dash.position.set(at, 0.34, d);
        }
        dash.rotation.y = axis === 'x' ? 0 : Math.PI / 2;
        scene.add(dash);
      }
    }
  }
  // Crosswalks at a few corners.
  for (const [ix, iz] of [[1, 1], [3, 2], [5, 6], [2, 5], [6, 3]]) {
    const cz = -HALF + iz * BLOCK;
    for (let d = -5; d <= 5; d += 1.1) {
      const stripe = box(ROAD, 0.07, 0.9, whiteMat);
      stripe.position.set(-HALF + ix * BLOCK, 0.34, cz + d);
      scene.add(stripe);
    }
  }

  // Street furniture and palm trees along boulevards.
  for (let i = 0; i < SIDE; i += 1) {
    for (let j = 0; j <= 1; j += 1) {
      const at = -HALF + (i + 0.5) * BLOCK;
      const lightA = streetLamp();
      lightA.position.set(at, 0, -HALF + j * BLOCK + BLOCK / 2 + 12);
      scene.add(lightA);
      lights.push({ x: at, z: -HALF + j * BLOCK + BLOCK / 2 + 12 });
      const lightB = streetLamp();
      lightB.position.set(at, 0, -HALF + j * BLOCK - 12);
      scene.add(lightB);
      lights.push({ x: at, z: -HALF + j * BLOCK - 12 });
    }
  }
  for (const corner of [[0, 0], [SIDE, 0], [SIDE, SIDE], [0, SIDE], [2, 2], [6, 5], [1, 6]]) {
    const tl = trafficLight();
    tl.position.set(-HALF + corner[0] * BLOCK + (corner[0] === 0 ? -2 : 2), 0, -HALF + corner[1] * BLOCK + (corner[1] === 0 ? -2 : 2));
    tl.rotation.y = Math.PI / 4;
    scene.add(tl);
  }
  for (let i = 0; i < 18; i += 1) {
    const b = bench();
    b.position.set((random() - 0.5) * (SIDE * BLOCK - 60), 0, (random() - 0.5) * (SIDE * BLOCK - 60));
    b.rotation.y = random() * Math.PI;
    scene.add(b);
  }
  for (let i = 0; i < 10; i += 1) {
    const h = hydrant();
    h.position.set((random() - 0.5) * (SIDE * BLOCK - 40), 0, (random() - 0.5) * (SIDE * BLOCK - 40));
    scene.add(h);
  }

  // Palms and grass: the coastal signature. Palms have a curved trunk and tapered fronds.
  const palmPositions = [];
  for (let i = 0; i < 34; i += 1) {
    const px = (random() - 0.5) * (SIDE * BLOCK - 20);
    const pz = (random() - 0.5) * (SIDE * BLOCK - 20);
    if (isRoadAt(px, pz)) continue;
    const palm = makePalm(random, 1);
    palm.position.set(px, 0, pz);
    scene.add(palm);
    palmPositions.push({ x: px, z: pz });
  }
  // Fan palms along the beach line.
  for (let i = 0; i < 12; i += 1) {
    const px = -HALF + ((i + 0.5) / 12) * (SIDE * BLOCK) - 20 + random() * 16;
    const pz = -HALF - 24 - random() * 12;
    const palm = makePalm(random, 1.35);
    palm.position.set(px, 0.2, pz);
    scene.add(palm);
    palmPositions.push({ x: px, z: pz });
  }
  // Grass tufts and bushes scattered on the boulevards and beach edge.
  for (let i = 0; i < 90; i += 1) {
    const gx = (random() - 0.5) * (SIDE * BLOCK - 10);
    const gz = (random() - 0.5) * (SIDE * BLOCK - 10);
    if (isRoadAt(gx, gz)) continue;
    const tuft = makeGrass(random);
    tuft.position.set(gx, 0, gz);
    scene.add(tuft);
  }
  for (let i = 0; i < 26; i += 1) {
    const bush = makeBush(random);
    bush.position.set((random() - 0.5) * (SIDE * BLOCK - 60), 0.1, (random() - 0.5) * (SIDE * BLOCK - 60));
    scene.add(bush);
  }
  // Beach grass.
  for (let i = 0; i < 70; i += 1) {
    const g = makeGrass(random);
    g.position.set(-HALF + random() * (SIDE * BLOCK), 0.1, -HALF - 12 - random() * 70);
    scene.add(g);
  }

  // Build the drivable side segments (the drivable path grid).
  const segAxis = [];
  for (let i = 0; i < SIDE; i += 1) {
    const z = -HALF + i * BLOCK + BLOCK / 2;
    segAxis.push({ axis: 'x', at: z, from: -HALF, to: HALF, minX: -HALF - ROAD / 2, maxX: HALF + ROAD / 2 });
  }
  for (let i = 0; i < SIDE; i += 1) {
    const x = -HALF + i * BLOCK + BLOCK / 2;
    segAxis.push({ axis: 'z', at: x, from: -HALF, to: HALF, minZ: -HALF - ROAD / 2, maxZ: HALF + ROAD / 2 });
  }

  // A static car spawn is used later by the car module; keep the city focused on world builds.

  // Define a few generic path nodes at the centres of blocks (enough for traffic A*).
  for (let i = 0; i < SIDE; i += 1) {
    for (let j = 0; j < SIDE; j += 1) {
      const x = -HALF + (i + 0.5) * BLOCK - ROAD * 0.25;
      const z = -HALF + (j + 0.5) * BLOCK - ROAD * 0.25;
      pathNodes.push({ x, z });
    }
  }

  scene.palms = palmPositions;
  return {
    scene,
    colliders,
    roads,
    lights,
    pathNodes,
    props,
    palmPositions,
    coordHalf: HALF,
    groundLevel: 0,
    isRoadAt,
    nearestRoad(x, z) {
      let best = Infinity;
      let axis = 'x';
      for (const seg of segAxis) {
        if (seg.axis === 'x') {
          if (x >= seg.from - 6 && x <= seg.to + 6) {
            const d = Math.abs(z - seg.at);
            if (d < best) { best = d; axis = 'x'; }
          }
        } else if (z >= seg.from - 6 && z <= seg.to + 6) {
          const d = Math.abs(x - seg.at);
          if (d < best) { best = d; axis = 'z'; }
        }
      }
      return { distance: best, axis };
    },
    collides(x, z, r) {
      for (const b of colliders) {
        if (x + r > b.minX && x - r < b.maxX && z + r > b.minZ && z - r < b.maxZ) return true;
      }
      return false;
    },
    // Resolve a circle (car/character) out of building footprints; returns a new position and
    // whether it touched a building. Used by traffic and police so vehicles never clip walls.
    resolveCircle(x, z, r) {
      let hit = false;
      for (const b of colliders) {
        const cx = Math.max(b.minX, Math.min(x, b.maxX));
        const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
        const dx = x - cx;
        const dz = z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= r * r || d2 === 0) continue;
        const d = Math.sqrt(d2);
        const push = (r - d);
        if (d > 0.0001) {
          x += (dx / d) * push;
          z += (dz / d) * push;
        } else {
          // Centre is inside a building: push out along the smaller penetration axis.
          const left = x - b.minX;
          const right = b.maxX - x;
          const top = z - b.minZ;
          const bottom = b.maxZ - z;
          const m = Math.min(left, right, top, bottom);
          if (m === left) x = b.minX - r;
          else if (m === right) x = b.maxX + r;
          else if (m === top) z = b.minZ - r;
          else z = b.maxZ + r;
        }
        hit = true;
      }
      return { x, z, hit };
    },
    // The centre line of the i-th road along a given axis (same convention as traffic lanes).
    roadCentre(i) {
      return -HALF + i * BLOCK;
    },
    nearestRoadY(x, z) {
      let best = Infinity;
      let axis = 'x';
      for (const seg of segAxis) {
        if (seg.axis === 'x') {
          if (x >= seg.from - 6 && x <= seg.to + 6) {
            const d = Math.abs(z - seg.at);
            if (d < best) { best = d; axis = 'x'; }
          }
        } else if (z >= seg.from - 6 && z <= seg.to + 6) {
          const d = Math.abs(x - seg.at);
          if (d < best) { best = d; axis = 'z'; }
        }
      }
      return { distance: best, axis };
    },
  };
}

// Detailed palms, grass and bushes -----------------------------------------------------------

const trunkMat = new THREE.MeshLambertMaterial({ color: 0xb4844e });
const leafMat = new THREE.MeshLambertMaterial({ color: 0x3fa843, side: THREE.DoubleSide });
const leafDarkMat = new THREE.MeshLambertMaterial({ color: 0x2f8a3c, side: THREE.DoubleSide });
const grassMat = new THREE.MeshLambertMaterial({ color: 0x98d97f });
const bushMat = new THREE.MeshLambertMaterial({ color: 0x52a05a });
const woodMat = new THREE.MeshLambertMaterial({ color: 0xcaa06a });
const metalMat = new THREE.MeshLambertMaterial({ color: 0x9aa6b0 });
const roofMat = new THREE.MeshLambertMaterial({ color: 0x8d9398 });
const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff6d0 });

function makePalm(random, scale) {
  const g = new THREE.Group();
  const trunk = new THREE.Group();
  const segH = 1.6 * scale;
  const segR = 0.5 * scale;
  let px = 0;
  let py = 0;
  let pz = 0;
  for (let s = 0; s < 5; s += 1) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(segR * (1 - s * 0.15), segR * (1.06 - s * 0.15), segH, 8), trunkMat);
    seg.position.set(px, py + segH / 2, pz);
    trunk.add(seg);
    // bend each segment a little: the trunk leans
    px += 0.55 * scale;
    pz -= 0.28 * scale;
    py += segH * 0.98;
  }
  trunk.position.y = 0.1;
  trunk.rotation.z = 0.28 * scale;
  g.add(trunk);
  // Crown with fronds: flat tapered leaves fanning out and dropping.
  const fronds = 8;
  for (let f = 0; f < fronds; f += 1) {
    const frond = makeFrond(4.6 * scale, 0.8 * scale, f % 2 ? leafMat : leafDarkMat);
    frond.position.set(px, 5.6 * scale, pz);
    frond.rotation.y = (f / fronds) * Math.PI * 2 + random() * 0.4;
    frond.rotation.x = 0.5 * scale + random() * 0.2;
    g.add(frond);
  }
  const mid = new THREE.Mesh(new THREE.SphereGeometry(0.6 * scale, 8, 6), trunkMat);
  mid.position.set(px, 5.4 * scale, pz);
  g.add(mid);
  // Falling coconuts.
  for (let c = 0; c < 2; c += 1) {
    const nut = new THREE.Mesh(new THREE.SphereGeometry(0.28 * scale, 6, 6), new THREE.MeshLambertMaterial({ color: 0x7a5a34 }));
    nut.position.set(px + (random() - 0.5) * scale, 5.2 * scale, pz + (random() - 0.5) * scale);
    g.add(nut);
  }
  return g;
}

function makeFrond(len, width, mat) {
  // A tapered flat leaf: a flattened cone bent in the middle, plus a few leaflets.
  const g = new THREE.Group();
  const geo = new THREE.ConeGeometry(width, len, 6);
  const blade = new THREE.Mesh(geo, mat);
  blade.position.y = len / 2;
  blade.scale.z = 0.12;
  blade.rotation.x = Math.PI / 2;
  g.add(blade);
  return g;
}

function makeGrass(random) {
  const g = new THREE.Group();
  const n = 4 + Math.floor(random() * 5);
  for (let i = 0; i < n; i += 1) {
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.7 + random() * 0.7, 4), grassMat);
    blade.position.set((random() - 0.5) * 0.9, 0.35, (random() - 0.5) * 0.9);
    blade.rotation.set((random() - 0.5) * 0.4, random() * Math.PI, (random() - 0.5) * 0.4);
    g.add(blade);
  }
  return g;
}

function makeBush(random) {
  const g = new THREE.Group();
  const n = 2 + Math.floor(random() * 3);
  for (let i = 0; i < n; i += 1) {
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.9 + random() * 0.6, 8, 6), bushMat);
    sphere.position.set((random() - 0.5) * 1.6, 0.7, (random() - 0.5) * 1.6);
    sphere.scale.y = 0.75;
    g.add(sphere);
  }
  return g;
}