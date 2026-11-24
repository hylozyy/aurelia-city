// Neon Atlantic — Azure Cove. The orchestrator: creates the engine, city, player, traffic,
// police, missions, HUD and audio, then runs the fixed-step loop and routes every event.
// A URL hash like `#play` or `#shot=driving` can skip the start screen for screenshot capture.
import { STEP, CITY, MISSIONS, PLAYER, CAR } from './config.js';
import { createEngine } from './engine.js';
import { createCity } from './city.js';
import { createPlayer, nearestCar } from './player.js';
import { createCar } from './car.js';
import { createTraffic } from './traffic.js';
import { createPolice } from './police.js';
import { createMissions } from './missions.js';
import { createHud } from './hud.js';
import { createMinimap } from './minimap.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { createWanted } from './wanted.js';
import { createCombat } from './combat.js';
import { createRandom } from './util.js';

const params = new URLSearchParams(window.location.search);
const hashMode = window.location.hash.replace('#', '');

function main() {
  const canvas = document.getElementById('game');
  const engine = createEngine(canvas);
  const scene = engine.scene;
  const city = createCity(createRandom(CITY.seed));
  scene.add(city.scene);

  const audio = createAudio();
  const input = createInput();
  const player = createPlayer(scene, city, input, audio);

  const parkedCars = [];
  const parkedSpots = [
    { x: 118, z: 118, type: 'sedan', heading: Math.PI / 4 },
    { x: -140, z: -120, type: 'sports', heading: -Math.PI / 3 },
    { x: 300, z: -260, type: 'pickup', heading: Math.PI / 2 },
    { x: -320, z: 260, type: 'taxi', heading: Math.PI },
    { x: 40, z: 320, type: 'van', heading: -Math.PI / 2 },
    { x: -60, z: -320, type: 'sedan', heading: Math.PI / 6 },
  ];
  for (const spot of parkedSpots) {
    const car = createCar(spot.type);
    car.state.x = spot.x;
    car.state.z = spot.z;
    car.state.heading = spot.heading;
    car.state.mode = 'parked';
    car.group.position.set(spot.x, 0, spot.z);
    car.group.rotation.y = spot.heading;
    scene.add(car.group);
    parkedCars.push(car);
  }

  const traffic = createTraffic(scene, city, 1332);
  const police = createPolice(scene, city, audio);
  const missions = createMissions();
  const hud = createHud();
  const minimap = createMinimap(hud.minimap, city);
  const wanted = createWanted();
  const combat = createCombat();

  const allCars = () => [...parkedCars, ...traffic.cars, ...police.units.map((u) => u.car)];

  let screen = 'title';
  let time = 0;
  let muted = false;
  let shotFrames = -1; // when >= 0, render exactly N frames then freeze for a screenshot

  const status = document.getElementById('status');
  function announce(text) { status.textContent = text; }

  function startGame() {
    screen = 'play';
    hud.hideScreen();
    input.setLocked(true);
    audio.resume();
    audio.click();
    announce('Neon Atlantic. ' + missions.state.mission.summary);
  }

  function pauseGame() {
    if (screen !== 'play') return;
    screen = 'paused';
    input.setLocked(false);
    hud.showScreen('paused', 'PAUSED');
    audio.setEngine(false, 0);
    audio.setSiren(false);
    announce('Paused.');
  }

  function resumeGame() {
    if (screen !== 'paused') return;
    screen = 'play';
    hud.hideScreen();
    input.setLocked(true);
    announce('Playing.');
  }

  function showTitle() {
    screen = 'title';
    hud.showScreen('title', 'A sun-soaked open world, ready when you are.');
    input.setLocked(false);
  }

  // Screenshot staging via URL: #play starts immediately; #shot=<scene> stages one.
  function stageShot(kind) {
    if (kind === 'driving' || kind === 'wanted') {
      const car = parkedCars[0];
      player.enterCar(car);
      car.state.speed = 16;
      if (kind === 'wanted') {
        wanted.addCrime(180);
      }
    } else if (kind === 'pedestrians') {
      player.state.x = 190;
      player.state.z = 90;
    } else if (kind === 'city') {
      player.state.x = 140;
      player.state.z = 140;
    }
    input.setLook(2.7, 0.35);
  }

  if (hashMode === 'play' || params.get('shot') || hashMode.startsWith('shot=')) {
    const shotKind = hashMode.startsWith('shot=') ? hashMode.slice(5) : params.get('shot');
    stageShot(shotKind || 'city');
    startGame();
    shotFrames = 24; // settle, then freeze and store a canvas snapshot
  } else {
    showTitle();
  }

  hud.overlay.addEventListener('start', startGame);
  hud.overlay.addEventListener('resume', resumeGame);
  hud.overlay.addEventListener('continue', () => {
    if (screen === 'won') {
      screen = 'play';
      hud.hideScreen();
      input.setLocked(true);
    } else if (screen === 'busted') {
      player.state.health = PLAYER.health;
      wanted.crime = 0;
      wanted.stars = 0;
      wanted.bustedTimer = 0;
      if (player.state.inCar) player.exitCar();
      screen = 'play';
      hud.hideScreen();
      input.setLocked(true);
      audio.click();
      announce('Back on the street.');
    }
  });

  function handleActions(actions) {
    if (actions & 64 /* ACT_MUTE */) {
      muted = !muted;
      audio.setMuted(muted);
      hud.toast(muted ? 'Sound muted' : 'Sound on');
    }
    if (actions & 32 /* ACT_PAUSE */) {
      if (screen === 'play') pauseGame();
      else if (screen === 'paused') resumeGame();
      return;
    }
    if (screen === 'title') {
      if (actions & 1 /* ACT_START */) startGame();
    } else if (screen === 'play') {
      if (actions & 2 /* ACT_ENTER */) {
        if (player.state.inCar) {
          player.exitCar();
        } else {
          const near = nearestCar(allCars(), player.state.x, player.state.z, CAR.enterRange);
          if (near) {
            player.enterCar(near.car);
            hud.toast(`Stole a ${near.car.spec.name}`);
          } else {
            hud.toast('No car nearby — walk up to one and press E.');
          }
        }
      }
    }
  }

  function nearestPoliceDist() {
    let best = Infinity;
    for (const unit of police.units) {
      const px = player.state.currentCar ? player.state.currentCar.state.x : player.state.x;
      const pz = player.state.currentCar ? player.state.currentCar.state.z : player.state.z;
      best = Math.min(best, Math.hypot(unit.state.x - px, unit.state.z - pz));
    }
    return best;
  }

  function stepLoop(dt) {
    const actions = input.takeActions();
    handleActions(actions);

    if (screen === 'play') {
      time += dt;

      player.update(dt, actions, wanted);
      combat.update(dt, player, traffic, wanted);
      traffic.update(dt, player.state.x, player.state.z, player.state.currentCar ? player.state.currentCar.state : null);
      wanted.update(dt, wanted.stars > 0 && nearestPoliceDist() < 60, nearestPoliceDist());
      police.update(dt, player, wanted, time);

      const missionResult = missions.update(dt, player, wanted);
      if (missionResult) {
        if (missionResult.message) hud.toast(missionResult.message);
        if (missionResult.done) {
          const next = missions.state.index + 1;
          if (next < MISSIONS.length) {
            missions.start(next);
            hud.toast('New job: ' + missions.state.mission.title);
          } else {
            screen = 'won';
            input.setLocked(false);
            audio.setSiren(false);
            audio.setEngine(false, 0);
            hud.showScreen('won', 'STORY COMPLETE');
          }
        }
      }

      if (wanted.bustedTimer > 0) {
        wanted.bustedTimer -= dt;
        if (wanted.bustedTimer <= 0) {
          screen = 'busted';
          input.setLocked(false);
          audio.setSiren(false);
          audio.setEngine(false, 0);
          hud.showScreen('busted', 'BUSTED');
          announce('Busted. The Cove PD caught up.');
        }
      }

      engine.renderer.render(scene, engine.camera);
    } else {
      // Title/paused screens still show the world behind the overlay.
      engine.renderer.render(scene, engine.camera);
    }

    // HUD, camera and render run even on the title screen (world is visible behind the menu).
    hud.setMoney(player.state.money);
    hud.setWanted(wanted.stars);
    const carSpeed = player.state.currentCar ? Math.abs(player.state.currentCar.state.speed) * 8 : Math.round(player.state.speed * 6);
    hud.setSpeed(carSpeed);
    hud.setCar(player.state.currentCar ? player.state.currentCar.spec.name : '');
    const mission = missions.state.mission;
    hud.setMission(mission ? mission.title : '', mission ? mission.deliver : '');
    hud.setHealth(player.state.health);
    hud.setPrompt(buildPrompt());
    minimap.draw(player, wanted, police, missions.state, traffic.peds);
    player.applyCamera(engine.camera, dt);
    engine.update(dt, time);
    audio.update(dt);
  }

  function buildPrompt() {
    if (screen !== 'play') return '';
    if (player.state.inCar) return 'E — exit • Space — drift • F/Click — shoot';
    const near = nearestCar(allCars(), player.state.x, player.state.z, CAR.enterRange);
    return near ? 'E — steal ' + near.car.spec.name : 'WASD — move • Shift — run • F — shoot';
  }

  // Shot mode: synchronously settle the world and paint exactly one frame, then leave the
  // canvas with a fixed image the capture tool can read. This avoids the churn of a live
  // rAF loop under software rasterisers (headless screenshots).
  if (shotFrames >= 0) {
    for (let i = 0; i < shotFrames; i += 1) stepLoop(STEP);
    stepLoop(STEP);
    engine.renderer.render(scene, engine.camera);
    window.__neonReady = true;
    window.__neon = { engine, scene, camera: engine.camera, player, city, traffic, police, wanted, missions, parkedCars, allCars };
    announce('Neon Atlantic. Screenshot staged.');
    return;
  }

  let last = performance.now();
  let acc = 0;
  function frame(now) {
    const dtFrame = Math.min((now - last) / 1000, 0.25);
    last = now;
    acc += dtFrame;
    while (acc >= STEP) {
      stepLoop(STEP);
      acc -= STEP;
    }
    engine.renderer.render(scene, engine.camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  // Signal the page is ready for screenshot tooling.
  window.__neonReady = true;
  window.__neon = { engine, scene, camera: engine.camera, player, city, traffic, police, wanted, missions, parkedCars, allCars };
  announce('Neon Atlantic. Press Space to start.');
}

main();