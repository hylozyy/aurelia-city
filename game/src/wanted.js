// The wanted level: crime points accumulate into stars, decay when the player is out of police
// sight, and drive the police response. Stars rise with car theft, gunfire and killing
// pedestrians. At one star a couple of cruisers hunt; at five stars the force is saturated.
import { WANTED } from './config.js';

export function createWanted() {
  return {
    stars: 0,
    crime: 0,
    visible: false,
    searchTimer: 0,
    escapeTimer: 0,
    bustedTimer: 0,
    hueAndCry: 0,

    addCrime(points) {
      const was = this.stars;
      this.crime += points;
      this.recompute();
      // A fresh crime resets the search clock so the heat actually sticks around.
      if (this.stars > was || this.hueAndCry > 0) this.searchTimer = WANTED.searchDuration;
    },

    recompute() {
      this.stars = Math.min(WANTED.maxStars, Math.floor(this.crime / WANTED.crimeToStar));
    },

    reportCrime(kind, x, z) {
      // kind: 'steal', 'shoot', 'hit', 'speed'
      const points = kind === 'steal' ? WANTED.crimeToStar : kind === 'shoot' ? 55 : kind === 'hit' ? 40 : 20;
      this.addCrime(points);
      this.hueAndCry = 1.2;
    },

    reportShot(x, z) {
      this.addCrime(55);
      this.hueAndCry = 2.0;
    },

    update(dt, visible, distToCop) {
      this.hueAndCry = Math.max(0, this.hueAndCry - dt);
      this.visible = visible;
      if (visible) {
        this.escapeTimer = 0;
        this.searchTimer = WANTED.searchDuration;
      } else if (this.stars > 0) {
        this.searchTimer -= dt;
        if (this.searchTimer <= 0 && this.escapeTimer <= 0) {
          this.crime = Math.max(0, this.crime - WANTED.decayRate * dt * (1 + this.stars * 0.15));
          this.escapeTimer = WANTED.escapeCooldown;
        }
        if (this.escapeTimer > 0) this.escapeTimer -= dt;
      }
      this.recompute();
      return this.stars;
    },

    busted() {
      this.bustedTimer = Math.max(this.bustedTimer, 3);
    },
  };
}