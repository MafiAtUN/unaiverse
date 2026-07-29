/**
 * THE GALAXY — WebGL star-field with the Big Bang transition (plan §7).
 *
 * One THREE.Points object, one draw call, one custom shader. Every particle
 * carries three positions as attributes — dormant, emblem, galaxy — and the
 * vertex shader blends between them from a single scroll-driven uniform. No
 * per-frame CPU work touches the buffers, which is what keeps this cheap
 * enough to run behind 76 nodes of text.
 *
 * The sequence, as scroll crosses 30 November 2022:
 *   dormant  →  particles fly outward (the detonation)
 *            →  they gather into the UN emblem's olive branches, briefly
 *            →  they disperse into the full spiral galaxy
 *
 * This module is dynamically imported and never loads for readers who asked
 * for reduced motion.
 */
import * as THREE from 'three';

export interface Galaxy {
  setBang(v: number): void;
  setDrift(v: number): void;
  destroy(): void;
}

const VERT = /* glsl */ `
  attribute vec3 aDormant;
  attribute vec3 aEmblem;
  attribute vec3 aGalaxy;
  attribute float aSeed;
  attribute float aScale;

  uniform float uBang;      // 0 → 1 across the Big Bang scroll window
  uniform float uTime;
  uniform float uDrift;     // slow parallax from overall page scroll
  uniform float uPixelRatio;

  varying float vAlpha;
  varying float vHeat;      // 0 = cool blue, 1 = white-hot / gold

  void main() {
    // Four beats: fly out, gather to the emblem, HOLD, then disperse.
    // The hold between 0.58 and 0.78 is the whole point — without it the
    // olive branches are a smear nobody can read.
    float burst = smoothstep(0.00, 0.30, uBang);
    float form  = smoothstep(0.24, 0.58, uBang);
    float toGal = smoothstep(0.78, 1.00, uBang);
    float emblemHold = form * (1.0 - toGal);

    // Outward flight. Direction is the particle's own dormant position, so
    // the blast radiates from the centre rather than shearing sideways.
    vec3 dir = normalize(aDormant + vec3(aSeed * 0.6 - 0.3));
    vec3 pos = aDormant + dir * 34.0 * burst * (1.0 - form);

    pos = mix(pos, aEmblem, form);
    pos = mix(pos, aGalaxy, toGal);

    // The galaxy turns, slowly, once it exists.
    float spin = uTime * 0.018 * toGal;
    float c = cos(spin), s = sin(spin);
    pos.xy = mat2(c, -s, s, c) * pos.xy;

    // Idle shimmer, strongest while dormant so the empty sky still breathes.
    pos += vec3(
      sin(uTime * 0.25 + aSeed * 6.2831),
      cos(uTime * 0.21 + aSeed * 4.7123),
      0.0
    ) * 0.28 * (1.0 - toGal * 0.7);

    pos.y += uDrift;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    // Brightness budget. Additive blending over thousands of overlapping
    // points saturates fast, so these numbers stay low on purpose — the text
    // on top of this has to stay readable at every point in the sequence.
    // Riso inks are far more luminous than the navy palette these numbers
    // were first tuned for. The settled galaxy in particular has to sit well
    // under the cards it appears behind — the emblem is the only beat that
    // earns real brightness.
    float flash = exp(-pow((uBang - 0.26) * 11.0, 2.0));
    vAlpha = mix(0.15, 0.24, toGal) + flash * 0.22 + emblemHold * 0.32;
    vAlpha *= smoothstep(140.0, 8.0, -mv.z);
    vHeat = clamp(emblemHold * 0.8 + flash * 0.9, 0.0, 1.0);

    gl_PointSize = aScale * uPixelRatio * (1.0 + flash * 0.7) * (190.0 / -mv.z);
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;

  uniform vec3 uCool;   // settled galaxy
  uniform vec3 uWarm;   // detonation + olive branches
  uniform vec3 uPaper;  // the flash

  varying float vAlpha;
  varying float vHeat;

  void main() {
    // Round, soft-edged points. No texture fetch, no sprite sheet.
    vec2 d = gl_PointCoord - vec2(0.5);
    float r = dot(d, d);
    if (r > 0.25) discard;
    float falloff = smoothstep(0.25, 0.0, r);

    vec3 col = mix(uCool, uWarm, vHeat);
    col = mix(col, uPaper, vHeat * 0.45);

    gl_FragColor = vec4(col, falloff * vAlpha);
  }
`;

/**
 * Points tracing the two olive branches of the UN emblem.
 * Each branch is an arc sweeping up the side, with leaf pairs along it —
 * enough to be recognisable in the ~600ms it holds, which is all it needs.
 */
