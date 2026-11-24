// The player: on-foot movement with a chase camera, car entry/exit, arcade driving with drift,
// and the basic ranged weapon. The player object owns the camera controller and reports the
// "on foot / in car" state the rest of the game keys off. Entering a car is done by the caller
// (which knows every car) through `enterCar`, exiting is handled here on E/Q.
import { PLAYER, CAR, CAMERA, WORLD } from './config.js';
import { createCharacter } from './character.js';
import { clamp, damp, dampAngle } from './util.js';

export const ACT_EXIT = 128; // mirrors input.js ACT_EXIT

export function createPlayer(scene, city, input, audio) {
  const char = createCharacter({ shirt: 0xffd976, pants: 0x2d3a4f, cap: 0x2a3c66, hair: 0x1c1610 });
  const group = new THREE.Group();
  group.add(char.group);
  const marker = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.1, 0.06, 16),
    new THREE.MeshBasicMaterial({ color: 0xffd976, opacity: 0.5, transparent: true }),
  );
  marker.position.y = 0.03;
  group.add(marker);
  scene.add(group);

  const state = {
    x: 0,
    z: 8,
    heading: Math.PI,
    yaw: Math.PI,
    aim: 0,
    speed: 0,
    inCar: false,
    health: PLAYER.health,
    money: 40,
    hurtTimer: 0,
    fireTimer: 0,
    justFired: false,
    currentCar: null,
  };

  const cam = { yaw: Math.PI, pitch: CAMERA.pitchMin, dist: CAMERA.targetDistance, height: CAMERA.targetHeight };
  cam.yaw = input.yaw;
  cam.pitch = input.pitch;
  let exitTimer = 0;

  function canStand(x, z) {
    if (city.collides(x, z, PLAYER.radius)) return false;
    const b = WORLD.bounds;
    return Math.abs(x) <= b && Math.abs(z) <= b;
  }

  return {
    group,
    char,
    state,
    marker,

    enterCar(car) {
      if (state.inCar) this.exitCar();
      state.inCar = true;
      state.currentCar = car;
      car.state.mode = 'driving';
      exitTimer = 0.4; // don't let the same E press immediately exit
      audio.click();
    },

    exitCar() {
      if (!state.inCar || !state.currentCar) return;
      const cs = state.currentCar.state;
      state.inCar = false;
      state.currentCar.state.mode = 'parked';
      state.currentCar = null;
      state.x = cs.x + Math.sin(cs.heading + Math.PI) * CAR.exitOffset;
      state.z = cs.z + Math.cos(cs.heading + Math.PI) * CAR.exitOffset;
      state.heading = cs.heading;
      exitTimer = 0.5;
    },

    update(dt, actions, wanted) {
      state.hurtTimer = Math.max(0, state.hurtTimer - dt);
      state.fireTimer = Math.max(0, state.fireTimer - dt);
      exitTimer = Math.max(0, exitTimer - dt);

      if (state.inCar && state.currentCar) {
        const car = state.currentCar;
        const cs = car.state;
        const throttle = input.moveZ();
        const steering = input.moveX();
        const handbrake = input.handbrake();
        cs.steer = steering;

        if (throttle > 0) {
          cs.speed += CAR.accel * car.spec.accel * dt;
          cs.speed = Math.min(cs.speed, CAR.target * car.spec.speed);
        } else if (throttle < 0) {
          cs.speed -= CAR.brake * dt;
          cs.speed = Math.max(cs.speed, -CAR.maxReverse);
        } else {
          cs.speed = damp(cs.speed, 0, 2.0, dt);
        }

        const speedMag = Math.abs(cs.speed);
        const turnRate = handbrake ? CAR.driftTurnRate : CAR.turnRate * (0.42 + 0.58 / (1 + speedMag * 0.06));
        if (steering !== 0 && speedMag > 0.7) {
          cs.heading += steering * turnRate * dt * Math.sign(cs.speed || 1) * car.spec.turn;
        }
        // Handbrake slides the car and scrubs speed.
        if (handbrake && speedMag > CAR.handbrakeStop) {
          cs.speed -= cs.speed * CAR.driftFriction * 0.55 * dt;
          cs.speed += steering * 0.6 * dt; // a little pendulum
        }

        cs.x += Math.sin(cs.heading) * cs.speed * CAR.speedMul * dt;
        cs.z += Math.cos(cs.heading) * cs.speed * CAR.speedMul * dt;

        // World bounds.
        const b = WORLD.bounds;
        if (Math.abs(cs.x) > b || Math.abs(cs.z) > b) {
          cs.x = clamp(cs.x, -b, b);
          cs.z = clamp(cs.z, -b, b);
          cs.speed *= 0.6;
        }

        // Building collisions: car radius = half its width.
        const radius = car.spec.w * 0.5;
        for (const box of city.colliders) {
          const inX = cs.x > box.minX && cs.x < box.maxX;
          const inZ = cs.z > box.minZ && cs.z < box.maxZ;
          if (inX && !inZ) {
            const push = cs.z < box.minZ ? box.minZ - cs.z - radius : box.maxZ - cs.z + radius;
            if (Math.abs(cs.z - (cs.z < box.minZ ? box.minZ : box.maxZ)) < radius) {
              cs.z += push;
              cs.speed *= 0.7;
            }
          } else if (inZ && !inX) {
            const push = cs.x < box.minX ? box.minX - cs.x - radius : box.maxX - cs.x + radius;
            if (Math.abs(cs.x - (cs.x < box.minX ? box.minX : box.maxX)) < radius) {
              cs.x += push;
              cs.speed *= 0.7;
            }
          }
        }

        car.group.position.set(cs.x, 0, cs.z);
        car.group.rotation.y = cs.heading;
        if (audio) audio.setEngine(true, clamp(speedMag / CAR.target, 0, 1));
        state.x = cs.x;
        state.z = cs.z;

        if (exitTimer <= 0 && (actions & ACT_EXIT || actions & 2)) {
          this.exitCar();
        }
        return;
      }

      // On foot.
      const run = input.running() ? PLAYER.runSpeed : PLAYER.walkSpeed;
      const mx = input.moveX();
      const mz = input.moveZ();
      const speed = Math.min(1, Math.hypot(mx, mz)) * run;
      let desired = state.heading;
      if (mx !== 0 || mz !== 0) desired = Math.atan2(mx, mz);
      state.heading = dampAngle(state.heading, desired, 12, dt);
      const nx = state.x + Math.sin(state.heading) * speed * dt;
      const nz = state.z + Math.cos(state.heading) * speed * dt;
      if (canStand(nx, nz)) {
        state.x = nx;
        state.z = nz;
        state.speed = speed;
      } else {
        state.speed = 0;
      }

      state.yaw = cam.yaw + Math.PI;
      group.position.set(state.x, 0, state.z);
      group.rotation.y = cam.yaw + Math.PI;
      char.update(dt, speed > 0.4);
      if (audio) audio.setEngine(false, 0);

      if (state.fireTimer <= 0 && input.firing()) {
        state.fireTimer = PLAYER.gunCooldown;
        this.shoot(wanted);
      }
    },

    shoot(wanted) {
      if (state.fireTimer > 0) return false;
      audio.shoot();
      state.fireTimer = PLAYER.gunCooldown;
      state.justFired = true;
      wanted.reportShot(state.x, state.z);
      return true;
    },

    // Camera follow. In-car the camera looks over the hood; on foot it orbits the player.
    applyCamera(camera, dt) {
      const target = state.inCar && state.currentCar
        ? { x: state.currentCar.state.x, z: state.currentCar.state.z }
        : { x: state.x, z: state.z };
      const desiredDist = state.inCar ? CAMERA.targetDistanceCar : CAMERA.targetDistance;
      const desiredH = state.inCar ? CAMERA.targetHeightCar : CAMERA.targetHeight;
      cam.dist = damp(cam.dist, desiredDist, 4, dt);
      cam.height = damp(cam.height, desiredH, 4, dt);

      const baseYaw = input.yaw;
      const targetYaw = baseYaw;
      cam.yaw = dampAngle(cam.yaw, targetYaw, 10, dt);
      const targetPitch = state.inCar ? input.pitch : clamp(input.pitch, CAMERA.pitchMin, CAMERA.pitchMax);
      cam.pitch = damp(cam.pitch, targetPitch, 6, dt);

      const sin = Math.sin(cam.yaw);
      const cos = Math.cos(cam.yaw);
      camera.position.lerp(
        new THREE.Vector3(target.x - sin * cam.dist, cam.height, target.z - cos * cam.dist),
        1 - Math.exp(-9 * dt),
      );
      camera.lookAt(
        new THREE.Vector3(target.x + sin * CAMERA.lookAhead, 1.7 + cam.dist * 0.16, target.z + cos * CAMERA.lookAhead),
      );
      state.aim = Math.atan2(sin, cos);
    },
  };
}

export function nearestCar(cars, x, z, maxDist) {
  let best = null;
  let bestD = maxDist ?? Infinity;
  for (const car of cars) {
    const d = Math.hypot(x - car.state.x, z - car.state.z);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best ? { car: best, distance: bestD } : null;
}