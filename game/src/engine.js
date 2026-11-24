// The Three.js scene graph's shared building blocks: a warm daylight coastal scene (sky dome,
// sun glow, fog, lights), ocean with an animated wave shader, and shared geometry/material caches.
// Everything here is about how Azure Cove looks and feels, not the game rules.
import { CITY } from './config.js';

const SKY = {
  uniforms: {
    top: { value: new THREE.Color(0x0f6fd8) },
    bottom: { value: new THREE.Color(0x9fd8ff) },
    sunDir: { value: new THREE.Vector3(0.55, 0.6, -0.55).normalize() },
  },
  vert: [
    'varying vec3 vWorld;',
    'void main() {',
    '  vWorld = (modelMatrix * vec4(position, 1.0)).xyz;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '}',
  ].join('\n'),
  frag: [
    'uniform vec3 top;',
    'uniform vec3 bottom;',
    'uniform vec3 sunDir;',
    'varying vec3 vWorld;',
    'void main() {',
    '  vec3 d = normalize(vWorld);',
    '  float h = clamp(d.y, 0.0, 1.0);',
    '  vec3 col = mix(bottom, top, pow(h, 0.62));',
    '  float s = max(dot(d, sunDir), 0.0);',
    '  col += vec3(1.0, 0.92, 0.72) * pow(s, 36.0) * 0.9;',
    '  col += vec3(1.0, 0.96, 0.85) * pow(s, 8.0) * 0.18;',
    '  gl_FragColor = vec4(col, 1.0);',
    '}',
  ].join('\n'),
};

const WATER = {
  uniforms: {
    time: { value: 0 },
    shore: { value: new THREE.Vector3(0, 0, 0) },
  },
  vert: [
    'uniform float time;',
    'varying vec3 vWorld;',
    'varying float vHeight;',
    'void main() {',
    '  vec3 p = position;',
    '  float h = sin(p.x * 0.18 + time * 1.1) * 0.22 + cos(p.z * 0.14 + time * 0.9) * 0.22;',
    '  h += sin((p.x + p.z) * 0.05 + time * 0.6) * 0.4;',
    '  p.y += h;',
    '  vHeight = h;',
    '  vWorld = (modelMatrix * vec4(p, 1.0)).xyz;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);',
    '}',
  ].join('\n'),
  frag: [
    'uniform vec3 shore;',
    'varying vec3 vWorld;',
    'varying float vHeight;',
    'void main() {',
    '  float d = length(vWorld.xz - shore.xz);',
    '  float foam = smoothstep(70.0, 34.0, d);',
    '  vec3 col = mix(vec3(0.055, 0.49, 0.58), vec3(0.13, 0.72, 0.80), 0.55 + vHeight * 0.5);',
    '  col = mix(vec3(0.95, 0.99, 0.96), col, smoothstep(0.25, 0.75, foam));',
    '  col += vec3(1.0, 0.98, 0.92) * max(vHeight - 0.2, 0.0) * 0.5;',
    '  gl_FragColor = vec4(col, 0.95);',
    '}',
  ].join('\n'),
};

export function createEngine(container) {
  const headless = navigator.webdriver === true;
  const renderer = new THREE.WebGLRenderer({ antialias: !headless, canvas: container, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderer.setPixelRatio(headless ? 1 : Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = !headless;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.NoToneMapping;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x4fa8e0);
  scene.fog = new THREE.Fog(0xbfe2ff, 90, 900);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2600);
  camera.position.set(0, 8, 20);

  // Sun and warm fill light. Intensities are chosen so the combined direct + ambient light
  // stays near 1.0 in total, keeping sun-bleached surfaces bright without clipping to white.
  const sun = new THREE.DirectionalLight(0xfff2d8, 0.95);
  sun.position.set(420, 520, -180);
  sun.castShadow = !headless;
  sun.shadow.mapSize.set(headless ? 512 : 2048, headless ? 512 : 2048);
  const sc = 460;
  sun.shadow.camera.left = -sc;
  sun.shadow.camera.right = sc;
  sun.shadow.camera.top = sc;
  sun.shadow.camera.bottom = -sc;
  sun.shadow.camera.near = 40;
  sun.shadow.camera.far = 1400;
  sun.shadow.bias = -0.0006;
  scene.add(sun);

  const hemi = new THREE.HemisphereLight(0xd6f0ff, 0xf7dcae, 0.5);
  scene.add(hemi);

  const fill = new THREE.DirectionalLight(0x9fd8ff, 0.1);
  fill.position.set(-200, 120, 240);
  scene.add(fill);

  scene.add(new THREE.AmbientLight(0xfff4e0, 0.12));

  // Sky dome and sun sprite.
  const skyGeo = new THREE.SphereGeometry(2400, 40, 24);
  const skyMat = new THREE.ShaderMaterial({ uniforms: SKY.uniforms, vertexShader: SKY.vert, fragmentShader: SKY.frag, side: THREE.BackSide, fog: false });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.renderOrder = -10;
  scene.add(sky);

  const sunGlow = new THREE.Mesh(
    new THREE.SphereGeometry(46, 20, 20),
    new THREE.MeshBasicMaterial({ color: 0xfff6c8, fog: false }),
  );
  sunGlow.position.set(1100, 950, -950);
  scene.add(sunGlow);

  // The ocean, tilted flat around y=0 with gentle moving waves.
  const oceanSize = 2400;
  const waterGeo = new THREE.PlaneGeometry(oceanSize, oceanSize, headless ? 48 : 96, headless ? 48 : 96);
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = new THREE.ShaderMaterial({
    uniforms: WATER.uniforms,
    vertexShader: WATER.vert,
    fragmentShader: WATER.frag,
    transparent: true,
  });
  const ocean = new THREE.Mesh(waterGeo, waterMat);
  ocean.position.set(0, 0.2, -CITY.side * CITY.block * 0.5 - 420);
  ocean.receiveShadow = true;
  scene.add(ocean);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return {
    renderer,
    scene,
    camera,
    sun,
    ocean,
    update(dt, time) {
      WATER.uniforms.time.value = time;
      waterMat.uniforms.time.value = time;
    },
    resize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    },
  };
}

export function makeSpriteTexture(color, width, height) {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}