// Keyboard and mouse state. Held keys form a movement vector; one-shot presses are queued as
// bit flags so no press between frames is lost. Mouse movement drives the third-person camera.
import { KEYS, CAMERA } from './config.js';

export const ACT_START = 1;
export const ACT_ENTER = 2;
export const ACT_ATTACK = 4;
export const ACT_DRIFT_DOWN = 8;
export const ACT_DRIFT_UP = 16;
export const ACT_PAUSE = 32;
export const ACT_MUTE = 64;
export const ACT_EXIT = 128;

function any(code, list) {
  for (let i = 0; i < list.length; i += 1) if (code === list[i]) return true;
  return false;
}

export function createInput() {
  const held = new Set();
  let actions = 0;
  let mouseDown = false;
  let yaw = 0;
  let pitch = 0.62;
  let locked = false;

  function onKeyDown(event) {
    if (event.repeat) {
      // Space repeats when held; treat it as already-known for movement but not a new action.
      return;
    }
    held.add(event.code);
    if (any(event.code, KEYS.ENTER_CAR)) actions |= ACT_ENTER;
    if (any(event.code, KEYS.ATTACK)) actions |= ACT_ATTACK;
    if (any(event.code, KEYS.SHOOT)) actions |= ACT_ATTACK;
    if (any(event.code, KEYS.HANDBRAKE)) actions |= ACT_DRIFT_DOWN;
    if (any(event.code, KEYS.PAUSE)) actions |= ACT_PAUSE;
    if (any(event.code, KEYS.MUTE)) actions |= ACT_MUTE;
    if (any(event.code, KEYS.START)) actions |= ACT_START;
    if (any(event.code, ['KeyQ'])) actions |= ACT_EXIT;
    event.preventDefault();
  }

  function onKeyUp(event) {
    held.delete(event.code);
    if (any(event.code, KEYS.HANDBRAKE)) actions |= ACT_DRIFT_UP;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', () => {
    held.clear();
    mouseDown = false;
  });
  document.addEventListener('pointerdown', (event) => {
    mouseDown = true;
    actions |= ACT_ATTACK;
    event.preventDefault();
  });
  document.addEventListener('pointerup', () => {
    mouseDown = false;
  });
  document.addEventListener('mousemove', (event) => {
    if (!locked) return;
    yaw -= event.movementX * CAMERA.sensitivity;
    pitch = Math.max(CAMERA.pitchMin, Math.min(CAMERA.pitchMax, pitch - event.movementY * CAMERA.sensitivity));
  });
  document.addEventListener('contextmenu', (event) => event.preventDefault());

  function setLocked(value) {
    locked = value && !(navigator.webdriver);
    if (locked && document.body.requestPointerLock) {
      try {
        const p = document.body.requestPointerLock();
        if (p && p.catch) p.catch(() => {});
      } catch {
        // Pointer lock can be refused; the camera still follows behind.
      }
    } else if (!value && document.exitPointerLock) {
      try { document.exitPointerLock(); } catch {}
    }
  }

  return {
    moveX() {
      return (held.has('KeyD') || held.has('ArrowRight') ? 1 : 0) - (held.has('KeyA') || held.has('ArrowLeft') ? 1 : 0);
    },
    moveZ() {
      return (held.has('KeyS') || held.has('ArrowDown') ? 1 : 0) - (held.has('KeyW') || held.has('ArrowUp') ? 1 : 0);
    },
    handbrake() {
      return held.has('Space');
    },
    running() {
      return held.has('ShiftLeft') || held.has('ShiftRight');
    },
    firing() {
      return mouseDown || held.has('KeyF');
    },
    get yaw() { return yaw; },
    get pitch() { return pitch; },
    setLook(y, p) {
      yaw = y;
      pitch = Math.max(CAMERA.pitchMin, Math.min(CAMERA.pitchMax, p));
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    setLocked,
    isLocked() { return locked; },
    clearMouse() { mouseDown = false; },
  };
}