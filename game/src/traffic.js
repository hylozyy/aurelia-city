// Ambient city life: moving traffic that follows straight road lanes and pedestrians that wander
// sidewalks and cross streets. Traffic vehicles are pooled cars with a simple lane-following
// model; they stop for hazards and the player, giving the roads life without gameplay coupling.
import { TRAFFIC, PEDESTRIANS, CITY, CAR } from './config.js';
import { createCar } from './car.js';
import { createCharacter } from './character.js';
import { createRandom, clamp, lerp, pick } from './util.js';

export function createTraffic(scene, city, seed) {
  const random = createRandom(seed);
  const cars = [];
  const peds = [];
  const HALF = city.coordHalf;
  const ROAD = CITY.road;
  const BLOCK = CITY.block;

  // Lanes: each is a straight axis-aligned strip at a fixed road centre.
  const lanes = [];
  for (let i = 0; i < CITY.side; i += 1) {
    const centre = -HALF + i * BLOCK + BLOCK / 2;
    lanes.push({ axis: 'x', at: centre - ROAD * 0.18, dir: 1 });
    lanes.push({ axis: 'x', at: centre + ROAD * 0.18, dir: -1 });
    lanes.push({ axis: 'z', at: centre - ROAD * 0.18, dir: 1 });
    lanes.push({ axis: 'z', at: centre + ROAD * 0.18, dir: -1 });
  }

  const trafficTypes = ['sedan', 'taxi', 'sedan', 'sports', 'pickup', 'van'];
  for (let i = 0; i < TRAFFIC.count; i += 1) {
    const type = pick(random, trafficTypes);
    const car = createCar(type);
    const lane = lanes[Math.floor(random() * lanes.length)];
    const along = -HALF + random() * HALF * 2;
    car.state.x = lane.axis === 'x' ? along : lane.at;
    car.state.z = lane.axis === 'x' ? lane.at : along;
    car.state.heading = lane.axis === 'x' ? (lane.dir > 0 ? 0 : Math.PI) : (lane.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    car.state.speed = TRAFFIC.minSpeed + random() * (TRAFFIC.maxSpeed - TRAFFIC.minSpeed);
    car.state.mode = 'traffic';
    car.lane = lane;
    car.userData = { id: i };
    car.group.position.set(car.state.x, 0, car.state.z);
    car.group.rotation.y = car.state.heading;
    scene.add(car.group);
    cars.push(car);
  }

  // Pedestrians.
  const shirtColors = [0xe98a6b, 0x72c7e8, 0x8fd98a, 0xf2c542, 0xd47bd0, 0xf4f4f0];
  for (let i = 0; i < PEDESTRIANS.count; i += 1) {
    const guy = createCharacter({ shirt: pick(random, shirtColors), pants: pick(random, [0x2d3a4f, 0x4a3f2d, 0x59404a]), hair: pick(random, [0x2b241f, 0x6b4a2a, 0xd8c07a]) });
    const x = -HALF + random() * HALF * 2;
    const z = -HALF + random() * HALF * 2;
    // Avoid spawning inside a building.
    const pos = city.resolveCircle(x, z, 0.8);
    guy.group.position.set(pos.x, 0, pos.z);
    guy.group.rotation.y = random() * Math.PI * 2;
    scene.add(guy.group);
    peds.push({
      mesh: guy.group,
      char: guy,
      x: pos.x,
      z: pos.z,
      tx: pos.x,
      tz: pos.z,
      speed: PEDESTRIANS.speed * (0.75 + random() * 0.5),
      wait: random() * 3,
      heading: random() * Math.PI * 2,
    });
  }

  return {
    cars,
    peds,
    update(dt, playerX, playerZ, playerCarState) {
      // Traffic movement.
      for (const car of cars) {
        const cs = car.state;
        if (cs.mode !== 'traffic') continue;
        const lane = car.lane;
        const alongAxis = lane.axis === 'x';
        let along = alongAxis ? cs.x : cs.z;
        const dir = lane.dir;

        // Cruise speed with a little per-car variation.
        let targetSpeed = TRAFFIC.minSpeed + (TRAFFIC.maxSpeed - TRAFFIC.minSpeed) * (0.5 + 0.5 * Math.sin(car.userData.id * 1.7));

        // Slow for traffic ahead in the same lane.
        for (const other of cars) {
          if (other === car || other.state.mode !== 'traffic') continue;
          const oAlong = alongAxis ? other.state.x : other.state.z;
          const oAt = alongAxis ? other.state.z : other.state.x;
          const gap = (oAlong - along) * dir;
          if (gap > 0 && gap < TRAFFIC.stopDist && Math.abs(oAt - lane.at) < 3.5) {
            targetSpeed = Math.min(targetSpeed, gap * 0.8);
          }
        }
        // Slow near the player (car or pedestrian) in front.
        const px = alongAxis ? playerX : playerZ;
        const pAt = alongAxis ? playerZ : playerX;
        const gapP = (px - along) * dir;
        if (gapP > 0 && gapP < TRAFFIC.stopLight && Math.abs(pAt - lane.at) < 3.5) {
          targetSpeed = Math.min(targetSpeed, gapP * 0.7);
        }
        cs.speed = lerp(cs.speed, targetSpeed, clamp(dt * 2.5, 0, 1));
        along += dir * cs.speed * dt * CAR.speedMul * 0.55;

        // Wrap around at city edges.
        if (along > HALF + 40) along = -HALF - 40;
        if (along < -HALF - 40) along = HALF + 40;

        if (alongAxis) cs.x = along;
        else cs.z = along;

        // Resolve out of buildings (keeps lane-followers on the road, not through corners).
        const resolved = city.resolveCircle(cs.x, cs.z, car.spec.w * 0.5);
        cs.x = resolved.x;
        cs.z = resolved.z;

        car.group.position.set(cs.x, 0, cs.z);
        car.group.rotation.y = cs.heading;
        car.update(dt);
      }

      // Pedestrian wander.
      for (const ped of peds) {
        ped.downed = Math.max(0, (ped.downed || 0) - dt);
        if (ped.downed > 0) {
          // Lay the character down briefly.
          ped.mesh.rotation.x = Math.PI / 2 * 0.85;
          ped.char.update(dt, false);
          continue;
        }
        ped.mesh.rotation.x = 0;
        ped.wait -= dt;
        if (ped.wait <= 0) {
          ped.tx = ped.x + (Math.random() - 0.5) * PEDESTRIANS.walkRadius;
          ped.tz = ped.z + (Math.random() - 0.5) * PEDESTRIANS.walkRadius;
          // Keep within the city and out of buildings.
          ped.tx = clamp(ped.tx, -HALF, HALF);
          ped.tz = clamp(ped.tz, -HALF, HALF);
          const resolved = city.resolveCircle(ped.tx, ped.tz, 0.7);
          if (!resolved.hit) {
            ped.tx = resolved.x;
            ped.tz = resolved.z;
          }
          ped.wait = 1.5 + Math.random() * 4;
        }
        const dx = ped.tx - ped.x;
        const dz = ped.tz - ped.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.6) {
          const step = ped.speed * dt;
          const nx = ped.x + (dx / d) * step;
          const nz = ped.z + (dz / d) * step;
          const resolved = city.resolveCircle(nx, nz, 0.6);
          if (!resolved.hit || d < 3) {
            ped.x = resolved.x;
            ped.z = resolved.z;
            ped.heading = Math.atan2(dx, dz);
            ped.mesh.position.set(ped.x, 0, ped.z);
            ped.mesh.rotation.y = ped.heading;
            ped.char.update(dt, true);
          } else {
            ped.char.update(dt, false);
          }
        } else {
          ped.char.update(dt, false);
        }
      }
    },
  };
}