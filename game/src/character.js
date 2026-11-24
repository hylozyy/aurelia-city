// Low-poly humans shared by the player, pedestrians and police officers. A character is a
// handful of boxes and spheres: legs, torso, arms, head, hair and a few clothes colour options.
// The player gets a bolder look, police officers get a dark uniform with a peaked cap.
import { css, hue } from './util.js';

const skinMat = new THREE.MeshLambertMaterial({ color: 0xe9b48a });
const skinDarkMat = new THREE.MeshLambertMaterial({ color: 0x8f5f3f });

function box(w, h, d, mat) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
}

export function createCharacter(opts) {
  const g = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color: opts.shirt ?? css('#4fc3f7').getHex() });
  const pants = new THREE.MeshLambertMaterial({ color: opts.pants ?? css('#3a4a63').getHex() });
  const capMat = new THREE.MeshLambertMaterial({ color: opts.cap ?? css('#2a3c66').getHex() });

  const pelvis = new THREE.Group();
  pelvis.position.y = 0.95;
  g.add(pelvis);

  // Legs.
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.16, -0.85, 0);
    const thigh = box(0.24, 0.7, 0.26, pants);
    thigh.position.y = -0.35;
    leg.add(thigh);
    const shin = box(0.2, 0.62, 0.22, skinDarkMat);
    shin.position.y = -1.0;
    leg.add(shin);
    const shoe = box(0.24, 0.18, 0.5, css('#22252e'));
    shoe.position.set(0, -1.34, 0.12);
    leg.add(shoe);
    pelvis.add(leg);
    leg.userData.left = side < 0;
  }

  // Torso.
  const torso = box(0.62, 0.95, 0.36, shirt);
  torso.position.y = 0.55;
  torso.castShadow = true;
  g.add(torso);
  const chest = box(0.5, 0.4, 0.12, shirt);
  chest.position.set(0, 0.8, 0.25);
  g.add(chest);

  // Arms.
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.42, 0.6, 0);
    const upper = box(0.2, 0.7, 0.24, shirt);
    upper.position.y = -0.2;
    arm.add(upper);
    const fore = box(0.18, 0.6, 0.2, skinMat);
    fore.position.y = -0.85;
    arm.add(fore);
    g.add(arm);
    arm.userData.left = side < 0;
  }

  // Head.
  const head = new THREE.Group();
  head.position.y = 1.55;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), skinMat);
  skull.scale.set(1, 1.12, 0.95);
  head.add(skull);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8), new THREE.MeshLambertMaterial({ color: opts.hair ?? 0x2b241f }));
  hair.scale.set(1, 0.72, 0.98);
  hair.position.y = 0.16;
  hair.position.z = -0.05;
  head.add(hair);
  const cap = new THREE.Group();
  const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.2, 10), capMat);
  capTop.position.y = 0.32;
  cap.add(capTop);
  const brim = box(0.6, 0.06, 0.34, capMat);
  brim.position.set(0, 0.25, 0.28);
  cap.add(brim);
  cap.position.y = 0.16;
  cap.position.z = 0.02;
  head.add(cap);
  // Legs spread default pose.
  g.add(head);

  const walkPhase = { value: 0 };
  let current = 0;

  return {
    group: g,
    walkPhase,
    update(dt, moving) {
      if (moving) current += dt * 9;
      else current *= 0.9;
      const legL = pelvis.children[0];
      const legR = pelvis.children[1];
      const armL = g.children.find((c) => c.userData && c.userData.left === true);
      const armR = g.children.find((c) => c.userData && c.userData.left === false);
      const swing = Math.sin(current) * 0.55;
      if (legL) legL.rotation.x = swing;
      if (legR) legR.rotation.x = -swing;
      if (armL) armL.rotation.x = -swing * 0.8;
      if (armR) armR.rotation.x = swing * 0.8;
      walkPhase.value = current;
    },
    setPose(idle) {
      if (!idle) return;
      const legL = pelvis.children[0];
      const legR = pelvis.children[1];
      if (legL) legL.rotation.x = 0;
      if (legR) legR.rotation.x = 0;
    },
    setTint(hex) {
      shirt.color.setHex(hex);
    },
  };
}