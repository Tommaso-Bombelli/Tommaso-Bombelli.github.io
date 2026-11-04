/* =========================================================
   world.js — the cable-car ride, in real 3D
   Lake Maggiore and the Rocca di Angera, forest, meadow, the
   Dolomite walls at sunset, the summit under the stars. The line
   is made of the three conductors; signals run along them.
   Scrolling moves between five stops; the mouse moves the eye.
========================================================= */
import * as THREE from './vendor/three.module.min.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = innerWidth < 800;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/* ---------------- loader ---------------- */
const loader = $('.loader'), countEl = $('.loader__count'), wiresEl = $('.loader__wires');
const setLoad = v => {
  const n = Math.round(clamp(v) * 100);
  if (countEl) countEl.textContent = String(n).padStart(3, '0');
  if (wiresEl) wiresEl.style.setProperty('--p', clamp(v));
};
const finish = () => {
  setLoad(1);
  root.classList.add('is-ready');
  setTimeout(() => loader?.remove(), 1200);
};
const breathe = () => new Promise(r => setTimeout(r, 0));

/* ---------------- noise ---------------- */
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const n2 = (x, y) => {
  const i = Math.floor(x), j = Math.floor(y), f = x - i, g = y - j;
  const u = f * f * (3 - 2 * f), v = g * g * (3 - 2 * g);
  return lerp(lerp(hash(i, j), hash(i + 1, j), u), lerp(hash(i, j + 1), hash(i + 1, j + 1), u), v);
};
const fbm = (x, y, o = 5) => { let a = .5, s = 0; for (let i = 0; i < o; i++) { s += a * n2(x, y); x = x * 2.03 + 7.1; y = y * 2.03 + 3.3; a *= .5; } return s; };
const ridged = (x, y, o = 5) => { let a = .5, s = 0, w = 1; for (let i = 0; i < o; i++) { let v = 1 - Math.abs(2 * n2(x, y) - 1); v *= v; s += a * v * w; w = clamp(v * 1.6); x = x * 2.03 + 7.1; y = y * 2.03 + 3.3; a *= .5; } return s; };

/* ---------------- the route: pylons from the lake to the summit ---------------- */
const HEADS = [
  [0, 30, 40], [14, 60, 210], [-24, 100, 400], [6, 150, 590], [46, 205, 790],
  [28, 275, 990], [-20, 350, 1180], [-6, 420, 1350], [24, 486, 1500]
];
const STOP_AT = [.42, 2.42, 4.42, 6.42, 7.62]; // where each of the five stops waits: mid span, never on a pylon
const routeX = z => { for (let i = 1; i < HEADS.length; i++) if (z <= HEADS[i][2]) { const a = HEADS[i - 1], b = HEADS[i]; return lerp(a[0], b[0], sstep(a[2], b[2], z)); } return HEADS[HEADS.length - 1][0]; };
const routeY = z => { if (z <= HEADS[0][2]) return HEADS[0][1]; for (let i = 1; i < HEADS.length; i++) if (z <= HEADS[i][2]) { const a = HEADS[i - 1], b = HEADS[i]; return lerp(a[1], b[1], (z - a[2]) / (b[2] - a[2])); } return HEADS[HEADS.length - 1][1]; };

const ROCCA = { x: 118, z: 196 };
/* what stands at each stop (x, z), on ground levelled for it */
const STAND = {
  board: [-62, 540], rack: [92, 930], house: [-90, 1311], pc: [-61, 1353],
  mast: [45, 1545], screen: [51, 1482], line: [109, 1539, 79, 1520]
};
const PADS = [[...STAND.board, 34], [...STAND.rack, 60], [...STAND.house, 30], [...STAND.pc, 28], [...STAND.mast, 26], [...STAND.screen, 22], [94, 1530, 30]];
/* the ground: a lake, then a valley along the line, then walls on both sides and a great range ahead */
const rawHeight = (x, z) => {
  const d = Math.abs(x - routeX(z));
  const ramp = routeY(clamp(z, -400, 1500)) - 30;
  const floor = ramp + (fbm(x * .012, z * .012, 4) - .5) * 26;
  const rough = ridged(x * .0042 + 3, z * .0042 + 1, 6);
  const wallN = fbm(x * .0035 + 9, z * .0035 + 2, 4);
  const altitude = sstep(250, 1050, z);
  const wall = sstep(.44, .53, wallN) * (120 + 260 * altitude);
  const side = sstep(150, 760, d);
  const saddle = 1 - .62 * sstep(1150, 1500, z);
  let h = floor + side * saddle * (rough * (110 + 280 * altitude) + wall);
  /* the range closes the valley beyond the summit */
  h += sstep(1600, 2150, z) * (rough * 420 + wall * .8 + 60);
  /* the lake: everything low near the start drowns */
  const lake = sstep(235, 70, z + (fbm(x * .006, 4, 3) - .5) * 200 + Math.max(0, x - 40) * .08);
  h = lerp(h, Math.min(h, -9 + side * rough * 170 * sstep(350, 750, Math.abs(x + 80))), lake);
  /* the far shore of the lake, low green hills */
  h += sstep(-120, -420, z) * (24 + rough * 80);
  /* the hill the Rocca stands on */
  const rd = Math.hypot(x - ROCCA.x, z - ROCCA.z);
  h += Math.exp(-rd * rd / (2 * 60 * 60)) * 46;
  /* fine relief on anything that is not lake */
  h += sstep(2, 40, h) * (ridged(x * .03, z * .03, 4) - .32) * (5 + 16 * sstep(.2, .9, side));
  return h;
};
const padded = (x, z, base) => {
  let h = base;
  PADS.forEach(([px, pz, r]) => { const d = Math.hypot(x - px, z - pz); const k = sstep(r * 1.5, r * .8, d); if (k > 0) h = lerp(h, padHeight(px, pz), k); });
  return h;
};
const padCache = new Map();
const padHeight = (x, z) => { const k = x + ',' + z; if (!padCache.has(k)) padCache.set(k, rawHeight(x, z)); return padCache.get(k); };
const heightAt = (x, z) => padded(x, z, rawHeight(x, z));

/* ---------------- colour of the ground ---------------- */
const C = {
  grass: new THREE.Color('#6f9a4e'), meadow: new THREE.Color('#8fb35a'), forest: new THREE.Color('#2f5b3c'),
  scree: new THREE.Color('#b1a595'), rock: new THREE.Color('#e4d8c8'), rockD: new THREE.Color('#a08f86'),
  snow: new THREE.Color('#f7f8fa'), sand: new THREE.Color('#b9ac8d')
};
const tmpC = new THREE.Color();
const groundColor = (x, y, z, slope) => {
  const n = fbm(x * .03, z * .03, 3);
  if (y < 1.5) return tmpC.copy(C.sand);
  tmpC.copy(C.grass).lerp(C.forest, sstep(.38, .62, n)).lerp(C.meadow, sstep(.55, .75, fbm(x * .011, z * .011, 2)) * sstep(120, 200, y) * .9);
  /* stone on anything steep, in strata */
  const strata = .5 + .5 * Math.sin(y * .42 + fbm(x * .01, z * .01, 2) * 11);
  const stone = C.rockD.clone().lerp(C.rock, clamp(strata * .55 + n * .7));
  const steep = sstep(.5, .72, slope + (n - .5) * .22);
  tmpC.lerp(stone, steep);
  /* scree and high pasture, then snow in the shelter of the tops */
  const hi = sstep(330, 560, y + (n - .5) * 90);
  if (slope < .55) tmpC.lerp(C.scree, hi);
  if (slope < .42) tmpC.lerp(C.snow, sstep(620, 760, y + (n - .5) * 120));
  return tmpC;
};

