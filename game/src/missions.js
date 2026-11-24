// A short three-act story: steal a car and lose the heat, run a parcel to the boardwalk, then
// a final drop that summons police and must be escaped. Missions are intentionally light so the
// open world stays the star; they exist to give the player a thread to pull and a reward curve.
import { MISSIONS, CITY } from './config.js';

const P_DROP = { x: 420, z: -660 };    // boardwalk pier, mission 2
const N_DROP = { x: -330, z: -240 };   // northern surf shop, mission 3

export function createMissions() {
  const state = {
    index: 0,
    mission: null,
    phase: 'intro',     // intro -> steal -> cool -> deliver -> escape -> done
    marker: { active: false, x: 0, z: 0, type: 'car' },
    timer: 0,
    complete: false,
    startedCar: false,
  };

  function current() {
    return MISSIONS[state.index] ?? MISSIONS[MISSIONS.length - 1];
  }

  function start(index) {
    state.index = index;
    state.mission = current();
    state.phase = 'intro';
    state.timer = 0;
    state.complete = false;
    state.startedCar = false;
    const m = state.mission;
    if (m.id === 'm1') {
      state.marker = { active: true, x: 118, z: 118, type: 'car' };
      state.phase = 'steal';
    } else if (m.id === 'm2') {
      state.marker = { active: true, x: P_DROP.x, z: P_DROP.z, type: 'drop' };
      state.phase = 'deliver';
    } else {
      state.marker = { active: true, x: N_DROP.x, z: N_DROP.z, type: 'drop' };
      state.phase = 'deliver';
    }
    return m;
  }

  function distanceToMarker(pos) {
    if (!state.marker.active) return Infinity;
    return Math.hypot(pos.x - state.marker.x, pos.z - state.marker.z);
  }

  function update(dt, player, wanted) {
    state.timer += dt;
    const m = state.mission || current();
    const pos = player.state.currentCar ? player.state.currentCar.state : player.state;

    if (m.id === 'm1') {
      // Steal any car (they marked the first one).
      if (state.phase === 'steal') {
        if (player.state.inCar) {
          state.startedCar = true;
          state.phase = 'cool';
          state.marker = { active: false, x: 0, z: 0, type: 'none' };
          wanted.addCrime(WANTED_CRIME); // m1 theft raises 1 star
          return { message: 'Nice wheels. Lose the heat before you drop it.', mark: 'cool' };
        }
        return null;
      }
      if (state.phase === 'cool') {
        if (wanted.stars === 0) {
          state.complete = true;
          state.phase = 'done';
          player.state.money += 220;
          return { message: 'Motel run done. +$220. Watch for the Riptide job next.', done: true };
        }
        return { message: wanted.stars > 1 ? 'Shake the sirens!' : 'One star — break line of sight.', mark: 'cool' };
      }
      return null;
    }

    if (m.id === 'm2') {
      if (state.phase === 'deliver') {
        if (distanceToMarker(pos) < 8) {
          state.marker.active = false;
          state.complete = true;
          state.phase = 'done';
          player.state.money += 350;
          return { message: 'Parcel dropped at the boardwalk. +$350.', done: true };
        }
      }
      return null;
    }

    if (m.id === 'm3') {
      if (state.phase === 'deliver') {
        if (distanceToMarker(pos) < 8) {
          state.marker.active = false;
          state.phase = 'escape';
          wanted.addCrime(WANTED_CRIME * 2);
          return { message: 'Drop made. Cops are on you — lose every star to finish.', mark: 'escape' };
        }
        return null;
      }
      if (state.phase === 'escape') {
        if (wanted.stars === 0) {
          state.complete = true;
          state.phase = 'done';
          player.state.money += 800;
          return { message: 'Clean getaway. +$800. Azure Cove is yours.', done: true };
        }
        return { message: `${wanted.stars} star${wanted.stars > 1 ? 's' : ''} — keep moving.`, mark: 'escape' };
      }
      return null;
    }
    return null;
  }

  const WANTED_CRIME = 90;
  start(0);
  return { state, current, start, update };
}