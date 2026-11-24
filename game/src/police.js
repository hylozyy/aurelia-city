// The Cove PD: police cruisers spawn at the city edge when the player is wanted, chase, ram,
// box in, and arrest on foot when the player's car stops. Siren lights flash and the audio
// siren runs while any unit is active.
import { POLICE, CITY } from './config.js';
import { createCar } from './car.js';
import { clamp, damp, dampAngle } from './util.js';

export function createPolice(scene, city, audio) {
  const units = [];

  function createUnit(x, z) {
    const car = createCar('police');
    const unit = {
      car,
      state: car.state,
      group: car.group,
      sirenPhase: Math.random() * Math.PI * 2,
    };
    unit.state.x = x;
    unit.state.z = z;
    unit.state.heading = Math.atan2(0 - x, 0 - z);
    unit.state.speed = POLICE.cruiseSpeed;
    unit.state.mode = 'police';
    unit.group.position.set(x, 0, z);
    unit.group.rotation.y = unit.state.heading;
    scene.add(unit.group);
    units.push(unit);
    return unit;
  }

  // Find a spawn point on a road near the player, not inside a building.
  function spawnPoint(px, pz) {
    for (let i = 0; i < 24; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const x = clamp(px + Math.sin(angle) * POLICE.spawnDist, -city.coordHalf - 60, city.coordHalf + 60);
      const z = clamp(pz + Math.cos(angle) * POLICE.spawnDist, -city.coordHalf - 60, city.coordHalf + 60);
      const resolved = city.resolveCircle(x, z, 1.2);
      if (!resolved.hit) return resolved;
    }
    return { x: px + POLICE.spawnDist, z: pz + POLICE.spawnDist, hit: false };
  }

  return {
    units,
    update(dt, player, wanted, time) {
      const active = wanted.stars > 0;
      const budget = Math.min(POLICE.maxCops, wanted.stars * 2 + 1);

      // Spawn up to the wanted level's cap.
      if (active && units.length < budget) {
        const p = spawnPoint(player.state.x, player.state.z);
        createUnit(p.x, p.z);
      } else if (!active && units.length > 0) {
        // Peel off units once the heat is gone.
        while (units.length > 0) {
          const u = units.pop();
          scene.remove(u.group);
        }
      }

      if (units.length === 0) {
        audio.setSiren(false);
        return;
      }

      const inCar = player.state.inCar;
      const px = player.state.currentCar ? player.state.currentCar.state.x : player.state.x;
      const pz = player.state.currentCar ? player.state.currentCar.state.z : player.state.z;
      const playerSpeed = player.state.currentCar ? Math.abs(player.state.currentCar.state.speed) : 0;

      for (const unit of units) {
        const cs = unit.state;
        const toP = { x: px - cs.x, z: pz - cs.z };
        const d = Math.hypot(toP.x, toP.z);
        const targetSpeed = inCar ? POLICE.ramSpeed : POLICE.cruiseSpeed;

        // Aim at the player; circle a little when very close to avoid overshooting.
        let desiredHeading = Math.atan2(toP.x, toP.z);
        if (d < POLICE.ramDistance) desiredHeading = Math.atan2(-toP.x, -toP.z);
        cs.heading = dampAngle(cs.heading, desiredHeading, 4, dt);
        cs.speed = damp(cs.speed, targetSpeed, 2.6, dt);

        // Busted: a cop car alongside the stopped player car.
        if (inCar && d < POLICE.catchRange && playerSpeed < POLICE.catchSpeed) {
          cs.speed = damp(cs.speed, POLICE.catchSpeed, 4, dt);
          wanted.busted();
        }

        cs.x += Math.sin(cs.heading) * cs.speed * dt * 0.62;
        cs.z += Math.cos(cs.heading) * cs.speed * dt * 0.62;

        // Keep patrol cars on the street.
        const resolved = city.resolveCircle(cs.x, cs.z, unit.car.spec.w * 0.5);
        cs.x = resolved.x;
        cs.z = resolved.z;

        unit.group.position.set(cs.x, 0, cs.z);
        unit.group.rotation.y = cs.heading;
        unit.car.update(dt);

        // Flashing light bar.
        unit.sirenPhase += dt * 14;
        unit.group.traverse((obj) => {
          if (obj.isMesh && obj.material && obj.material.emissive) {
            obj.material.emissiveIntensity = 0.4 + 0.6 * ((Math.sin(unit.sirenPhase) + 1) / 2);
          }
        });
      }

      audio.setSiren(active);
    },
  };
}