/* ---------------- light through the day ---------------- */
const hexC = h => new THREE.Color(h);
const key = (zen, hor, sun, sunI, hemiS, hemiG, hemiI, fog, star, dirX, dirY, water) => ({
  zen: hexC(zen), hor: hexC(hor), sun: hexC(sun), sunI, hemiS: hexC(hemiS), hemiG: hexC(hemiG), hemiI, fog: hexC(fog), star, dir: new THREE.Vector3(dirX, dirY, -.5).normalize(), water: hexC(water)
});
const LIGHT = [
  key('#4f93d6', '#fde8cc', '#fff0d0', 2.3, '#cfe4ff', '#54603e', 1.15, '#f3e6d4', 0, -.5, .75, '#2f6f96'),
  key('#2a7fca', '#cfe9ee', '#fffbe9', 2.7, '#d6ecff', '#5d6c46', 1.2, '#dcecee', 0, .15, 1, '#2a7aa0'),
  key('#3d6db6', '#ffd690', '#ffc982', 2.9, '#bcd0ee', '#6a5a44', 1.0, '#f8d9aa', 0, .8, .42, '#4a6f86'),
  key('#34387f', '#ff9a7c', '#ff7a55', 3.3, '#8a84c8', '#7a4a60', 1.25, '#e88a78', .1, .95, .17, '#4a3f6f'),
  key('#040a22', '#1c2f6c', '#a8bcff', 1.5, '#4a63b8', '#141c40', 1.15, '#1c2c66', 1, -.5, .62, '#0d1738')
];
const light = { zen: new THREE.Color(), hor: new THREE.Color(), sun: new THREE.Color(), hemiS: new THREE.Color(), hemiG: new THREE.Color(), fog: new THREE.Color(), water: new THREE.Color(), dir: new THREE.Vector3(), sunI: 1, hemiI: 1, star: 0 };
const lightAt = s => {
  const forced = root.dataset.theme === 'dark' ? 4 : root.dataset.theme === 'light' ? 0 : null;
  const v = forced ?? clamp(s, 0, LIGHT.length - 1);
  const i = Math.min(Math.floor(v), LIGHT.length - 2), t = sstep(0, 1, v - i), a = LIGHT[i], b = LIGHT[i + 1];
  ['zen', 'hor', 'sun', 'hemiS', 'hemiG', 'fog', 'water'].forEach(k => light[k].copy(a[k]).lerp(b[k], t));
  light.dir.copy(a.dir).lerp(b.dir, t).normalize();
  light.sunI = lerp(a.sunI, b.sunI, t); light.hemiI = lerp(a.hemiI, b.hemiI, t); light.star = lerp(a.star, b.star, t);
};