function oliveBranchPoints(count: number): Float32Array {
  const pts: number[] = [];
  const R = 15.5;

  const pushLeaf = (
    cx: number,
    cy: number,
    angle: number,
    len: number,
    wide: number,
    n: number,
  ) => {
    for (let i = 0; i < n; i++) {
      // Fill the leaf body, not just its outline — reads solid at a glance.
      const u = Math.random();
      const v = (Math.random() - 0.5) * 2;
      const lx = u * len;
      const ly = v * wide * Math.sin(Math.PI * u); // pointed at both ends
      pts.push(
        cx + lx * Math.cos(angle) - ly * Math.sin(angle),
        cy + lx * Math.sin(angle) + ly * Math.cos(angle),
        (Math.random() - 0.5) * 0.8,
      );
    }
  };

  for (const side of [-1, 1]) {
    const STEPS = 46;
    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS;
      // Sweep from just below the horizontal at the bottom up to near the top.
      const a = THREE.MathUtils.lerp(-1.48, 1.28, t);
      const rad = R * (1 - 0.06 * Math.sin(t * Math.PI));
      const x = side * rad * Math.cos(a);
      // Lifted so the wreath arcs around the caption rather than being
      // clipped by the milestone card sitting below it.
      const y = rad * Math.sin(a) + 2.4;

      // Stem
      for (let k = 0; k < 5; k++) {
        pts.push(x + (Math.random() - 0.5) * 0.35, y + (Math.random() - 0.5) * 0.35, 0);
      }

      // Leaves in pairs, thinning toward the tip
      if (i % 3 === 0 && t > 0.06 && t < 0.97) {
        const tangent = a + Math.PI / 2;
        const leafLen = 3.1 * (1 - t * 0.45);
        const leafW = 0.85 * (1 - t * 0.4);
        const nLeaf = 26;
        pushLeaf(x, y, tangent + side * 0.55, leafLen, leafW, nLeaf);
        pushLeaf(x, y, tangent - side * 0.95, leafLen * 0.85, leafW, nLeaf);
      }
    }
  }

  // Resample to exactly `count` positions.
  const out = new Float32Array(count * 3);
  const have = pts.length / 3;
  for (let i = 0; i < count; i++) {
    const j = Math.floor(Math.random() * have) * 3;
    out[i * 3] = pts[j]! + (Math.random() - 0.5) * 0.22;
    out[i * 3 + 1] = pts[j + 1]! + (Math.random() - 0.5) * 0.22;
    out[i * 3 + 2] = pts[j + 2]! + (Math.random() - 0.5) * 0.6;
  }
  return out;
}

export function createGalaxy(canvas: HTMLCanvasElement, count: number): Galaxy {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: 'low-power',
  });
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.6);
  renderer.setPixelRatio(pixelRatio);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 400);
  camera.position.z = 42;

  const dormant = new Float32Array(count * 3);
  const galaxy = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  const scale = new Float32Array(count);

  const ARMS = 4;
  for (let i = 0; i < count; i++) {
    // Dormant: a thin, quiet scattering — Zone 0 is "nearly empty space".
    dormant[i * 3] = (Math.random() - 0.5) * 46;
    dormant[i * 3 + 1] = (Math.random() - 0.5) * 34;
    dormant[i * 3 + 2] = (Math.random() - 0.5) * 26;

    // Galaxy: spiral arms with a dense core.
    const r = Math.pow(Math.random(), 1.7) * 30 + 0.6;
    const arm = ((i % ARMS) / ARMS) * Math.PI * 2;
    const spin = r * 0.13;
    const spread = Math.pow(Math.random(), 2.4) * 3.4 * (r * 0.06 + 0.4);
    const a = arm + spin + (Math.random() - 0.5) * 0.5;
    galaxy[i * 3] = Math.cos(a) * r + (Math.random() - 0.5) * spread;
    galaxy[i * 3 + 1] = Math.sin(a) * r * 0.62 + (Math.random() - 0.5) * spread;
    galaxy[i * 3 + 2] = (Math.random() - 0.5) * spread * 1.6 - 4;

    seed[i] = Math.random();
    // Mostly small with a few bright ones — big soft points read as bokeh
    // rather than stars, and the emblem's leaves stop being legible.
    scale[i] = 0.55 + Math.pow(Math.random(), 3.4) * 2.3;
  }

  const geo = new THREE.BufferGeometry();
  // `position` is required by three even though the shader ignores it.
  geo.setAttribute('position', new THREE.BufferAttribute(dormant, 3));
  geo.setAttribute('aDormant', new THREE.BufferAttribute(dormant, 3));
  geo.setAttribute('aEmblem', new THREE.BufferAttribute(oliveBranchPoints(count), 3));
  geo.setAttribute('aGalaxy', new THREE.BufferAttribute(galaxy, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geo.setAttribute('aScale', new THREE.BufferAttribute(scale, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 200);

  const uniforms = {
    uBang: { value: 0 },
    uTime: { value: 0 },
    uDrift: { value: 0 },
    uPixelRatio: { value: pixelRatio },
    // Green on the emblem is not decoration: the particles form the UN's
    // olive branches, and a green wreath is the entire point of that beat.
    uCool: { value: new THREE.Color('#ff5fa8') }, // riso pink galaxy
    uWarm: { value: new THREE.Color('#2fbf74') }, // riso green olive branches
    uPaper: { value: new THREE.Color('#f5d020') }, // riso yellow at the flash
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geo, material);
  scene.add(points);

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();

  let raf = 0;
  let running = true;
  // Plain performance.now() rather than THREE.Clock, which is deprecated in
  // r185 and logs a console warning on every page load.
  const t0 = performance.now();
  let last = 0;

  // The bang deserves every frame; the rest of the page does not. Idle
  // rendering is capped at ~30fps, which halves GPU time while scrolling text.
  function frame() {
    raf = requestAnimationFrame(frame);
    if (!running) return;

    const t = (performance.now() - t0) / 1000;
    const active = uniforms.uBang.value > 0.001 && uniforms.uBang.value < 0.999;
    if (!active && t - last < 1 / 30) return;
    last = t;

    uniforms.uTime.value = t;
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  const onVisibility = () => {
    running = document.visibilityState === 'visible';
  };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('resize', resize);

  return {
    setBang(v: number) {
      uniforms.uBang.value = THREE.MathUtils.clamp(v, 0, 1);
    },
    setDrift(v: number) {
      uniforms.uDrift.value = v;
    },
    destroy() {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', resize);
      geo.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}
