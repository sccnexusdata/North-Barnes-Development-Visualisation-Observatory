(() => {
  const VERSION = '37.0';
  const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js';
  const state = { ready: false, visible: false, stage: 'today', ground: false, t: 0, raf: 0, mod: null, renderer: null, scene: null, camera: null, host: null, canvas: null, mat: {}, objects: [] };
  const qs = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, t) => a + (b - a) * (t * t * (3 - 2 * t));
  const noise = (x, y) => Math.sin(x * 0.023 + y * 0.011) * 0.5 + Math.sin(x * 0.051 - y * 0.037) * 0.26 + Math.sin((x + y) * 0.018) * 0.18;
  const terrainZ = (x, y) => {
    const valley = -44 * Math.exp(-Math.pow(y / 210, 2));
    const downsN = 86 * Math.exp(-Math.pow((y - 360) / 260, 2));
    const downsS = 68 * Math.exp(-Math.pow((y + 380) / 310, 2));
    return valley + downsN + downsS + noise(x, y) * 22;
  };
  function css() {
    if (qs('#nb-v37-css')) return;
    const s = document.createElement('style');
    s.id = 'nb-v37-css';
    s.textContent = `#nb-v37{position:absolute;inset:0;z-index:3;overflow:hidden;background:#07120d;color:#fff;opacity:0;pointer-events:none;transition:opacity .55s ease}html.experience-active #nb-v37{opacity:1;pointer-events:auto}#nb-v37 canvas{position:absolute;inset:0;width:100%;height:100%;display:block}.nb-v37-vignette{position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 52% 42%,transparent 0 45%,#07120d88 78%,#030604d8 100%),linear-gradient(180deg,#0000 55%,#050a07c8)}.nb-v37-panel{position:absolute;left:18px;right:18px;bottom:18px;z-index:4;display:flex;align-items:end;justify-content:space-between;gap:18px;pointer-events:none}.nb-v37-copy{max-width:min(620px,calc(100vw - 36px));padding:14px 16px;border:1px solid #ffffff2b;border-radius:14px;background:#07110ddb;box-shadow:0 18px 55px #0007;backdrop-filter:blur(12px)}.nb-v37-copy b{display:block;font-size:1.03rem;line-height:1.15}.nb-v37-copy span{display:block;margin-top:4px;color:#d7e4d5;font-size:.84rem;line-height:1.35}.nb-v37-tools{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end;pointer-events:auto}.nb-v37-tools button{min-height:42px;border:1px solid #ffffff42;border-radius:999px;background:#08140ecc;color:#fff;padding:8px 12px;font:800 .76rem/1 system-ui,sans-serif;cursor:pointer;backdrop-filter:blur(10px)}.nb-v37-tools button[aria-pressed=true]{background:#f2dc77;color:#172015;border-color:#f2dc77}.nb-v37-credit{position:absolute;top:46px;left:14px;z-index:4;max-width:min(560px,calc(100vw - 28px));padding:7px 10px;border:1px solid #ffffff24;border-radius:999px;background:#07110dc4;color:#dce8d9;font:800 .66rem/1.25 system-ui,sans-serif;letter-spacing:.02em;pointer-events:none}.nb-v37-loader{position:absolute;inset:auto 18px 86px 18px;z-index:5;max-width:520px;padding:12px 14px;border-radius:14px;background:#07110dde;border:1px solid #ffffff2b;font:800 .8rem/1.35 system-ui,sans-serif;color:#e7efe6}@media(max-width:760px){.nb-v37-panel{display:block;bottom:92px}.nb-v37-copy{margin-bottom:8px}.nb-v37-tools{justify-content:flex-start;overflow-x:auto;flex-wrap:nowrap;padding-bottom:3px}.nb-v37-tools button{flex:0 0 auto}.nb-v37-credit{display:none}}`;
    document.head.appendChild(s);
  }
  function ensureHost() {
    css();
    const parent = qs('#immersive-experience');
    if (!parent) return null;
    if (!state.host || !state.host.isConnected) {
      const host = document.createElement('div');
      host.id = 'nb-v37';
      host.setAttribute('aria-label', 'Cinematic 3D landscape study');
      host.innerHTML = `<div class="nb-v37-loader" data-v37-loader>Loading cinematic landscape studio...</div><div class="nb-v37-vignette"></div><div class="nb-v37-credit">v37 cinematic landscape studio · illustrative habitat-loss scene · not exact engineering geometry</div><div class="nb-v37-panel"><div class="nb-v37-copy"><b data-v37-title>The valley before development pressure</b><span data-v37-detail>Ground-level 3D landscape study with hedgerows, woodland mass, meadow fabric and South Downs landform. The proposal geometry remains evidence-blocked until GIS is verified.</span></div><div class="nb-v37-tools" role="toolbar" aria-label="Landscape study modes"><button data-v37-stage="today" aria-pressed="true">Today</button><button data-v37-stage="pressure" aria-pressed="false">Pressure</button><button data-v37-stage="loss" aria-pressed="false">Loss</button><button data-v37-ground aria-pressed="false">Ground view</button></div></div>`;
      parent.appendChild(host);
      qsa('[data-v37-stage]', host).forEach(b => b.addEventListener('click', () => setStage(b.dataset.v37Stage)));
      qs('[data-v37-ground]', host).addEventListener('click', () => { state.ground = !state.ground; qs('[data-v37-ground]', host).setAttribute('aria-pressed', String(state.ground)); });
      state.host = host;
    }
    return state.host;
  }
  async function loadThree() {
    if (state.mod) return state.mod;
    state.mod = await import(THREE_URL);
    return state.mod;
  }
  function mat(THREE) {
    state.mat.trunk = new THREE.MeshStandardMaterial({ color: 0x4c3624, roughness: 0.95 });
    state.mat.leaf = new THREE.MeshStandardMaterial({ color: 0x315f36, roughness: 0.9 });
    state.mat.leaf2 = new THREE.MeshStandardMaterial({ color: 0x527545, roughness: 0.9 });
    state.mat.meadow = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
    state.mat.road = new THREE.MeshStandardMaterial({ color: 0x6f6558, roughness: 0.9 });
    state.mat.pressure = new THREE.MeshStandardMaterial({ color: 0xd3a060, transparent: true, opacity: 0.0, roughness: 0.85 });
    state.mat.soil = new THREE.MeshStandardMaterial({ color: 0x8d7657, transparent: true, opacity: 0.0, roughness: 0.95 });
    state.mat.flower = new THREE.PointsMaterial({ size: 5.5, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: 0.86 });
  }
  function addTerrain(THREE) {
    const geo = new THREE.PlaneGeometry(1700, 1050, 180, 118);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = [];
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getZ(i), z = terrainZ(x, y);
      pos.setY(i, z);
      const valley = Math.exp(-Math.pow(y / 260, 2));
      const tone = clamp((z + 70) / 170, 0, 1);
      c.setRGB(0.28 + tone * 0.24 + valley * 0.04, 0.39 + tone * 0.24, 0.22 + tone * 0.10);
      colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, state.mat.meadow);
    mesh.receiveShadow = true;
    state.scene.add(mesh);
  }
  function treeAt(THREE, x, y, scale = 1, mixed = false) {
    const z = terrainZ(x, y);
    const g1 = new THREE.CylinderGeometry(2.2 * scale, 3.6 * scale, 22 * scale, 7);
    const trunk = new THREE.Mesh(g1, state.mat.trunk);
    trunk.position.set(x, z + 11 * scale, y);
    trunk.castShadow = true;
    const g2 = new THREE.ConeGeometry((mixed ? 16 : 13) * scale, (mixed ? 42 : 35) * scale, 9);
    const leaf = new THREE.Mesh(g2, mixed ? state.mat.leaf2 : state.mat.leaf);
    leaf.position.set(x, z + 35 * scale, y);
    leaf.rotation.y = noise(x, y) * 1.7;
    leaf.castShadow = true;
    state.scene.add(trunk, leaf);
    state.objects.push(leaf);
  }
  function addTrees(THREE) {
    for (let i = 0; i < 360; i++) {
      const band = i % 5;
      let x, y;
      if (band === 0) { x = -760 + i * 4.3; y = -255 + Math.sin(i * 0.4) * 18; }
      else if (band === 1) { x = -720 + i * 3.9; y = 230 + Math.cos(i * 0.31) * 22; }
      else if (band === 2) { x = -530 + Math.sin(i) * 115 + (i % 17) * 7; y = 360 + Math.cos(i * 0.7) * 80; }
      else if (band === 3) { x = 430 + Math.sin(i * 1.7) * 180; y = -390 + Math.cos(i * 0.8) * 95; }
      else { x = -700 + Math.random() * 1400; y = -120 + noise(i, i * 3) * 70; }
      if (Math.abs(x) < 230 && Math.abs(y) < 115 && band === 4) continue;
      treeAt(THREE, x, y, 0.55 + Math.abs(noise(x, y)) * 0.65, band > 1);
    }
  }
  function addFlowers(THREE) {
    const verts = [], cols = [], c = new THREE.Color();
    for (let i = 0; i < 2400; i++) {
      const x = -760 + Math.random() * 1520;
      const y = -320 + Math.random() * 560;
      if (Math.abs(y) < 55 && x > -430 && x < 520) continue;
      verts.push(x, terrainZ(x, y) + 3.5, y);
      const k = Math.random();
      if (k < .33) c.set(0xf2df72); else if (k < .66) c.set(0xf3efe4); else c.set(0xb7d08b);
      cols.push(c.r, c.g, c.b);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const p = new THREE.Points(g, state.mat.flower);
    p.name = 'wildflower fabric';
    state.scene.add(p);
    state.objects.push(p);
  }
  function tube(THREE, pts, radius, material) {
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, terrainZ(x, y) + 4, y)));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 90, radius, 9, false), material);
    mesh.castShadow = true;
    state.scene.add(mesh);
    return mesh;
  }
  function addPressure(THREE) {
    state.road = tube(THREE, [[-780,-70],[-520,-38],[-220,-14],[120,-24],[465,5],[790,45]], 10, state.mat.road);
    state.service = tube(THREE, [[-720,145],[-360,105],[-110,70],[210,82],[565,128]], 6, state.mat.pressure);
    state.scars = [];
    const patches = [[-310,-5,250,120,0.2],[10,45,320,135,-0.1],[330,-75,280,140,0.15],[-70,-150,240,100,-0.25]];
    patches.forEach(([x, y, sx, sy, r]) => {
      const g = new THREE.CircleGeometry(1, 64);
      g.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(g, state.mat.soil);
      m.position.set(x, terrainZ(x, y) + 5.5, y);
      m.scale.set(sx, sy, 1);
      m.rotation.y = r;
      m.receiveShadow = true;
      state.scene.add(m);
      state.scars.push(m);
    });
  }
  function addSkyAndLight(THREE) {
    state.scene.background = new THREE.Color(0xbfd2d8);
    state.scene.fog = new THREE.FogExp2(0xbfd2d8, 0.00115);
    const hemi = new THREE.HemisphereLight(0xdfefff, 0x314226, 1.9);
    const sun = new THREE.DirectionalLight(0xffe4a3, 2.5);
    sun.position.set(-240, 560, 360);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    state.scene.add(hemi, sun);
    state.sun = sun;
  }
  function setStage(stage) {
    state.stage = stage;
    qsa('[data-v37-stage]', state.host).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v37Stage === stage)));
    const title = qs('[data-v37-title]', state.host), detail = qs('[data-v37-detail]', state.host);
    const text = {
      today: ['The valley before development pressure', 'Hedgerows, woodland mass, meadow fabric and downland topography are treated as the subject, not as a flat base map.'],
      pressure: ['Roads and service pressure entering the valley', 'Indicative corridors and construction pressure appear as landscape scars, kept deliberately non-exact until verified engineering geometry exists.'],
      loss: ['Habitat loss and settlement pressure made visible', 'The meadow fabric fades under organic earthwork zones so the visual story is destruction of place, not tidy blocks on a board.']
    }[stage];
    if (title) title.textContent = text[0];
    if (detail) detail.textContent = text[1];
  }
  async function init() {
    const host = ensureHost();
    if (!host || state.ready) return;
    const THREE = await loadThree();
    state.scene = new THREE.Scene();
    state.camera = new THREE.PerspectiveCamera(54, 1, 1, 5000);
    state.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    state.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
    state.renderer.shadowMap.enabled = true;
    state.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    state.canvas = state.renderer.domElement;
    host.prepend(state.canvas);
    mat(THREE);
    addSkyAndLight(THREE);
    addTerrain(THREE);
    addTrees(THREE);
    addFlowers(THREE);
    addPressure(THREE);
    resize();
    state.ready = true;
    qs('[data-v37-loader]', host)?.remove();
    animate();
  }
  function resize() {
    if (!state.renderer || !state.host) return;
    const w = Math.max(320, state.host.clientWidth), h = Math.max(320, state.host.clientHeight);
    state.renderer.setSize(w, h, false);
    state.camera.aspect = w / h;
    state.camera.updateProjectionMatrix();
  }
  function animate() {
    const THREE = state.mod;
    state.raf = requestAnimationFrame(animate);
    if (!state.ready || !document.documentElement.classList.contains('experience-active')) return;
    state.t += 0.006;
    const target = state.stage === 'today' ? 0 : state.stage === 'pressure' ? 0.55 : 1;
    state.mix = smooth(state.mix || 0, target, 0.035);
    state.mat.pressure.opacity = 0.18 + state.mix * 0.42;
    state.mat.soil.opacity = state.mix * 0.50;
    state.mat.flower.opacity = clamp(0.9 - state.mix * 0.62, 0.24, 0.9);
    state.objects.forEach((o, i) => { if (o.rotation) o.rotation.z = Math.sin(state.t * 1.7 + i) * 0.018; });
    const orbit = state.ground ? 0.35 : 1;
    const cx = state.ground ? -180 + Math.sin(state.t * .5) * 95 : Math.sin(state.t * .23) * 240;
    const cy = state.ground ? terrainZ(cx, -360) + 46 : 455 + Math.sin(state.t * .31) * 55;
    const cz = state.ground ? -430 + Math.cos(state.t * .45) * 80 : 650 + Math.cos(state.t * .21) * 140;
    state.camera.position.set(cx, cy, cz * orbit);
    state.camera.lookAt(new THREE.Vector3(70, terrainZ(70, 20) + (state.ground ? 38 : 20), 10));
    if (state.sun) state.sun.position.x = -250 + Math.sin(state.t * .18) * 180;
    state.renderer.render(state.scene, state.camera);
  }
  function sync() {
    ensureHost();
    if (document.documentElement.classList.contains('experience-active')) init().catch(e => {
      console.warn('v37 landscape studio failed', e);
      const l = qs('[data-v37-loader]', state.host);
      if (l) l.textContent = 'Cinematic landscape studio failed to load; map fallback remains available.';
    });
  }
  css();
  addEventListener('resize', resize, { passive: true });
  setInterval(sync, 500);
  window.NorthBarnesLandscapeStudioV37 = { version: VERSION, setStage, state: () => ({ ready: state.ready, stage: state.stage, ground: state.ground }) };
})();