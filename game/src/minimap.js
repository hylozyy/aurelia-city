// The top-down minimap: roads, buildings, the mission marker, wanted blips and the player's
// facing arrow, drawn each frame to a small canvas. The same canvas is used for the HUD overlay.
import { CITY, PALETTE } from './config.js';

export function createMinimap(canvas, city) {
  const ctx = canvas.getContext('2d');
  const scale = canvas.width / (CITY.side * CITY.block + 160);
  const cx = canvas.width / 2;
  const cz = canvas.height / 2;

  function worldToMap(x, z) {
    return { x: cx + x * scale, y: cz + z * scale };
  }

  function draw(player, wanted, police, mission, peds) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Ocean / ground wash.
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#10455c');
    grad.addColorStop(1, '#2c9dc0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Sand/beach band.
    ctx.fillStyle = '#f2dcb0';
    ctx.fillRect(0, cz - (120) * scale, canvas.width, 46 * scale);

    // Roads.
    ctx.lineWidth = Math.max(2, ROAD_PX());
    ctx.strokeStyle = '#3c4048';
    ctx.beginPath();
    for (const seg of city.roads) {
      const a = worldToMap(seg.at, seg.from);
      const b = worldToMap(seg.at, seg.to);
      // Draw along the correct axis.
      if (seg.axis === 'z') {
        ctx.moveTo(cx + seg.at * scale, cz + seg.from * scale);
        ctx.lineTo(cx + seg.at * scale, cz + seg.to * scale);
      } else {
        ctx.moveTo(cx + seg.from * scale, cz + seg.at * scale);
        ctx.lineTo(cx + seg.to * scale, cz + seg.at * scale);
      }
    }
    ctx.stroke();

    // Palms as faint green dots.
    ctx.fillStyle = 'rgba(120,200,140,0.7)';
    for (const p of city.palmPositions) {
      const m = worldToMap(p.x, p.z);
      ctx.beginPath();
      ctx.arc(m.x, m.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mission marker: pulsing ring.
    if (mission && mission.marker && mission.marker.active) {
      const m = worldToMap(mission.marker.x, mission.marker.z);
      const t = performance.now() / 380;
      const pulse = 7 + Math.sin(t) * 2.5;
      ctx.strokeStyle = '#ffd976';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(m.x, m.y, pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#fff3cf';
      ctx.beginPath();
      ctx.arc(m.x, m.y, 3.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Police blips.
    if (wanted && wanted.stars > 0) {
      for (const unit of police.units) {
        const m = worldToMap(unit.state.x, unit.state.z);
        ctx.fillStyle = '#ff6b57';
        ctx.strokeStyle = '#ffd2c8';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(m.x, m.y, 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // Player arrow (or car heading).
    const pos = player.state.currentCar ? player.state.currentCar.state : player.state;
    const p = worldToMap(pos.x, pos.z);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(pos.heading || player.state.heading || 0);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#c98f1a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -6.5);
    ctx.lineTo(4.4, 5);
    ctx.lineTo(0, 2.2);
    ctx.lineTo(-4.4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  return { draw };
}

function ROAD_PX() {
  return 5;
}