/* ---------------- build everything, a bit at a time ---------------- */
const canvas = $('#world');
const start = async () => {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, powerPreference: 'high-performance' }); }
  catch (e) { root.classList.add('no-gl'); canvas?.remove(); finish(); return; }
  let dpr = Math.min(devicePixelRatio || 1, small ? 1.25 : 1.5);
  renderer.setPixelRatio(dpr);
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xffffff, 170, 1800);
  const camera = new THREE.PerspectiveCamera(small ? 62 : 50, innerWidth / innerHeight, 1, 6000);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2); scene.add(sun);
  setLoad(.05); await breathe();

  /* sky */
  const skyU = { uZen: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uSunC: { value: new THREE.Color() }, uDir: { value: new THREE.Vector3() }, uStar: { value: 0 }, uT: { value: 0 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(5000, 32, 20), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: 'varying vec3 d;void main(){d=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `precision highp float;varying vec3 d;uniform vec3 uZen,uHor,uSunC,uDir;uniform float uStar,uT;
float h(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float a=fract(sin(dot(i,vec2(127.1,311.7)))*43758.5453),b=fract(sin(dot(i+vec2(1,0),vec2(127.1,311.7)))*43758.5453),c=fract(sin(dot(i+vec2(0,1),vec2(127.1,311.7)))*43758.5453),e=fract(sin(dot(i+vec2(1,1),vec2(127.1,311.7)))*43758.5453);return mix(mix(a,b,f.x),mix(c,e,f.x),f.y);}
float f(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*n(p);p=p*2.03+3.1;a*=.5;}return s;}
void main(){vec3 v=normalize(d);float y=max(v.y,0.);
  vec3 c=mix(uHor,uZen,pow(smoothstep(-.02,.62,y),.72));
  float s=max(dot(v,normalize(uDir)),0.);
  c+=uSunC*(pow(s,6.)*.22+pow(s,60.)*.35+smoothstep(.9988,.9994,s)*1.1);
  /* cirrus, painted on the dome */
  vec2 uv=v.xz/(v.y+.25);
  float cl=f(uv*vec2(.9,2.2)+vec2(uT*.006,0.));
  c=mix(c,mix(uHor,vec3(1.),.55)+uSunC*.12,smoothstep(.5,.78,cl)*smoothstep(.02,.32,y)*(1.-uStar*.8)*.7);
  if(uStar>.01){vec3 q=v*300.;vec3 g=floor(q);float r=h(g);c+=vec3(.92,.95,1.)*smoothstep(.985,1.,r)*smoothstep(.5,.1,length(fract(q)-.5))*uStar*(.6+.4*sin(uT*1.4+r*40.))*smoothstep(.02,.25,y);
    float mw=f(vec2(v.x*3.+v.z*2.,v.y*7.-v.x));c+=vec3(.16,.2,.34)*smoothstep(.45,.8,mw)*uStar*.5;}
  gl_FragColor=vec4(c,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`
  }));
  scene.add(sky);
  setLoad(.08); await breathe();

  /* ground */
  const W = 2600, D = 2900, NX = small ? 230 : 520, NZ = small ? 290 : 680, Z0 = -500;
  const g = new THREE.PlaneGeometry(W, D, NX, NZ);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  const heights = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / (W / 2), x = Math.sign(u) * Math.pow(Math.abs(u), 1.7) * (W / 2), z = pos.getZ(i) + D / 2 + Z0;
    const h = heightAt(x, z);
    pos.setXYZ(i, x, h, z); heights[i] = h;
    if (i % 16000 === 0) { setLoad(.08 + .42 * i / pos.count); await breathe(); }
  }
  g.computeVertexNormals();
  const nor = g.attributes.normal, cols = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const c = groundColor(pos.getX(i), pos.getY(i), pos.getZ(i), 1 - nor.getY(i));
    cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const groundMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  groundMat.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvW=(modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vW;
float dn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float a=fract(sin(dot(i,vec2(127.1,311.7)))*43758.5453),b=fract(sin(dot(i+vec2(1,0),vec2(127.1,311.7)))*43758.5453),c=fract(sin(dot(i+vec2(0,1),vec2(127.1,311.7)))*43758.5453),e=fract(sin(dot(i+vec2(1,1),vec2(127.1,311.7)))*43758.5453);return mix(mix(a,b,f.x),mix(c,e,f.x),f.y);}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{ float rk=smoothstep(.16,.42,vColor.b);
  float w=dn(vW.xz*.02)*6.;
  float strata=dn(vec2((vW.x+vW.z)*.012,vW.y*.28+w));
  float fine=dn(vec2((vW.x+vW.z)*.05,vW.y*1.3+w));
  float streak=dn(vec2((vW.x-vW.z)*.16,vW.y*.022));
  float crack=smoothstep(.05,.0,abs(dn(vec2((vW.x-vW.z)*.05,vW.y*.09))-.5));
  float rock=1.+(strata-.5)*.56+(fine-.5)*.3+(streak-.5)*.5-crack*.14;
  float gr=1.+(dn(vW.xz*.09)-.5)*.42+(dn(vW.xz*.5)-.5)*.28+(dn(vW.xz*2.1)-.5)*.2;
  diffuseColor.rgb*=mix(gr,rock,rk);
}`);
  };
  scene.add(new THREE.Mesh(g, groundMat));
  setLoad(.56); await breathe();

  /* the lake */
  const waterU = { uC: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uSunC: { value: new THREE.Color() }, uDir: { value: new THREE.Vector3() }, uT: { value: 0 }, uCam: { value: new THREE.Vector3() }, uFog: { value: new THREE.Color() } };
  const water = new THREE.Mesh(new THREE.PlaneGeometry(4200, 2600).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    uniforms: waterU, fog: false,
    vertexShader: 'varying vec3 w;void main(){vec4 p=modelMatrix*vec4(position,1.);w=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}',
    fragmentShader: `precision highp float;varying vec3 w;uniform vec3 uC,uHor,uSunC,uDir,uCam,uFog;uniform float uT;
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float a=fract(sin(dot(i,vec2(127.1,311.7)))*43758.5453),b=fract(sin(dot(i+vec2(1,0),vec2(127.1,311.7)))*43758.5453),c=fract(sin(dot(i+vec2(0,1),vec2(127.1,311.7)))*43758.5453),e=fract(sin(dot(i+vec2(1,1),vec2(127.1,311.7)))*43758.5453);return mix(mix(a,b,f.x),mix(c,e,f.x),f.y);}
void main(){vec3 v=normalize(uCam-w);
  vec2 q=w.xz*.42;float e=.7;float h0=n(q+uT*.25)+.5*n(q*2.3-uT*.4);
  vec3 N=normalize(vec3((n(q+vec2(e,0.)+uT*.25)-h0)*.14,1.,(n(q+vec2(0.,e)+uT*.25)-h0)*.14));
  float fr=pow(1.-max(dot(v,N),0.),3.);
  vec3 c=mix(uC,uHor,clamp(fr*.8,0.,.75));
  vec3 r=reflect(-normalize(uDir),N);c+=uSunC*pow(max(dot(r,v),0.),90.)*1.4;
  float d=length(uCam-w);c=mix(c,uFog,smoothstep(170.,1800.,d));
  gl_FragColor=vec4(c,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`
  }));
  water.position.set(0, -.4, -100);
  scene.add(water);

  /* firs */
  const treeN = small ? 4000 : 11000;
  const coneA = new THREE.ConeGeometry(1, 2.2, 6).translate(0, 1.5, 0), coneB = new THREE.ConeGeometry(.72, 1.9, 6).translate(0, 2.9, 0);
  const treeMat = new THREE.MeshLambertMaterial({ flatShading: true });
  const treeA = new THREE.InstancedMesh(coneA, treeMat, treeN), treeB = new THREE.InstancedMesh(coneB, treeMat, treeN);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  let placed = 0, tries = 0, seed = 1;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const treeC = new THREE.Color();
  while (placed < treeN && tries < treeN * 16) {
    tries++;
    const z = lerp(-60, 1420, rnd() * rnd() * .35 + rnd() * .65), x = routeX(z) + (rnd() - .5) * lerp(220, 1000, rnd());
    const h = heightAt(x, z);
    if (h < 3) continue;
    const slope = Math.abs(heightAt(x + 6, z) - h) / 6 + Math.abs(heightAt(x, z + 6) - h) / 6;
    if (slope > .85) continue;
    if (h > routeY(z) + 80 && rnd() < .7) continue;
    if (Math.hypot(x - ROCCA.x, z - ROCCA.z) < 74) continue;
    if (Math.abs(x - routeX(z)) < 30) continue;
    if (PADS.some(([px, pz, r]) => Math.hypot(x - px, z - pz) < r * 1.7)) continue;
    if (fbm(x * .012 + 5, z * .012, 2) < .33) continue; // clearings
    const sc = 1.9 + rnd() * rnd() * 3.6;
    M.compose(V.set(x, h - .4, z), Q.setFromAxisAngle(UP, rnd() * 6.28), S.set(sc * .85, sc * (1 + rnd() * .45), sc * .85));
    treeA.setMatrixAt(placed, M); treeB.setMatrixAt(placed, M);
    treeC.setHSL(.33 + rnd() * .07, .36 + rnd() * .2, .13 + rnd() * .09);
    treeA.setColorAt(placed, treeC); treeB.setColorAt(placed, treeC.multiplyScalar(1.15));
    placed++;
    if (placed % 1200 === 0) { setLoad(.56 + .18 * placed / treeN); await breathe(); }
  }
  treeA.count = treeB.count = placed;
  scene.add(treeA, treeB);
  setLoad(.76); await breathe();

  /* boulders and scree */
  const rockN = small ? 300 : 800;
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ flatShading: true }), rockN);
  let rp = 0; const rockC = new THREE.Color();
  for (let i = 0; i < rockN * 8 && rp < rockN; i++) {
    const z = lerp(180, 1560, rnd()), x = routeX(z) + (rnd() - .5) * 460, h = heightAt(x, z);
    if (h < 4 || PADS.some(([px, pz, r]) => Math.hypot(x - px, z - pz) < r)) continue;
    if (rnd() > sstep(250, 1100, z) * .55 + .1) continue;
    const sc = .7 + rnd() * rnd() * 5.5;
    M.compose(V.set(x, h, z), Q.set(rnd() - .5, rnd() - .5, rnd() - .5, rnd() - .5).normalize(), S.set(sc * (.7 + rnd() * .6), sc * (.5 + rnd() * .4), sc * (.7 + rnd() * .6)));
    rocks.setMatrixAt(rp, M); rockC.setHSL(.08 + rnd() * .03, .1 + rnd() * .1, .52 + rnd() * .24); rocks.setColorAt(rp, rockC); rp++;
  }
  rocks.count = rp; scene.add(rocks);

  /* the line: three conductors, sagging between pylons */
  const samples = []; const stopT = []; const SEG = 26;
  HEADS.forEach((h, i) => {
    if (i === HEADS.length - 1) return;
    const a = new THREE.Vector3(...h), b = new THREE.Vector3(...HEADS[i + 1]);
    for (let k = 0; k < SEG; k++) { const t = k / SEG, p = a.clone().lerp(b, t); p.y -= Math.sin(t * Math.PI) * (a.distanceTo(b) * .018); samples.push(p); }
  });
  samples.push(new THREE.Vector3(...HEADS[HEADS.length - 1]));
  const tAtHead = i => clamp((i * SEG) / (samples.length - 1));
  STOP_AT.forEach(i => stopT.push(tAtHead(i)));
  const lead = new THREE.Vector3(...HEADS[0]).add(new THREE.Vector3(-6, -14, -130));
  const curves = [-1, 0, 1].map(k => new THREE.CatmullRomCurve3([lead.clone(), ...samples].map(p => p.clone().add(new THREE.Vector3(k * 1.5, 0, 0))), false, 'centripetal'));
  const mainCurve = new THREE.CatmullRomCurve3(samples.map(p => p.clone()), false, 'centripetal');
  const stripeCanvas = document.createElement('canvas'); stripeCanvas.width = 64; stripeCanvas.height = 4;
  const sc2 = stripeCanvas.getContext('2d'); sc2.fillStyle = '#2f9150'; sc2.fillRect(0, 0, 64, 4); sc2.fillStyle = '#e8c518'; sc2.fillRect(0, 0, 26, 4);
  const stripe = new THREE.CanvasTexture(stripeCanvas); stripe.wrapS = THREE.RepeatWrapping; stripe.colorSpace = THREE.SRGBColorSpace; stripe.repeat.set(170, 1);
  const wireMats = [
    new THREE.MeshStandardMaterial({ color: '#8a5630', roughness: .35, metalness: .2 }),
    new THREE.MeshStandardMaterial({ map: stripe, roughness: .35, metalness: .2 }),
    new THREE.MeshStandardMaterial({ color: '#2559d8', roughness: .35, metalness: .2 })
  ];
  curves.forEach((c, i) => scene.add(new THREE.Mesh(new THREE.TubeGeometry(c, small ? 500 : 1000, .36, 6, false), wireMats[i])));
  setLoad(.84); await breathe();

  /* pylons: real lattice, standing on the ground */
  const struts = [];
  const strut = (a, b, w) => struts.push({ a, b, w });
  HEADS.forEach(h => {
    const [x, y, z] = h, gy = heightAt(x, z) - 2, H = y - gy, top = 2.2, foot = 2.2 + H * .09;
    const c = (sx, sz, t) => new THREE.Vector3(x + sx * lerp(top, foot, t), lerp(y - 1.4, gy, t), z + sz * lerp(top, foot, t));
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => strut(c(a, b, 0), c(a, b, 1), .5));
    const bays = Math.max(3, Math.round(H / 11));
    for (let i = 0; i < bays; i++) {
      const t0 = i / bays, t1 = (i + 1) / bays;
      [[[1, 1], [-1, 1]], [[-1, 1], [-1, -1]], [[-1, -1], [1, -1]], [[1, -1], [1, 1]]].forEach(([p, q]) => {
        strut(c(p[0], p[1], t1), c(q[0], q[1], t1), .22);
        strut(i % 2 ? c(p[0], p[1], t0) : c(q[0], q[1], t0), i % 2 ? c(q[0], q[1], t1) : c(p[0], p[1], t1), .16);
      });
    }
    strut(new THREE.Vector3(x - 5.5, y - .8, z), new THREE.Vector3(x + 5.5, y - .8, z), .55);
    strut(new THREE.Vector3(x - 3, y - 3, z), new THREE.Vector3(x + 3, y - 3, z), .4);
  });
  const steel = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#39434d', roughness: .55, metalness: .6 }), struts.length);
  const Y = new THREE.Vector3(0, 0, 1), D3 = new THREE.Vector3();
  struts.forEach((s, i) => {
    D3.copy(s.b).sub(s.a); const l = D3.length();
    Q.setFromUnitVectors(Y, D3.normalize());
    M.compose(V.copy(s.a).add(s.b).multiplyScalar(.5), Q, S.set(s.w, s.w, l));
    steel.setMatrixAt(i, M);
  });
  scene.add(steel);

  const boats = [], fans = [], rgb = [], signals = [], prints = []; let screenAnim = null;
  /* ---------------- what stands at each stop ---------------- */
  const hot = []; // things you can press in the world
  const addHot = (obj, hash, label, w, h, d) => {
    const proxy = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false }));
    proxy.position.y = h / 2; proxy.userData = { hash, label }; obj.add(proxy); hot.push(proxy);
  };
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .55, metalness: .25, ...o });
  const flat = color => new THREE.MeshLambertMaterial({ color, flatShading: true });
  const part = (parent, geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  const place = (g, x, z, ry = 0, s = 1) => { g.position.set(x, heightAt(x, z) - .4, z); g.rotation.y = ry; g.scale.setScalar(s); scene.add(g); return g; };
  const blink = []; // things that switch on and off

  /* the Rocca di Angera, from the photograph: the square tower, the palace round its courtyard, the battlemented wall */
  {
    const wallTex = (a, b) => {
      const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
      x.fillStyle = a; x.fillRect(0, 0, 256, 256);
      for (let r = 0; r < 16; r++) for (let k = -1; k < 12; k++) {
        const w = 22 + rnd() * 14, X = k * 26 + (r % 2) * 13, Y = r * 16;
        x.fillStyle = rnd() < .5 ? b : `rgba(${rnd() < .5 ? '255,245,225' : '70,55,40'},${.08 + rnd() * .16})`;
        x.fillRect(X, Y, w - 1.5, 14.5);
      }
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
    };
    const roofTex = (() => {
      const c = document.createElement('canvas'); c.width = 128; c.height = 128; const x = c.getContext('2d');
      x.fillStyle = '#b4552e'; x.fillRect(0, 0, 128, 128);
      for (let r = 0; r < 8; r++) { x.fillStyle = 'rgba(70,25,10,.5)'; x.fillRect(0, r * 16, 128, 2); for (let k = 0; k < 8; k++) { x.fillStyle = `rgba(${rnd() < .5 ? '255,190,140' : '60,20,5'},${rnd() * .28})`; x.fillRect(k * 16 + (r % 2) * 8, r * 16 + 2, 15, 14); } }
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    const stoneT = wallTex('#d8c6a6', 'rgba(205,184,150,.8)'), stoneD = wallTex('#b5a488', 'rgba(150,136,112,.85)');
    const mS = new THREE.MeshLambertMaterial({ map: stoneT }), mD = new THREE.MeshLambertMaterial({ map: stoneD }), mR = new THREE.MeshLambertMaterial({ map: roofTex, flatShading: true });
    const mDark = new THREE.MeshLambertMaterial({ color: '#2a2622' });
    const R = new THREE.Group();
    const wall = (w, h, d, x, y, z, m = mS) => { const g = new THREE.BoxGeometry(w, h, d); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.max(w, d) / 14, uv.getY(i) * h / 14); return part(R, g, m, x, y + h / 2, z); };
    const hipped = (w, h, d, x, y, z) => { const s = new THREE.Mesh(new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4), mR); s.scale.set(w, h, d); s.position.set(x, y + h / 2, z); R.add(s); };
    const gable = (w, h, d, x, y, z) => { // a long pitched roof
      const sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(0, h); sh.lineTo(w / 2, 0); sh.closePath();
      const g = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false }).translate(0, 0, -d / 2);
      part(R, g, mR, x, y, z);
    };
    const holes = [], merlons = [];
    const wins = (x, y, z, n, dx, dz, w = 1.3, h = 2.4) => { for (let i = 0; i < n; i++) holes.push([x + dx * i, y, z + dz * i, w, h, Math.abs(dz) > Math.abs(dx) ? 1 : 0]); };
    const crenel = (x0, z0, x1, z1, y) => { const L = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(L / 3); for (let i = 0; i <= n; i++) merlons.push([lerp(x0, x1, i / n), y, lerp(z0, z1, i / n)]); };
    /* great tower */
    wall(12, 42, 12, 24, 0, -12); hipped(16, 7, 16, 24, 42, -12);
    wall(13, 1.2, 13, 24, 37, -12, mD);
    wins(24, 30, -18.2, 1, 0, 0); wins(24, 22, -18.2, 1, 0, 0); wins(24, 13, -18.2, 1, 0, 0);
    wins(17.8, 34, -12, 1, 0, 0, 1.3, 3); wins(17.8, 24, -12, 1, 0, 0);
    /* the palace round the courtyard */
    wall(34, 21, 11, -2, 0, -13); gable(12.6, 6.5, 36, 0, 0, 0); R.children[R.children.length - 1].rotation.y = Math.PI / 2; R.children[R.children.length - 1].position.set(-2, 21, -13);
    wins(-14, 15, -18.7, 7, 4, 0); wins(-14, 8, -18.7, 7, 4, 0);
    wall(11, 18, 30, 12, 0, 8, mD); gable(12.4, 5.5, 31, 12, 18, 8);
    wall(11, 24, 28, -24, 0, 2); gable(12.4, 6.5, 29, -24, 24, 2);
    wins(-29.7, 17, -8, 6, 0, 3.6); wins(-29.7, 9, -8, 6, 0, 3.6);
    /* the arcade on the courtyard */
    const arch = new THREE.CylinderGeometry(1.9, 1.9, 1.2, 12, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2);
    for (let i = 0; i < 4; i++) { const x = -11 + i * 5.4; part(R, new THREE.BoxGeometry(3.8, 4.4, 1.2), mDark, x, 2.2, -7.4); part(R, arch, mDark, x, 4.4, -7.4); }
    /* the battlemented outer wall and its towers */
    wall(62, 13, 3.4, -2, 0, 26, mD); wall(3.4, 13, 42, 28, 0, 6, mD); wall(3.4, 13, 22, -32, 0, 16, mD);
    crenel(-31, 26, 27, 26, 13); crenel(28, 26, 28, -14, 13); crenel(-32, 26, -32, 6, 13);
    wall(9, 24, 9, -33, 0, 26); crenel(-37, 30, -29, 30, 24); crenel(-37, 22, -29, 22, 24); crenel(-37, 22, -37, 30, 24); crenel(-29, 22, -29, 30, 24);
    wall(7, 18, 7, 29, 0, 26); crenel(26, 29, 32, 29, 18);
    part(R, new THREE.BoxGeometry(3, 5, .8), mDark, -33, 2.5, 30.8);
    /* windows and merlons */
    const winM = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mDark, holes.length);
    holes.forEach((h, i) => { M.compose(V.set(h[0], h[1], h[2]), Q.identity(), S.set(h[5] ? .4 : h[3], h[4], h[5] ? h[3] : .4)); winM.setMatrixAt(i, M); });
    R.add(winM);
    const merM = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 2, 1.6), mD, merlons.length);
    merlons.forEach((p, i) => { M.compose(V.set(p[0], p[1] + 1, p[2]), Q.identity(), S.set(1, 1, 1)); merM.setMatrixAt(i, M); });
    R.add(merM);
    place(R, ROCCA.x, ROCCA.z, -.42, 1.25);
    addHot(R, '#about', 'About', 70, 50, 62);
  }

  /* lake: the drum the line was unwound from, and boats */
  {
    const drum = new THREE.Group();
    const wood = flat('#a7713f');
    [-5.5, 5.5].forEach(z => part(drum, new THREE.CylinderGeometry(9, 9, 1, 20).rotateX(Math.PI / 2), wood, 0, 9, z));
    part(drum, new THREE.CylinderGeometry(4.5, 4.5, 10, 16).rotateX(Math.PI / 2), flat('#7d5531'), 0, 9, 0);
    [['#8a5630', -3.3], ['#2f9150', 0], ['#2559d8', 3.3]].forEach(([c, z]) => { for (let r = 0; r < 3; r++) part(drum, new THREE.TorusGeometry(5.4 + r * 1.1, .62, 8, 28), std(c, { roughness: .35 }), 0, 9, z + (r % 2) * .4); });
    place(drum, -104, 214, .5, 1.1);
    addHot(drum, '#skills', 'What I can do', 22, 20, 18);
    const boat = (x, z, c) => {
      const b = new THREE.Group();
      const hullS = new THREE.Shape(); hullS.moveTo(-4, 0); hullS.quadraticCurveTo(0, 1.6, 4, 0); hullS.quadraticCurveTo(0, -1.6, -4, 0);
      part(b, new THREE.ExtrudeGeometry(hullS, { depth: 1.2, bevelEnabled: false }).rotateX(Math.PI / 2).translate(0, 1.1, 0), flat('#f3f1ea'));
      part(b, new THREE.BoxGeometry(.2, 11, .2), flat('#4b4238'), .3, 6, 0);
      const sail = new THREE.Shape(); sail.moveTo(0, 0); sail.lineTo(4.4, 0); sail.lineTo(0, 9); sail.closePath();
      const s = new THREE.Mesh(new THREE.ExtrudeGeometry(sail, { depth: .05, bevelEnabled: false }), new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide })); s.position.set(.4, 1.8, 0); b.add(s);
      b.position.set(x, -.2, z); b.rotation.y = rnd() * 3; scene.add(b); boats.push(b);
    };
    boat(-46, -40, '#f5efe2'); boat(66, -8, '#e0523f'); boat(-120, 4, '#f5efe2'); boat(-14, -96, '#f0c848');
  }

  /* forest, where the first job was: the distribution board, standing in its clearing, conductors running in */
  {
    const b = new THREE.Group();
    part(b, new THREE.BoxGeometry(30, 38, 5), std('#e6e6df', { roughness: .4 }), 0, 19, 0);
    part(b, new THREE.BoxGeometry(27, 35, .4), std('#c9cac2'), 0, 19, -2.6);
    [10, 0, -10].forEach((dy, row) => {
      part(b, new THREE.BoxGeometry(25, 2, .5), std('#8e9398', { metalness: .7 }), 0, 19 + dy, -3);
      for (let i = 0; i < 7; i++) {
        const x = -10.8 + i * 3.6, y = 19 + dy;
        part(b, new THREE.BoxGeometry(3.1, 7.5, 2), std('#f4f4ee', { roughness: .35 }), x, y, -3.6);
        const on = rnd() > .2;
        part(b, new THREE.BoxGeometry(1.5, 2, 1.1), std(i === 3 && row === 1 ? '#d42a20' : '#23282d'), x, y + (on ? .7 : -.7), -4.9);
        const led = new THREE.MeshBasicMaterial({ color: on ? '#5fdc8b' : '#ff5f3f', fog: false });
        part(b, new THREE.BoxGeometry(.5, .5, .2), led, x, y - 2.8, -4.7);
        if (rnd() < .3) blink.push({ m: led, a: new THREE.Color('#5fdc8b'), b: new THREE.Color('#0d2a18'), t: rnd() * 6, s: .6 + rnd() * 1.4 });
      }
    });
    /* the conductors arc from the top of the board up toward the line */
    [['#8a5630', -6], ['#2f9150', 0], ['#2559d8', 6]].forEach(([c, x]) => {
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(x, 38, 0), new THREE.Vector3(x + 8, 50, 8), new THREE.Vector3(x + 26, 38, 2), new THREE.Vector3(x + 40, 7, -6)]);
      part(b, new THREE.TubeGeometry(curve, 30, .9, 8), std(c, { roughness: .35 }));
    });
    /* a workman's toolbox and a ladder, because that is where it started */
    part(b, new THREE.BoxGeometry(7, 3.4, 3.6), std('#d42a20'), -24, 1.7, -8);
    part(b, new THREE.BoxGeometry(.5, 26, .5), flat('#c9a34d'), 19, 13, -6); part(b, new THREE.BoxGeometry(.5, 26, .5), flat('#c9a34d'), 22.4, 13, -6);
    for (let i = 0; i < 9; i++) part(b, new THREE.BoxGeometry(3.4, .35, .35), flat('#c9a34d'), 20.7, 2.5 + i * 2.8, -6);
    place(b, ...STAND.board, .2, 1);
    addHot(b, '#cv', 'Experience', 46, 44, 20);
  }

  /* meadow: the homelab. One server rack, and about fifty containers on the grass, each one awake */
  {
    const g = new THREE.Group();
    const rack = new THREE.Group();
    part(rack, new THREE.BoxGeometry(17, 42, 13), std('#171c22', { metalness: .6, roughness: .4 }), 0, 21, 0);
    for (let i = 0; i < 9; i++) {
      const y = 4.6 + i * 4.2;
      part(rack, new THREE.BoxGeometry(15, 3.5, .4), std(i % 3 === 0 ? '#2d3540' : '#242b33', { metalness: .7 }), 0, y, -6.6);
      for (let k = 0; k < 8; k++) {
        const col = ['#5fdc8b', '#ffc66d', '#8fb4ff'][(i + k) % 3];
        const m = new THREE.MeshBasicMaterial({ color: col, fog: false });
        part(rack, new THREE.BoxGeometry(.6, .6, .2), m, -6 + k * 1.1, y + .5, -6.85);
        blink.push({ m, a: new THREE.Color(col), b: new THREE.Color('#10161c'), t: rnd() * 6, s: 1.2 + rnd() * 5 });
      }
      part(rack, new THREE.BoxGeometry(4.6, 1.4, .2), new THREE.MeshBasicMaterial({ color: '#0b0f14' }), 4.6, y - .4, -6.85);
    }
    g.add(rack);
    /* 49 containers: the same number the scrape lines in the log report */
    const colors = ['#c5552a', '#2c6fb0', '#2f9150', '#d9a735', '#8a5630', '#b8bec4'];
    const boxG = new THREE.BoxGeometry(5.2, 2.8, 2.6);
    const inst = new THREE.InstancedMesh(boxG, new THREE.MeshStandardMaterial({ roughness: .6, metalness: .3 }), 49);
    const rc = new THREE.Color();
    for (let i = 0; i < 49; i++) {
      const col = i % 7, row = Math.floor(i / 7), lay = (col + row) % 3;
      M.compose(V.set(14 + col * 6, 1.4 + lay * 2.85, -8 + row * 3.4), Q.identity(), S.set(1, 1, 1));
      inst.setMatrixAt(i, M); inst.setColorAt(i, rc.set(colors[i % colors.length]));
    }
    g.add(inst);
    place(g, ...STAND.rack, -.3, 1);
    addHot(g, '#lab', 'Homelab', 72, 44, 40);
  }

  /* the walls: what he builds. The smart home, with rooms switching on, and a custom PC the size of a house */
  {
    const h = new THREE.Group();
    part(h, new THREE.BoxGeometry(26, 13, 18), flat('#efe7d8'), 0, 6.5, 0);
    const rf = new THREE.Shape(); rf.moveTo(-15, 0); rf.lineTo(0, 9); rf.lineTo(15, 0); rf.closePath();
    part(h, new THREE.ExtrudeGeometry(rf, { depth: 22, bevelEnabled: false }).translate(0, 13, -11), flat('#4a3b35'));
    const lit = (x, y, z, w, hh, ry = 0) => {
      const m = new THREE.MeshBasicMaterial({ color: '#ffd27a', fog: false });
      const p = part(h, new THREE.PlaneGeometry(w, hh), m, x, y, z); p.rotation.y = ry;
      blink.push({ m, a: new THREE.Color('#ffd98c'), b: new THREE.Color('#2a2c3c'), t: rnd() * 8, s: .35 + rnd() * .3, slow: true });
    };
    [-8, 0, 8].forEach(x => { lit(x, 9.4, -9.05, 4.4, 4, Math.PI); lit(x, 3.6, -9.05, 4.4, 4.2, Math.PI); });
    lit(-13.05, 6, -3, 4, 4.4, -Math.PI / 2); lit(-13.05, 6, 4, 4, 4.4, -Math.PI / 2);
    /* solar on the roof, a camera, the panel */
    const solar = part(h, new THREE.BoxGeometry(12, .3, 7), std('#142a55', { metalness: .8, roughness: .25 }), -6, 18.1, -5.6); solar.rotation.x = -.54;
    part(h, new THREE.BoxGeometry(.5, 8, .5), flat('#3b3f44'), 11, 26, 3);
    part(h, new THREE.BoxGeometry(2.4, 1, 1), std('#e8e8e8'), -13.6, 12, -9.8);
    place(h, ...STAND.house, .32, 1);
    addHot(h, '#easydomotica', 'Easydomotica', 34, 28, 26);

    const pc = new THREE.Group();
    part(pc, new THREE.BoxGeometry(20, 42, 34), std('#101317', { metalness: .7, roughness: .3 }), 0, 21, 0);
    const glassP = part(pc, new THREE.PlaneGeometry(32, 40), new THREE.MeshBasicMaterial({ color: '#0a0f18', fog: false }), -10.05, 21, 0); glassP.rotation.y = -Math.PI / 2;
    const rings = [];
    [[-10.2, 33, -10], [-10.2, 21, -10], [-10.2, 9, -10]].forEach(p => {
      const col = new THREE.Color('#5c8cff');
      const m = new THREE.MeshBasicMaterial({ color: col, fog: false });
      const r = part(pc, new THREE.TorusGeometry(4.4, .42, 8, 30).rotateY(Math.PI / 2), m, ...p); rings.push(m);
      const blades = part(pc, new THREE.BoxGeometry(.2, 7.2, 1.2), new THREE.MeshBasicMaterial({ color: '#2a3442' }), ...p); fans.push(blades);
      const b2 = part(pc, new THREE.BoxGeometry(.2, 1.2, 7.2), new THREE.MeshBasicMaterial({ color: '#2a3442' }), ...p); fans.push(b2);
    });
    /* motherboard, cooler and the graphics card behind the glass */
    part(pc, new THREE.BoxGeometry(.3, 34, 22), new THREE.MeshBasicMaterial({ color: '#16232a' }), -9.6, 21, 7);
    part(pc, new THREE.BoxGeometry(2.6, 3.6, 18), std('#39424c', { metalness: .8 }), -10.4, 14, 8);
    const gpuLine = new THREE.MeshBasicMaterial({ color: '#ff5f7f', fog: false });
    part(pc, new THREE.BoxGeometry(.25, .7, 18), gpuLine, -11.8, 12.2, 8); rings.push(gpuLine);
    part(pc, new THREE.BoxGeometry(3.6, 7, 7), std('#596470', { metalness: .85 }), -10.6, 30, 8);
    rgb.push(...rings);
    place(pc, ...STAND.pc, -.72, 1);
    addHot(pc, '#pcsumisura', 'PC su Misura', 24, 44, 38);
  }

  /* the summit: the mast from the Col Alt photograph, a screen outside the hut, his photographs drying on the line */
  {
    const m = new THREE.Group();
    const white = flat('#f1efe8'), red = new THREE.MeshLambertMaterial({ color: '#d42a20', flatShading: true });
    for (let i = 0; i < 6; i++) part(m, new THREE.CylinderGeometry(1.5 - i * .1, 1.7 - i * .1, 6.4, 10), i % 2 ? white : red, 0, 3.2 + i * 6.4, 0);
    [[3, 22], [-3, 28], [3, 34]].forEach(([x, y]) => part(m, new THREE.BoxGeometry(3.6, 4.4, 2.6), flat('#b7ac98'), x, y, 0));
    const beacon = new THREE.MeshBasicMaterial({ color: '#ff4a3a', fog: false });
    part(m, new THREE.SphereGeometry(.8, 10, 8), beacon, 0, 40, 0);
    blink.push({ m: beacon, a: new THREE.Color('#ff4a3a'), b: new THREE.Color('#2a0a08'), t: 0, s: 1.1 });
    place(m, ...STAND.mast, 0, 1);
    addHot(m, '#contact', 'Contact', 18, 46, 18);
    /* signal rings leaving the mast */
    for (let i = 0; i < 3; i++) {
      const r = new THREE.Mesh(new THREE.RingGeometry(.92, 1, 40), new THREE.MeshBasicMaterial({ color: '#ffc66d', transparent: true, opacity: .5, side: THREE.DoubleSide, depthWrite: false, fog: false, toneMapped: false }));
      r.position.set(STAND.mast[0], heightAt(STAND.mast[0], STAND.mast[1]) + 40, STAND.mast[1]); r.rotation.x = Math.PI / 2; r.userData.ph = i / 3; scene.add(r); signals.push(r);
    }

    /* a screen on the snow: the shell, running real commands */
    const scr = new THREE.Group();
    const sc = document.createElement('canvas'); sc.width = 512; sc.height = 300; const sx = sc.getContext('2d');
    const lines = ['guest@tb:~$ whoami', 'Tommaso Bombelli', 'guest@tb:~$ ls', 'about.txt  skills.txt  projects/', 'guest@tb:~$ nmap', '443/tcp  open   https', '22/tcp   filtered  ssh', 'guest@tb:~$ _'];
    const draw = n => {
      sx.fillStyle = '#0a111d'; sx.fillRect(0, 0, 512, 300); sx.font = '500 21px "JetBrains Mono", monospace';
      lines.slice(0, n).forEach((l, i) => { sx.fillStyle = l.startsWith('guest') ? '#ffc66d' : '#e6edf5'; sx.fillText(l, 20, 36 + i * 34); });
    };
    draw(lines.length);
    const scrT = new THREE.CanvasTexture(sc); scrT.colorSpace = THREE.SRGBColorSpace;
    screenAnim = { draw, tex: scrT, n: lines.length };
    part(scr, new THREE.BoxGeometry(27, 17, 1.4), std('#141a22', { metalness: .6 }), 0, 13, 0);
    const pl = part(scr, new THREE.PlaneGeometry(25, 14.6), new THREE.MeshBasicMaterial({ map: scrT, fog: false, toneMapped: false }), 0, 13, -.75); pl.rotation.y = Math.PI;
    part(scr, new THREE.BoxGeometry(1.6, 5, 1.6), flat('#3b3f44'), 0, 2.5, 0); part(scr, new THREE.BoxGeometry(9, .6, 5), flat('#3b3f44'), 0, .3, 0);
    place(scr, ...STAND.screen, -.52, 1);
    addHot(scr, '#shell-sec', 'Try the shell', 28, 22, 8);

    /* his photographs, pegged to a line of their own */
    const a = new THREE.Vector3(STAND.line[0], heightAt(STAND.line[0], STAND.line[1]) + 15, STAND.line[1]);
    const b = new THREE.Vector3(STAND.line[2], heightAt(STAND.line[2], STAND.line[3]) + 15, STAND.line[3]);
    [a, b].forEach(p => part(scene, new THREE.BoxGeometry(.6, 15, .6), flat('#4b4238'), p.x, p.y - 7.5, p.z));
    const mid = a.clone().add(b).multiplyScalar(.5); mid.y -= 2.4;
    const ropeC = new THREE.QuadraticBezierCurve3(a, mid, b);
    part(scene, new THREE.TubeGeometry(ropeC, 18, .1, 5), flat('#f1efe8'));
    fetch('content.json', { cache: 'no-cache' }).then(r => r.json()).then(d => {
      const photos = (d.photography || []).slice(0, 4), loader = new THREE.TextureLoader();
      photos.forEach((ph, i) => {
        loader.load(ph.thumb || ph.file, t => {
          t.colorSpace = THREE.SRGBColorSpace;
          const ar = (ph.width && ph.height) ? ph.width / ph.height : 1.4, H = ar < 1 ? 11 : 8, Wd = H * ar;
          const f = new THREE.Group();
          part(f, new THREE.BoxGeometry(Wd + 1, H + 1.4, .15), flat('#f8f4ea'), 0, -(H + 1.4) / 2, 0);
          const pic = part(f, new THREE.PlaneGeometry(Wd, H), new THREE.MeshBasicMaterial({ map: t, fog: false, toneMapped: false }), 0, -(H + 1.4) / 2 + .25, -.09); pic.rotation.y = Math.PI;
          ropeC.getPoint((i + 1) / (photos.length + 1), V); f.position.copy(V); f.rotation.y = -.6; f.userData.ph = i * 1.7;
          scene.add(f); prints.push(f);
          const px = new THREE.Mesh(new THREE.BoxGeometry(Wd + 1, H + 1.4, 1), new THREE.MeshBasicMaterial({ visible: false })); px.position.y = -(H + 1.4) / 2; px.userData = { hash: '#photography', label: 'Photography' }; f.add(px); hot.push(px);
        });
      });
    }).catch(() => {});
  }

  /* the hut on the summit, where the conductors land and the code lives */
  const top_ = HEADS[HEADS.length - 1], hut = new THREE.Group();
  const hutWall = new THREE.Mesh(new THREE.BoxGeometry(20, 10, 14), new THREE.MeshLambertMaterial({ color: '#6e5a48', flatShading: true })); hutWall.position.y = 5; hut.add(hutWall);
  const hutRoof = new THREE.Mesh(new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4), new THREE.MeshLambertMaterial({ color: '#2d3540', flatShading: true })); hutRoof.scale.set(24, 7, 18); hutRoof.position.y = 13.5; hut.add(hutRoof);
  const glow = new THREE.MeshBasicMaterial({ color: '#ffc66d', fog: false });
  [-5, 5].forEach(x => { const w = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), glow); w.position.set(x, 5.5, -7.05); w.rotation.y = Math.PI; hut.add(w); });
  hut.position.set(top_[0] + 2, heightAt(top_[0] + 2, top_[2] + 16) - .5, top_[2] + 16);
  scene.add(hut);

  /* cabins */
  const cabinShape = new THREE.Shape();
  cabinShape.moveTo(-1.1, 0); cabinShape.bezierCurveTo(-2.1, 0, -2.7, -.5, -2.9, -1.2); cabinShape.lineTo(-3.1, -4); cabinShape.bezierCurveTo(-3.1, -4.8, -2.7, -5.2, -2, -5.2);
  cabinShape.lineTo(2, -5.2); cabinShape.bezierCurveTo(2.7, -5.2, 3.1, -4.8, 3.1, -4); cabinShape.lineTo(2.9, -1.2); cabinShape.bezierCurveTo(2.7, -.5, 2.1, 0, 1.1, 0); cabinShape.closePath();
  const cabinGeo = new THREE.ExtrudeGeometry(cabinShape, { depth: 4.2, bevelEnabled: true, bevelSize: .28, bevelThickness: .28, bevelSegments: 3, curveSegments: 10 }).translate(0, 0, -2.1);
  const redMat = new THREE.MeshStandardMaterial({ color: '#d42a20', roughness: .28, metalness: .15 });
  const glassMat = new THREE.MeshStandardMaterial({ color: '#bcd9e8', roughness: .05, metalness: .4, emissive: '#ffc877', emissiveIntensity: 0 });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#1b242c', roughness: .6, metalness: .5 });
  const makeCabin = scale => {
    const c = new THREE.Group(), body = new THREE.Group();
    body.add(new THREE.Mesh(cabinGeo, redMat));
    const band = new THREE.Mesh(new THREE.BoxGeometry(5.5, 1.9, 5), glassMat); band.position.y = -2.1; body.add(band);
    const band2 = new THREE.Mesh(new THREE.BoxGeometry(6.6, 1.9, 3.3), glassMat); band2.position.y = -2.1; body.add(band2);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(.3, 3.2, .3), darkMat); arm.position.y = 1.5; body.add(arm);
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.2, .4, 1.6), darkMat); top.position.y = .28; body.add(top);
    const gripG = new THREE.Group(); gripG.position.y = 3.3; c.add(gripG); c.userData.grip = gripG;
    gripG.add(new THREE.Mesh(new THREE.BoxGeometry(4.2, .4, 3.8), darkMat)); // the clamp holds all three conductors
    [-1.4, 1.4].forEach(z => { const w = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, 3.8, 14).rotateZ(Math.PI / 2), darkMat); w.position.set(0, .62, z); gripG.add(w); });
    const hanger = new THREE.Mesh(new THREE.BoxGeometry(.5, 1.2, .5), darkMat); hanger.position.y = -.7; gripG.add(hanger);
    body.position.y = 0; c.add(body); c.userData.body = body;
    c.scale.setScalar(scale);
    return c;
  };
  const cabin = makeCabin(1.15); scene.add(cabin);
  const others = [.14, .38, .62, .86].map(u => { const c = makeCabin(1); c.userData.u = u; scene.add(c); return c; });
  setLoad(.92); await breathe();

  /* signals along the conductors: copper at the bottom, data at the top */
  const pulseN = small ? 36 : 72;
  const dot = document.createElement('canvas'); dot.width = dot.height = 64;
  const dc = dot.getContext('2d'), dg = dc.createRadialGradient(32, 32, 0, 32, 32, 32);
  dg.addColorStop(0, 'rgba(255,255,255,1)'); dg.addColorStop(.25, 'rgba(255,255,255,.65)'); dg.addColorStop(1, 'rgba(255,255,255,0)');
  dc.fillStyle = dg; dc.fillRect(0, 0, 64, 64);
  const dotTex = new THREE.CanvasTexture(dot);
  const pGeo = new THREE.BufferGeometry(), pPos = new Float32Array(pulseN * 3), pCol = new Float32Array(pulseN * 3);
  const pulses = [];
  const WIRECOL = [new THREE.Color('#ff9a54'), new THREE.Color('#ffe25a'), new THREE.Color('#6da2ff')];
  for (let i = 0; i < pulseN; i++) { const w = i % 3; pulses.push({ w, u: rnd(), v: .012 + rnd() * .02 }); WIRECOL[w].toArray(pCol, i * 3); }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  const pMat = new THREE.PointsMaterial({ size: 5, map: dotTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: false, toneMapped: false });
  const points = new THREE.Points(pGeo, pMat); points.frustumCulled = false; scene.add(points);

  /* clouds and mist */
  const cl = document.createElement('canvas'); cl.width = cl.height = 256;
  const cc = cl.getContext('2d'); cc.clearRect(0, 0, 256, 256);
  for (let i = 0; i < 70; i++) {
    const a = rnd() * 6.28, r = rnd() * 78, x = 128 + Math.cos(a) * r * 1.2, y = 128 + Math.sin(a) * r * .55, R = 18 + rnd() * 34;
    const gr = cc.createRadialGradient(x, y, 0, x, y, R); gr.addColorStop(0, 'rgba(255,255,255,.2)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    cc.fillStyle = gr; cc.beginPath(); cc.arc(x, y, R, 0, 7); cc.fill();
  }
  const clTex = new THREE.CanvasTexture(cl);
  const clouds = [];
  for (let i = 0; i < (small ? 10 : 22); i++) {
    const m = new THREE.SpriteMaterial({ map: clTex, transparent: true, depthWrite: false, opacity: .55 + rnd() * .3, fog: false });
    const sp = new THREE.Sprite(m), z = 60 + rnd() * 1500, side = (rnd() < .5 ? -1 : 1) * (60 + rnd() * 500);
    sp.position.set(routeX(z) + side, routeY(z) + 30 + rnd() * 120, z);
    const s = 200 + rnd() * 340; sp.scale.set(s, s * .42, 1);
    sp.userData.v = 1.2 + rnd() * 2.2; clouds.push(sp); scene.add(sp);
  }

  /* the frame at each stop, relative to the cabin */
  const FRAMES = small ? [
    { o: [30, 8, -210], l: [-6, 52, 200] }, { o: [-22, 6, -50], l: [10, 40, 120] }, { o: [24, 6, -56], l: [-8, 44, 120] },
    { o: [-22, 6, -62], l: [10, 62, 140] }, { o: [26, 12, -54], l: [-10, 16, 90] }
  ] : [
    { o: [54, 9, -250], l: [-6, 52, 200] }, { o: [-50, 5, -62], l: [36, 44, 140] }, { o: [54, 6, -66], l: [-36, 46, 150] },
    { o: [-52, 4, -74], l: [46, 66, 180] }, { o: [58, 14, -62], l: [-44, 20, 90] }
  ];
  const lerpFrame = (s, key, out) => {
    const i = Math.min(Math.floor(s), FRAMES.length - 2), t = sstep(0, 1, s - i), a = FRAMES[i][key], b = FRAMES[i + 1][key];
    return out.set(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t));
  };

  /* opening a page flies to the thing it talks about, and leaves it in view beside the sheet */
  const at = (k, y = 14) => new THREE.Vector3(STAND[k][0], heightAt(STAND[k][0], STAND[k][1]) + y, STAND[k][1]);
  const FOCUS = {
    about: { stop: 0, at: new THREE.Vector3(ROCCA.x, heightAt(ROCCA.x, ROCCA.z) + 20, ROCCA.z), from: [-12, 14, -128] },
    cv: { stop: 1, at: at('board', 20), from: [-6, 6, -84] },
    skills: { stop: 2, at: at('rack', 18), from: [18, 10, -104] },
    lab: { stop: 2, at: at('rack', 20), from: [-8, 6, -72] },
    projects: { stop: 3, at: at('house', 14).lerp(at('pc', 14), .5), from: [10, 18, -130] },
    easydomotica: { stop: 3, at: at('house', 11), from: [-4, 8, -58] },
    pcsumisura: { stop: 3, at: at('pc', 22), from: [-22, 2, -84] },
    photography: { stop: 4, at: new THREE.Vector3(94, heightAt(94, 1530) + 9, 1530), from: [6, 3, -34] },
    terminal: { stop: 4, at: at('screen', 12), from: [-8, 3, -44] },
    contact: { stop: 4, at: at('mast', 24), from: [-8, -4, -96] }
  };
  let focus = null, focusK = 0; const fCam = new THREE.Vector3(), fLook = new THREE.Vector3();

  /* ---------------- scrolling drives the ride ---------------- */
  const stops = $$('.stop'), lineCabin = $('.line__cabin'), lineLinks = $$('.line a');
  let target = 0, ride = 0, pageOpen = root.classList.contains('has-page');
  const readScroll = () => {
    const max = Math.max(1, root.scrollHeight - innerHeight);
    target = clamp(scrollY / max) * (stops.length - 1);
  };
  addEventListener('scroll', readScroll, { passive: true }); readScroll(); ride = target;
  addEventListener('page-change', e => { pageOpen = e.detail.open; if (e.detail.id && FOCUS[e.detail.id]) focus = FOCUS[e.detail.id]; });

  const tOf = s => {
    const i = Math.min(Math.floor(s), stopT.length - 2), f = s - i;
    /* it waits at the station for a moment, then runs */
    return lerp(stopT[i], stopT[i + 1], sstep(.08, .92, f));
  };

  /* the mouse moves the eye */
  let mx = 0, my = 0, ex = 0, ey = 0;
  addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { mx = e.clientX / innerWidth * 2 - 1; my = e.clientY / innerHeight * 2 - 1; } }, { passive: true });

  const P = new THREE.Vector3(), P2 = new THREE.Vector3(), camP = new THREE.Vector3(), lookP = new THREE.Vector3(), off = new THREE.Vector3(), look = new THREE.Vector3();
  let swing = 0, swingV = 0, lastT = tOf(ride), frameN = 0, last = performance.now(), slow = 0, activeStop = -1;

  const applyLight = () => {
    lightAt(ride);
    skyU.uZen.value.copy(light.zen); skyU.uHor.value.copy(light.hor); skyU.uSunC.value.copy(light.sun); skyU.uDir.value.copy(light.dir); skyU.uStar.value = light.star;
    sun.color.copy(light.sun); sun.intensity = light.sunI; sun.position.copy(light.dir).multiplyScalar(1000);
    hemi.color.copy(light.hemiS); hemi.groundColor.copy(light.hemiG); hemi.intensity = light.hemiI;
    scene.fog.color.copy(light.fog);
    waterU.uC.value.copy(light.water); waterU.uHor.value.copy(light.hor); waterU.uSunC.value.copy(light.sun); waterU.uDir.value.copy(light.dir); waterU.uFog.value.copy(light.fog);
    glassMat.emissiveIntensity = light.star * 1.8;
    pMat.opacity = lerp(.55, 1, light.star); pMat.size = lerp(4.5, 6.5, light.star);
    const c = 1 - light.star * .86;
    clouds.forEach(sp => { sp.material.color.copy(light.fog).lerp(light.sun, .25); sp.material.opacity = (sp.userData.o ??= sp.material.opacity) * c; });
  };

  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  const tip = $('.hot-tip'); let hover = null;
  const pick = (cx, cy) => {
    if (pageOpen) return null;
    ptr.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    return ray.intersectObjects(hot, false)[0]?.object || null;
  };
  addEventListener('pointermove', e => {
    if ((e.pointerType && e.pointerType !== 'mouse') || e.target !== canvasHit(e)) { if (hover) { hover = null; tip?.classList.remove('is-on'); root.classList.remove('over-world'); } return; }
    hover = pick(e.clientX, e.clientY);
    root.classList.toggle('over-world', !!hover);
    if (tip) { tip.classList.toggle('is-on', !!hover); if (hover) { tip.textContent = hover.userData.label; tip.style.transform = `translate(${e.clientX + 16}px, ${e.clientY + 18}px)`; } }
  }, { passive: true });
  const canvasHit = e => e.target.closest?.('a, button, input, .nav, .line, .stop__copy, .roles') ? null : e.target;
  addEventListener('click', e => {
    if (canvasHit(e) !== e.target) return;
    const h = pick(e.clientX, e.clientY);
    if (h) location.hash = h.userData.hash;
  });

  const render = now => {
    requestAnimationFrame(render);
    if (document.hidden) { last = now; return; }
    const dt = Math.min((now - last) / 1000, .1); last = now; frameN++;
    const goal = pageOpen && focus ? focus.stop : target;
    if (pageOpen && focusK > .995 && Math.abs(goal - ride) < .002 && frameN % 2) return; // settled behind the sheet: half rate
    ride += (goal - ride) * (reduce ? 1 : 1 - Math.pow(.05, dt));
    focusK += ((pageOpen && focus ? 1 : 0) - focusK) * (reduce ? 1 : 1 - Math.pow(.03, dt));
    const T = reduce ? 12 : now / 1000;

    /* main cabin, plumb under its grip, swinging when it brakes */
    const t = tOf(ride);
    mainCurve.getPoint(t, P); mainCurve.getPoint(Math.min(t + .002, 1), P2);
    cabin.position.copy(P); cabin.position.y -= 3.05 * 1.15;
    cabin.userData.grip.rotation.x = -Math.atan2(P2.y - P.y, Math.hypot(P2.x - P.x, P2.z - P.z));
    cabin.rotation.y = Math.atan2(P2.x - P.x, P2.z - P.z);
    const vel = (t - lastT) / Math.max(dt, .001); lastT = t;
    if (!reduce) { swingV += (-swing * 16 - swingV * 2.6 + vel * 14) * dt; swing += swingV * dt; }
    cabin.userData.body.rotation.x = clamp(swing, -.3, .3);

    /* the others keep running */
    others.forEach(c => {
      const u = (c.userData.u + (reduce ? 0 : T * .006)) % 1;
      mainCurve.getPoint(u, P2); c.position.copy(P2); c.position.y -= 3.05;
      mainCurve.getPoint(Math.min(u + .002, 1), V); c.rotation.y = Math.atan2(V.x - P2.x, V.z - P2.z);
      c.userData.grip.rotation.x = -Math.atan2(V.y - P2.y, Math.hypot(V.x - P2.x, V.z - P2.z));
    });

    /* signals */
    if (!reduce) pulses.forEach((p, i) => {
      p.u = (p.u + p.v * dt) % 1;
      mainCurve.getPoint(p.u, P2);
      pPos[i * 3] = P2.x + (p.w - 1) * 1.5; pPos[i * 3 + 1] = P2.y + .6; pPos[i * 3 + 2] = P2.z;
    });
    pGeo.attributes.position.needsUpdate = true;

    if (!reduce) {
      blink.forEach(b => {
        const on = b.slow ? Math.sin(T * b.s + b.t) > -.35 : Math.sin(T * b.s * 3 + b.t) + Math.sin(T * b.s * 7.3 + b.t * 2) > -.4;
        b.m.color.copy(on ? b.a : b.b);
      });
      boats.forEach((b, i) => { b.position.y = -.2 + Math.sin(T * .9 + i) * .22; b.rotation.z = Math.sin(T * .7 + i * 2) * .05; b.position.x += Math.sin(T * .05 + i) * .012; });
      fans.forEach(f => { f.rotation.x = T * 2.6; });
      rgb.forEach((m, i) => m.color.setHSL((T * .05 + i * .09) % 1, .9, .6));
      signals.forEach(r => { const p = (T * .28 + r.userData.ph) % 1, sc = 3 + p * 52; r.scale.set(sc, sc, sc); r.material.opacity = (1 - p) * .55; });
      prints.forEach(f => { f.rotation.z = Math.sin(T * 1.1 + f.userData.ph) * .05; });
      if (screenAnim) { const n = 1 + Math.floor(T * .9) % (8 + 3); if (n !== screenAnim.n) { screenAnim.n = n; screenAnim.draw(Math.min(n, 8)); screenAnim.tex.needsUpdate = true; } }
    }

    clouds.forEach(sp => { if (!reduce) { sp.position.x += sp.userData.v * dt; if (sp.position.x > 1100) sp.position.x = -1100; } });

    /* camera */
    ex += (mx - ex) * (1 - Math.pow(.02, dt)); ey += (my - ey) * (1 - Math.pow(.02, dt));
    lerpFrame(ride, 'o', off); lerpFrame(ride, 'l', look);
    camP.copy(P).add(off); camP.x += ex * 12; camP.y -= ey * 6;
    const groundHere = heightAt(camP.x, camP.z) + 6; if (camP.y < groundHere) camP.y = groundHere;
    lookP.copy(P).add(look); lookP.x += ex * 22; lookP.y -= ey * 10;
    if (focusK > .001 && focus) {
      fCam.copy(focus.at).add(V.set(...focus.from)); fCam.x += ex * 4; fCam.y -= ey * 2;
      const gh = heightAt(fCam.x, fCam.z) + 4; if (fCam.y < gh) fCam.y = gh;
      /* shift the aim so the object sits in the open part of the screen, beside the sheet (above it on a phone) */
      const dist = fCam.distanceTo(focus.at);
      fLook.copy(focus.at); if (small) fLook.y -= dist * .34; else fLook.x -= dist * .44;
      const k = focusK * focusK * (3 - 2 * focusK);
      camP.lerp(fCam, k); lookP.lerp(fLook, k);
    }
    camera.position.copy(camP);
    camera.lookAt(lookP);
    sky.position.copy(camP);

    applyLight();
    skyU.uT.value = T; waterU.uT.value = T; waterU.uCam.value.copy(camP);
    renderer.render(scene, camera);

    /* the small cabin on the line map, and which stop is awake */
    lineCabin?.style.setProperty('--x', (ride / (stops.length - 1)).toFixed(4));
    const near = Math.round(target);
    if (near !== activeStop) {
      activeStop = near;
      stops.forEach((s, i) => s.classList.toggle('is-on', i === near));
      lineLinks.forEach((a, i) => (i === near ? a.setAttribute('aria-current', 'step') : a.removeAttribute('aria-current')));
      root.dataset.ink = stops[near]?.dataset.ink || 'dark';
      window.dispatchEvent(new CustomEvent('stop-change', { detail: { stop: near } }));
    }

    /* the device decides how fine the world can be */
    if (frameN > 40 && !pageOpen) {
      if (dt > 1 / 28) slow++; else slow = Math.max(0, slow - .2);
      if (slow > 40 && dpr > .7) { dpr = Math.max(.7, dpr * .8); renderer.setPixelRatio(dpr); slow = 0; }
    }
  };

  addEventListener('resize', () => {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    readScroll();
  });
  /* theme command in the shell repaints straight away */
  setLoad(.98); await breathe();
  applyLight();
  requestAnimationFrame(render);
  window.dispatchEvent(new Event('world-ready'));
  finish();
};
if (canvas) start().catch(e => { console.warn(e); root.classList.add('no-gl'); canvas.remove(); finish(); });
