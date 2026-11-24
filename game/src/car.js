// Multi-part vehicle models: body shell, hood/trunk slope panels, cabin glass, four wheels
// (tire + rim), lights, mirrors and, on performance cars, a spoiler. Each type has distinct
// dimensions, colours and handling. The createCar() factory returns both the visual mesh and the
// driving state object, which the player and the traffic/police AI share.
import { CAR } from './config.js';
import { css, clamp, damp } from './util.js';

const sharedGeo = new Map();

function box(w, h, d, mat, sx, sy, sz) {
  const key = `${w}|${h}|${d}`;
  let geo = sharedGeo.get(key);
  if (!geo) {
    geo = new THREE.BoxGeometry(w, h, d, sx ?? 1, sy ?? 1, sz ?? 1);
    sharedGeo.set(key, geo);
  }
  return new THREE.Mesh(geo, mat);
}

function wheelGeometry() {
  // Tire (dark cylinder) and rim (bright shallow cylinder) merged in a group.
  const g = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.4, 14), wheelTireMat);
  tire.rotation.z = Math.PI / 2;
  g.add(tire);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.42, 8), wheelRimMat);
  rim.rotation.z = Math.PI / 2;
  g.add(rim);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.44, 6), rustMat);
  hub.rotation.z = Math.PI / 2;
  g.add(hub);
  return g;
}

const bodyMats = {
  metal: new THREE.MeshLambertMaterial(),
  glass: new THREE.MeshLambertMaterial({ color: 0xbfe4f2, emissive: 0x09131c, transparent: true, opacity: 0.92 }),
  dark: new THREE.MeshLambertMaterial({ color: 0x22262c }),
  chrome: new THREE.MeshLambertMaterial({ color: 0xc9d2da, emissive: 0x333c44 }),
  black: new THREE.MeshLambertMaterial({ color: 0x14171c }),
};
const wheelTireMat = new THREE.MeshLambertMaterial({ color: 0x1b1e23 });
const wheelRimMat = new THREE.MeshLambertMaterial({ color: 0xd7dde2 });
const rustMat = new THREE.MeshLambertMaterial({ color: 0x5a5f66 });

const TYPES = {
  sedan: { len: 4.7, w: 2.0, h: 1.45, wheelR: 0.52, body: 0x67a7e2, roof: 0x67a7e2, spoiler: false, speed: 1.0, accel: 1.0, turn: 1.0, name: 'Seabreeze Sedan' },
  taxi: { len: 4.7, w: 2.0, h: 1.55, wheelR: 0.52, body: 0xf4c542, roof: 0xf4c542, spoiler: false, speed: 0.92, accel: 0.95, turn: 1.0, name: 'Azure Cab' },
  sports: { len: 4.4, w: 2.05, h: 1.22, wheelR: 0.5, body: 0xd94f3d, roof: 0xb23a2c, spoiler: true, speed: 1.22, accel: 1.18, turn: 1.15, name: 'Solfire GT' },
  pickup: { len: 5.4, w: 2.15, h: 1.7, wheelR: 0.58, body: 0x4fae6b, roof: 0x3f9a5b, spoiler: false, speed: 0.9, accel: 0.9, turn: 0.92, name: 'Marlin Pickup' },
  police: { len: 4.9, w: 2.05, h: 1.55, wheelR: 0.52, body: 0xeef4f8, roof: 0x1d3f66, spoiler: false, speed: 1.12, accel: 1.1, turn: 1.05, name: 'Cove PD Cruiser' },
  van: { len: 5.6, w: 2.2, h: 2.2, wheelR: 0.56, body: 0x8a97a6, roof: 0x7a8694, spoiler: false, speed: 0.82, accel: 0.8, turn: 0.85, name: 'Cargo Van' },
};

export const CAR_TYPES = Object.keys(TYPES);

