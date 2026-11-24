// Procedural Web Audio, no asset files: engine hums, waves, sirens, a soft click and toasts.
// createAudio() lazily opens the AudioContext on the first user gesture so the page stays quiet
// until the player actually starts the game.
import { AUDIO, CAMERA } from './config.js';

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let engineStarted = false;
  let engineOsc = null;
  let engineSub = null;
  let engineGain = null;
  let engineFilter = null;
  let skip = 0;
  let waveGain = null;
  let waveTimer = 0;
  let sirenOn = false;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenLfo = null;

  function ensure() {
    if (ctx) return;
    if (navigator.webdriver) return; // headless capture has no audio device; stay silent
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : AUDIO.master;
    master.connect(ctx.destination);

    // Gentle ocean wash: filtered white noise with a slow LFO on its level.
    const len = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i += 1) {
      last = last * 0.96 + (Math.random() * 2 - 1) * 0.06;
      data[i] = last;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = 'lowpass';
    band.frequency.value = 420;
    waveGain = ctx.createGain();
    waveGain.gain.value = 0.035;
    src.connect(band).connect(waveGain).connect(master);
    src.start();
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.14;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.014;
    lfo.connect(lfoGain).connect(waveGain.gain);
    lfo.start();
  }

  function resume() {
    ensure();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function blip(freq, dur, vol, type) {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = type || 'square';
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function click() {
    blip(620, 0.05, AUDIO.click, 'square');
  }

  function toast() {
    blip(440, 0.06, 0.08, 'triangle');
    setTimeout(() => blip(660, 0.06, 0.08, 'triangle'), 70);
  }

  function shoot() {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const g = ctx.createGain();
    g.gain.value = 0.5;
    src.connect(g).connect(master);
    src.start(t);
    blip(120, 0.09, 0.16, 'sawtooth');
  }

  function crash() {
    blip(90, 0.28, 0.5, 'sawtooth');
    blip(60, 0.34, 0.4, 'square');
  }

  function sirenScale(value) {
    if (!ctx || !sirenOsc) return;
    sirenGain.gain.value = muted ? 0 : 0.05 * value;
  }

  function setSiren(on) {
    ensure();
    if (!ctx) return;
    if (on && !sirenOsc) {
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'sawtooth';
      sirenOsc.frequency.value = 660;
      sirenLfo = ctx.createOscillator();
      sirenLfo.frequency.value = 6;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 220;
      sirenLfo.connect(lfoGain).connect(sirenOsc.frequency);
      sirenGain = ctx.createGain();
      sirenGain.gain.value = muted ? 0 : 0.05;
      sirenOsc.connect(sirenGain).connect(master);
      sirenOsc.start();
      sirenLfo.start();
    } else if (!on && sirenOsc) {
      sirenOsc.stop();
      sirenLfo.stop();
      sirenOsc = null;
      sirenLfo = null;
      sirenGain = null;
    }
    sirenOn = on;
  }

  function setEngine(on, rpm) {
    ensure();
    if (!ctx) return;
    if (!engineOsc) {
      engineStarted = on;
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 60;
      engineSub = ctx.createOscillator();
      engineSub.type = 'square';
      engineSub.frequency.value = 30;
      engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 220;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const subGain = ctx.createGain();
      subGain.gain.value = 0.4;
      engineOsc.connect(engineFilter).connect(engineGain).connect(master);
      engineSub.connect(subGain).connect(engineGain);
      engineOsc.start();
      engineSub.start();
    }
    if (engineOsc && on) {
      const r = 400 + rpm * 260;
      engineOsc.frequency.value = r;
      engineSub.frequency.value = r / 2;
      engineFilter.frequency.value = 260 + rpm * 520;
      engineGain.gain.value = muted ? 0 : 0.035 + rpm * 0.05;
    } else if (engineOsc) {
      engineGain.gain.value = 0;
    }
  }

  function setMuted(value) {
    muted = value;
    if (master) master.gain.value = muted ? 0 : AUDIO.master;
  }

  function update(dt, state) {
    if (!ctx) return;
    // Keep the wave LFO alive on the audio clock; nothing to do per frame.
    waveTimer += dt;
  }

  return {
    resume,
    click,
    toast,
    shoot,
    crash,
    setSiren,
    setEngine,
    setMuted,
    isMuted() { return muted; },
    update,
  };
}