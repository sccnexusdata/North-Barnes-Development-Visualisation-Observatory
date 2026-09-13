(() => {
  const VERSION = '23';
  const SOURCE = 'north-barnes-reality-context';
  const DATA_URL = `data/reality-context.geojson?v=${VERSION}`;
  const LAYERS = [
    'nb-reality-woodland',
    'nb-reality-hedges',
    'nb-reality-water',
    'nb-reality-roads',
    'nb-reality-rail',
    'nb-reality-buildings-flat',
    'nb-reality-buildings-3d',
    'nb-reality-trees'
  ];
  let map = null;
  let installed = false;
  let available = false;
  let visible = true;
  let button = null;
  let metadata = null;
  let featureCount = 0;

  const qs = (s, r = document) => r.querySelector(s);

  function status(text) {
    const el = qs('[data-exp-status]');
    if (el) el.textContent = text;
  }

  function setLayerVisibility(on) {
    if (!map) return;
    for (const id of LAYERS) {
      try { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none'); } catch (_) {}
    }
  }

  function updateButton() {
    if (!button) return;
    button.hidden = !available;
    button.setAttribute('aria-pressed', visible ? 'true' : 'false');
    button.textContent = visible ? 'Reality: on' : 'Reality';
  }

  function ensureControl() {
    const toolbar = qs('.hud-actions');
    if (!toolbar) return;
    if (button?.isConnected) return;
    button = document.createElement('button');
    button.type = 'button';
    button.dataset.realityContext = '';
    button.hidden = !available;
    button.setAttribute('aria-pressed', 'true');
    button.setAttribute('aria-label', 'Toggle measured or source-derived existing landscape context layers');
    button.title = 'Existing roads, buildings, water and vegetation from source-derived context data';
    button.textContent = 'Reality: on';
    const proposal = toolbar.querySelector('[data-proposal-toggle]');
    toolbar.insertBefore(button, proposal || toolbar.firstChild);
    button.addEventListener('click', () => {
      visible = !visible;
      setLayerVisibility(visible);
      updateButton();
      status(visible ? `Reality context on · ${featureCount.toLocaleString('en-GB')} source-derived features` : 'Reality context off · basemap remains visible');
    });
  }

  function safeLayer(spec, beforeId) {
    try {
      if (!map.getLayer(spec.id)) map.addLayer(spec, beforeId);
    } catch (error) {
      console.warn(`Reality layer ${spec.id} unavailable`, error);
    }
  }

  function addLayers(data) {
    if (!map || installed) return;
    if (!map.getSource(SOURCE)) map.addSource(SOURCE, { type: 'geojson', data });

    safeLayer({
      id: 'nb-reality-woodland', type: 'fill', source: SOURCE,
      filter: ['in', ['get', 'kind'], ['literal', ['woodland', 'forest']]],
      paint: { 'fill-color': '#5f7657', 'fill-opacity': 0.24, 'fill-outline-color': '#526d4d' }
    });
    safeLayer({
      id: 'nb-reality-hedges', type: 'line', source: SOURCE,
      filter: ['==', ['get', 'kind'], 'hedge'],
      layout: { 'line-cap': 'round' },
      paint: { 'line-color': '#405d3f', 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.7, 16, 2.4], 'line-opacity': 0.72 }
    });
    safeLayer({
      id: 'nb-reality-water', type: 'line', source: SOURCE,
      filter: ['==', ['get', 'kind'], 'waterway'],
      layout: { 'line-cap': 'round' },
      paint: { 'line-color': '#6fa9b7', 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 1, 16, 3], 'line-opacity': 0.86 }
    });
    safeLayer({
      id: 'nb-reality-roads', type: 'line', source: SOURCE,
      filter: ['==', ['get', 'kind'], 'road'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#d8d1bf', 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.7, 16, 4.2], 'line-opacity': 0.62 }
    });
    safeLayer({
      id: 'nb-reality-rail', type: 'line', source: SOURCE,
      filter: ['==', ['get', 'kind'], 'railway'],
      paint: { 'line-color': '#4b4b48', 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 1, 16, 4], 'line-opacity': 0.78, 'line-dasharray': [2, 1.5] }
    });
    safeLayer({
      id: 'nb-reality-buildings-flat', type: 'fill', source: SOURCE,
      filter: ['all', ['==', ['get', 'kind'], 'existing-building'], ['!', ['has', 'height_m']]],
      paint: { 'fill-color': '#afa99c', 'fill-opacity': 0.50, 'fill-outline-color': '#8d877d' }
    });
    safeLayer({
      id: 'nb-reality-buildings-3d', type: 'fill-extrusion', source: SOURCE,
      filter: ['all', ['==', ['get', 'kind'], 'existing-building'], ['has', 'height_m']],
      paint: {
        'fill-extrusion-color': '#b5aea1',
        'fill-extrusion-height': ['max', 0, ['to-number', ['get', 'height_m']]],
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': 0.78,
        'fill-extrusion-vertical-gradient': true
      }
    });
    safeLayer({
      id: 'nb-reality-trees', type: 'circle', source: SOURCE,
      filter: ['==', ['get', 'kind'], 'tree'],
      paint: {
        'circle-color': '#54734e',
        'circle-opacity': 0.78,
        'circle-stroke-color': '#385337',
        'circle-stroke-width': 0.7,
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 1.5, 14, 3.5, 17, 7]
      }
    });

    installed = true;
    available = true;
    featureCount = Array.isArray(data.features) ? data.features.length : 0;
    metadata = data.metadata || null;
    setLayerVisibility(visible);
    ensureControl();
    updateButton();
  }

  async function install() {
    if (!map || installed) return;
    try {
      const response = await fetch(DATA_URL, { cache: 'no-store' });
      if (response.status === 404) {
        window.NorthBarnesReality = { version: VERSION, available: false, reason: 'reality-context.geojson not yet published' };
        return;
      }
      if (!response.ok) throw new Error(`reality context HTTP ${response.status}`);
      const data = await response.json();
      if (data?.type !== 'FeatureCollection' || !Array.isArray(data.features)) throw new Error('invalid reality context schema');
      const run = () => addLayers(data);
      if (map.isStyleLoaded?.()) run(); else map.once('load', run);
    } catch (error) {
      console.warn('Reality context unavailable', error);
      window.NorthBarnesReality = { version: VERSION, available: false, reason: String(error.message || error) };
    }
  }

  function discover() {
    ensureControl();
    const candidate = window.__northBarnesMap;
    if (candidate && candidate !== map) {
      map = candidate;
      install();
    }
  }

  window.NorthBarnesReality = {
    version: VERSION,
    get available() { return available; },
    state: () => ({ available, visible, installed, featureCount, metadata })
  };

  discover();
  const observer = new MutationObserver(discover);
  observer.observe(document.documentElement, { subtree: true, childList: true });
  const timer = setInterval(() => {
    discover();
    if (map) clearInterval(timer);
  }, 250);
  setTimeout(() => clearInterval(timer), 15000);
})();
