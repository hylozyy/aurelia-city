// Simple combat: a hitscan shot from the player's gun and "run over" damage from vehicles.
// This module owns the glue between the player's weapon and the city's pedestrians/police; the
// game rules never live here, only spatial queries and effect application.
import { PLAYER, CAR } from './config.js';

export function createCombat() {
  const hitPeds = [];
  return {
    /** Called every frame after player.update: applies player shots and vehicle hits. */
    update(dt, player, traffic, wanted) {
      const peds = traffic.peds;
      const px = player.state.x;
      const pz = player.state.z;
      const aim = player.state.aim;

      // Player gunfire: hitscan against pedestrians within range and near the aim line.
      if (player.state.justFired) {
        player.state.justFired = false;
        hitPeds.length = 0;
        for (const ped of peds) {
          if (ped.downed > 0) continue;
          const dx = ped.x - px;
          const dz = ped.z - pz;
          const d = Math.hypot(dx, dz);
          if (d < 1.2 || d > PLAYER.gunRange) continue;
          const ang = Math.atan2(dx, dz);
          let diff = Math.abs(ang - aim);
          while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);
          if (diff < 0.3) {
            ped.downed = 3.5;
            wanted.addCrime(40);
            hitPeds.push(ped);
          }
        }
      }

      // Running over pedestrians with a vehicle: the player's car or any traffic car.
      if (player.state.inCar && player.state.currentCar) {
        const car = player.state.currentCar.state;
        if (Math.abs(car.speed) > 3) {
          for (const ped of peds) {
            if (ped.downed > 0) continue;
            const d = Math.hypot(ped.x - car.x, ped.z - car.z);
            if (d < 1.5) {
              ped.downed = 4.5;
              wanted.addCrime(45);
            }
          }
        }
      }

      return hitPeds;
    },

    /** Re-raise (respawn) a downed pedestrian off its mark so the city stays alive. */
    respawnPed(ped, random) {
      ped.x += (random() - 0.5) * 10;
      ped.z += (random() - 0.5) * 10;
      ped.tx = ped.x;
      ped.tz = ped.z;
    },
  };
}