function buildCarMesh(type, colorHex) {
  const spec = TYPES[type];
  const g = new THREE.Group();
  const color = colorHex ?? spec.body;
  const paint = new THREE.MeshLambertMaterial({ color });
  const dark = bodyMats.dark;
  const chrome = bodyMats.chrome;
  const glass = bodyMats.glass;

  const L = spec.len;
  const W = spec.w;
  const H = spec.h;
  const bodyLen = L * 0.62;
  const bodyH = H * 0.52;
  // Main body shell.
  const shell = box(bodyLen, bodyH, W, paint, 2, 1, 2);
  shell.position.y = H * 0.42 + 0.14;
  shell.castShadow = true;
  shell.receiveShadow = true;
  g.add(shell);

  // Sloped hood and trunk: thin wedges via scaled boxes.
  const hood = box(L * 0.26, H * 0.14, W * 0.96, paint, 2, 1, 2);
  hood.position.set(L * 0.4, H * 0.22, 0);
  hood.rotation.x = -0.14;
  g.add(hood);
  const trunk = box(L * 0.24, H * 0.16, W * 0.96, paint, 2, 1, 2);
  trunk.position.set(-L * 0.42, H * 0.24, 0);
  trunk.rotation.x = 0.1;
  g.add(trunk);

  // Cabin: glass box with darker roof panel.
  const cabin = box(L * 0.42, H * 0.42, W * 0.88, glass, 2, 1, 2);
  cabin.position.set(L * 0.02, H * 0.66, 0);
  cabin.castShadow = true;
  g.add(cabin);
  const roof = box(L * 0.42, H * 0.08, W * 0.9, dark, 2, 1, 2);
  roof.position.set(L * 0.02, H * 0.92, 0);
  g.add(roof);

  // Bumpers.
  const bumperF = box(L * 0.06, H * 0.18, W * 1.02, dark, 2, 1, 2);
  bumperF.position.set(L * 0.545, H * 0.16, 0);
  g.add(bumperF);
  const bumperR = box(L * 0.06, H * 0.18, W * 1.02, dark, 2, 1, 2);
  bumperR.position.set(-L * 0.55, H * 0.16, 0);
  g.add(bumperR);

  // Headlights and taillights.
  const headL = box(0.06, 0.22, 0.42, new THREE.MeshBasicMaterial({ color: 0xfff8d8 }));
  headL.position.set(L * 0.57, H * 0.34, W * 0.3);
  g.add(headL);
  const headR = headL.clone();
  headR.position.z = -W * 0.3;
  g.add(headR);
  const tailL = box(0.06, 0.22, 0.4, new THREE.MeshBasicMaterial({ color: 0xff4030 }));
  tailL.position.set(-L * 0.57, H * 0.36, W * 0.3);
  g.add(tailL);
  const tailR = tailL.clone();
  tailR.position.z = -W * 0.3;
  g.add(tailR);

  // Side mirrors.
  for (const side of [-1, 1]) {
    const mirror = new THREE.Group();
    const arm = box(0.2, 0.08, 0.08, chrome);
    arm.position.set(0.02, 0, side * W * 0.55);
    mirror.add(arm);
    const head = box(0.12, 0.16, 0.32, paint, 2, 2, 2);
    head.position.set(0.16, 0.2, side * W * 0.62);
    mirror.add(head);
    mirror.position.set(L * 0.1, H * 0.72, 0);
    g.add(mirror);
  }

  // Wheels.
  const wheels = [];
  const wx = [L * 0.32, -L * 0.32];
  const wz = [W * 0.46, -W * 0.46];
  for (const x of wx) {
    for (const z of wz) {
      const wheel = wheelGeometry();
      wheel.position.set(x, spec.wheelR, z);
      wheel.castShadow = true;
      g.add(wheel);
      wheels.push(wheel);
    }
  }

  // Performance spoiler.
  if (spec.spoiler) {
    const wing = box(L * 0.28, 0.08, W * 1.02, dark);
    wing.position.set(-L * 0.46, H * 0.92, 0);
    g.add(wing);
    for (const side of [-1, 1]) {
      const st = box(0.08, 0.3, 0.18, dark);
      st.position.set(-L * 0.52, H * 0.7, side * W * 0.36);
      g.add(st);
    }
  }

  // Police livery: light bar and door shields.
  if (type === 'police') {
    const bar = box(L * 0.3, 0.16, W * 0.5, new THREE.MeshLambertMaterial({ color: 0x1a2530 }));
    bar.position.set(L * 0.1, H * 1.02, 0);
    g.add(bar);
    const lightL = box(0.12, 0.18, 0.34, new THREE.MeshBasicMaterial({ color: 0x2255ff }));
    lightL.position.set(L * 0.1, H * 1.12, W * 0.16);
    g.add(lightL);
    const lightR = box(0.12, 0.18, 0.34, new THREE.MeshBasicMaterial({ color: 0xff3344 }));
    lightR.position.set(L * 0.1, H * 1.12, -W * 0.16);
    g.add(lightR);
    const shield = box(0.9, 0.7, 0.06, new THREE.MeshLambertMaterial({ color: 0x1d3f66 }));
    shield.position.set(L * 0.12, H * 0.5, W * 0.53);
    g.add(shield);
    const shieldR = shield.clone();
    shieldR.position.z = -W * 0.53;
    g.add(shieldR);
  }

  // Taxi rooftop sign.
  if (type === 'taxi') {
    const sign = box(0.9, 0.5, 0.5, new THREE.MeshLambertMaterial({ color: 0xf7e28a }));
    sign.position.set(0, H * 1.05, 0);
    g.add(sign);
  }

  return { group: g, spec, wheels, isLightBar: type === 'police', lightLeft: null, lightRight: null };
}

export function createCar(type, colorHex) {
  const mesh = buildCarMesh(type, colorHex);
  const spec = mesh.spec;
  const state = {
    x: 0,
    z: 0,
    heading: 0,
    speed: 0,           // signed, units/second
    steer: 0,
    handbrake: false,
    mode: 'idle',       // idle | driving | parked
    currentSpeed: 0,    // blended for the speedometer
    health: CAR.maxHealth,
    type,
    name: spec.name,
  };
  return {
    group: mesh.group,
    spec,
    state,
    wheels: mesh.wheels,
    isLightBar: mesh.isLightBar,
    lightLeft: mesh.lightLeft,
    lightRight: mesh.lightRight,
    update(dt) {
      // Blend speed for the HUD and turn wheels visually.
      state.currentSpeed = damp(state.currentSpeed, Math.abs(state.speed), 8, dt);
      const spinRate = state.speed / spec.wheelR;
      for (const wheel of mesh.wheels) {
        wheel.rotation.x += spinRate * dt;
      }
      const front = mesh.wheels.filter((_, i) => i < 2);
      for (const w of front) w.rotation.y = state.steer * 0.4;
    },
    setColor(hex) {
      // Recoloring after construction is rare; a cheap repaint of the shell/hood/trunk.
      mesh.group.traverse((obj) => {
        if (obj.isMesh && obj.material && obj.material.color && obj.material.color.getHex() === spec.body) {
          obj.material = obj.material.clone();
          obj.material.color.setHex(hex);
        }
      });
    },
  };
}

export function createTrafficCar(random, playerX, playerZ) {
  const type = ['sedan', 'sedan', 'taxi', 'taxi', 'sports', 'pickup', 'van'][Math.floor(random() * 7)];
  const car = createCar(type);
  return car;
}