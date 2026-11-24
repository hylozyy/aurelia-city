// The HTML overlay: money, wanted stars, speedometer, mission text, on-screen prompts, a
// damage vignette and the start/pause/win/busted screens. Everything is DOM so it stays crisp
// over the WebGL canvas and is trivially readable in screenshots.
import { WORLD, MISSIONS } from './config.js';
import { el, clamp } from './util.js';

export function createHud() {
  const root = document.getElementById('hud');
  root.innerHTML = '';

  const minimap = el('canvas', '', '');
  minimap.id = 'minimap';
  minimap.width = 188;
  minimap.height = 188;

  const money = el('div', 'panel', '');
  money.id = 'money';

  const wanted = el('div', 'panel', '');
  wanted.id = 'wanted';
  wanted.innerHTML = '<span class="label">WANTED LEVEL</span><span class="stars">'+'☆'.repeat(5)+'</span>';

  const speedo = el('div', 'panel', '');
  speedo.id = 'speedo';
  const speedRow = el('div', '', '');
  speedRow.innerHTML = '<span id="speed">0</span> <span class="u">km/h</span>';
  const carName = el('div', '', '');
  carName.id = 'carname';
  speedo.append(carName, speedRow);

  const mission = el('div', 'panel', '');
  mission.id = 'mission';

  const prompt = el('div', 'panel', '');
  prompt.id = 'prompt';

  const toasts = el('div', 'panel', '');
  toasts.id = 'toasts';

  const crosshair = el('div', '', '');
  crosshair.id = 'crosshair';

  const health = el('div', 'panel', '');
  health.id = 'healthwrap';
  health.innerHTML = '<div id="healthbar"><div></div></div>';

  const overlay = el('div', 'overlay hidden', '');
  overlay.id = 'overlay';

  root.append(minimap, money, wanted, speedo, mission, prompt, toasts, crosshair, health, overlay);

  let lastStars = -1;
  let lastMoney = -1;
  let lastSpeed = -1;
  let lastMission = '';
  let lastProgress = '';
  let promptText = '';
  let promptVisible = false;

  return {
    root,
    minimap,
    money,
    wanted,
    speed: document.getElementById('speed'),
    carName,
    mission,
    prompt,
    toasts,
    overlay,
    healthFill: document.querySelector('#healthbar > div'),

    setMoney(value) {
      if (value === lastMoney) return;
      lastMoney = value;
      money.textContent = `$${value.toLocaleString()} AZC`;
    },

    setWanted(stars) {
      if (stars === lastStars) return;
      lastStars = stars;
      const full = '★'.repeat(stars);
      const empty = '<span class="off">' + '☆'.repeat(5 - stars) + '</span>';
      wanted.querySelector('.stars').innerHTML = full + empty;
    },

    setSpeed(value) {
      const s = Math.round(value);
      if (s === lastSpeed) return;
      lastSpeed = s;
      this.speed.textContent = String(s);
    },

    setCar(name) {
      this.carName.textContent = name || '';
    },

    setMission(title, objective) {
      if (title === lastMission && objective === lastProgress) return;
      lastMission = title;
      lastProgress = objective;
      mission.innerHTML = '';
      if (title) mission.appendChild(el('div', 'mt', title));
      if (objective) mission.appendChild(el('div', 'mo', objective));
    },

    setPrompt(text) {
      if (text === promptText && !text) return;
      promptText = text;
      prompt.textContent = text;
      prompt.style.display = text ? 'block' : 'none';
    },

    setHealth(hp) {
      this.healthFill.style.width = `${clamp(hp, 0, 100)}%`;
      this.healthFill.style.backgroundColor = hp > 35 ? '#39c95b' : '#e5483a';
    },

    toast(text) {
      const node = el('div', 'toast', text);
      toasts.appendChild(node);
      setTimeout(() => {
        node.style.transition = 'opacity .5s';
        node.style.opacity = '0';
        setTimeout(() => node.remove(), 500);
      }, 4600);
      return node;
    },

    showScreen(kind, text) {
      overlay.className = 'overlay ' + (kind === 'busted' ? 'busted' : kind === 'won' ? 'won' : '');
      overlay.innerHTML = '';
      const big = el('div', 'bigmsg', text);
      if (kind === 'title') {
        overlay.appendChild(el('h1', '', 'NEON ATLANTIC'));
        overlay.appendChild(el('h2', '', 'AZURE COVE'));
        overlay.appendChild(el('div', 'tag', WORLD.date));
        overlay.appendChild(big);
        const controls = el('div', 'controls', '');
        controls.innerHTML = [
          '<div><b>WASD / Arrows</b> — move & drive</div><div><b>Mouse</b> — look around</div>',
          '<div><b>E</b> — enter / exit car</div><div><b>Space</b> — handbrake / drift</div>',
          '<div><b>F / Click</b> — attack / shoot</div><div><b>Shift</b> — run</div>',
          '<div><b>M</b> — mute audio</div><div><b>Esc</b> — pause</div>',
        ].join('');
        overlay.appendChild(controls);
        const btn = el('button', 'btn', '▶ START DAY');
        overlay.appendChild(btn);
        overlay.appendChild(el('div', 'small', 'A sunny open-world crime game. Every name, place and pixel is original.'));
        btn.onclick = () => overlay.dispatchEvent(new CustomEvent('start'));
      } else if (kind === 'paused') {
        overlay.appendChild(el('div', 'bigmsg', 'PAUSED'));
        const btn = el('button', 'btn', 'RESUME');
        overlay.appendChild(btn);
        btn.onclick = () => overlay.dispatchEvent(new CustomEvent('resume'));
      } else if (kind === 'won' || kind === 'busted') {
        const sub = el('div', 'small', kind === 'won' ? 'Every job. Every getaway. Azure Cove remembers.' : 'The Cove PD caught up. Walk it off, then go again.');
        overlay.appendChild(sub);
        const btn = el('button', 'btn', kind === 'won' ? 'KEEP PLAYING' : 'RESTART');
        overlay.appendChild(btn);
        btn.onclick = () => overlay.dispatchEvent(new CustomEvent('continue'));
      }
      overlay.classList.remove('hidden');
      return overlay;
    },

    hideScreen() {
      overlay.classList.add('hidden');
      overlay.innerHTML = '';
    },
  };
}