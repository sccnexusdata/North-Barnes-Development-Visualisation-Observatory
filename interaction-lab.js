(() => {
  const VERSION = '23';
  const PROPOSAL_LAYERS = [
    'nb-proposal-buildings',
    'nb-proposal-streets',
    'nb-proposal-zones',
    'nb-proposal-envelope-line',
    'nb-proposal-envelope-fill'
  ];
  let map = null;
  let toolbar = null;
  let compareButton = null;
  let shareButton = null;
  let inspector = null;
  let compareActive = false;
  let compareRestoreVisible = false;
  let compareTimer = null;
  let attached = false;

  const qs = (s, r = document) => r.querySelector(s);
  const proposalApi = () => window.NorthBarnesProposal || null;
  const proposalState = () => {
    try { return proposalApi()?.state?.() || null; } catch (_) { return null; }
  };
  const editingTarget = (target) => !!target?.closest?.('input,textarea,select,[contenteditable="true"]');

  function status(text) {
    const el = qs('[data-exp-status]');
    if (el) el.textContent = text;
  }

  function css() {
    if (qs('#nb-interaction-lab-css')) return;
    const style = document.createElement('style');
    style.id = 'nb-interaction-lab-css';
    style.textContent = `
      [data-compare-landscape][aria-pressed="true"]{background:#e8eee7!important;color:#142218!important;border-color:#fff8!important}
      #nb-feature-inspector{position:absolute;z-index:7;left:18px;bottom:58px;width:min(360px,calc(100% - 36px));padding:13px 14px;border:1px solid #ffffff45;border-radius:15px;background:#07110dee;color:#fff;box-shadow:0 14px 44px #0007;backdrop-filter:blur(10px);font-size:.77rem;line-height:1.4}
      #nb-feature-inspector[hidden]{display:none}
      #nb-feature-inspector strong{display:block;margin-right:32px;font-size:.92rem}
      #nb-feature-inspector p{margin:.35rem 0 0;color:#d8e1d9}
      #nb-feature-inspector small{display:block;margin-top:.5rem;color:#afbeb2}
      #nb-feature-inspector button{position:absolute;right:8px;top:8px;min-width:32px;min-height:32px;border:0;border-radius:999px;background:#ffffff14;color:#fff;cursor:pointer}
      @media(max-width:700px){#nb-feature-inspector{left:10px;right:10px;bottom:52px;width:auto;max-height:34vh;overflow:auto;font-size:.72rem}}
    `;
    document.head.appendChild(style);
  }

  function ensureInspector() {
    if (inspector?.isConnected) return inspector;
    const host = qs('#immersive-experience');
    if (!host) return null;
    inspector = document.createElement('aside');
    inspector.id = 'nb-feature-inspector';
    inspector.hidden = true;
    inspector.setAttribute('aria-live', 'polite');
    inspector.innerHTML = '<button type="button" aria-label="Close feature details">×</button><strong>Feature details</strong><p></p><small></small>';
    inspector.querySelector('button').addEventListener('click', () => { inspector.hidden = true; });
    host.appendChild(inspector);
    return inspector;
  }

  function featureCopy(feature) {
    const p = feature?.properties || {};
    const kind = p.kind || 'feature';
    const phase = Number(p.phase || 0);
    const height = Number(p.height_m || 0);
    if (kind === 'building-detailed' || kind === 'building' || kind === 'roof-cap') {
      return {
        title: 'Illustrative proposal massing',
        body: `${phase ? `Scenario stage ${phase}. ` : ''}${height ? `Indicative rendered height ${height.toFixed(1)} m. ` : ''}This object communicates settlement scale and urban grain only; it is not a final building position, architecture or planning parameter.`,
        note: 'Geometry confidence: illustrative · Site 11EC context is authority-supported.'
      };
    }
    if (kind === 'illustrative-street') {
      return {
        title: 'Illustrative street guide',
        body: 'A presentation guide used to make the analytical settlement massing readable. It is not a published road alignment or access proposal.',
        note: 'Geometry confidence: illustrative.'
      };
    }
    if (kind === 'development-zone') {
      return {
        title: 'Illustrative development zone',
        body: `${phase ? `Scenario stage ${phase}. ` : ''}This zone supports the phasing visualisation but does not represent a surveyed parcel, planning red line or final masterplan block.`,
        note: 'Geometry confidence: illustrative.'
      };
    }
    if (kind === 'site-envelope') {
      return {
        title: 'Site 11EC analytical envelope',
        body: 'This yellow envelope is an analytical scale-study geometry around the authority-supported Site 11EC context. Exact planning/masterplan GIS remains a publication blocker.',
        note: 'Source status: authority-supported site reference · envelope geometry: illustrative.'
      };
    }
    return {
      title: 'Analytical feature',
      body: 'This feature belongs to the public presentation model. Its geometry should not be treated as a final planning or survey position unless explicitly marked otherwise.',
      note: `Feature type: ${kind}`
    };
  }

  function inspectAt(point) {
    if (!map) return;
    const available = PROPOSAL_LAYERS.filter(id => map.getLayer?.(id));
    if (!available.length) return;
    let features = [];
    try { features = map.queryRenderedFeatures(point, { layers: available }); } catch (_) {}
    const feature = features?.[0];
    if (!feature) return;
    const copy = featureCopy(feature);
    const panel = ensureInspector();
    if (!panel) return;
    panel.querySelector('strong').textContent = copy.title;
    panel.querySelector('p').textContent = copy.body;
    panel.querySelector('small').textContent = copy.note;
    panel.hidden = false;
  }

  function setCompareButton(on) {
    if (!compareButton) return;
    compareButton.setAttribute('aria-pressed', on ? 'true' : 'false');
    compareButton.textContent = on ? 'Existing view' : 'Hold: existing';
  }

  function beginCompare({ timed = false } = {}) {
    if (compareActive) return;
    const api = proposalApi();
    const state = proposalState();
    if (!api || !state) {
      status('Proposal comparison is not ready yet');
      return;
    }
    compareRestoreVisible = !!state.visible;
    if (!compareRestoreVisible) {
      status('Proposal is already off · existing landscape visible');
      return;
    }
    compareActive = true;
    setCompareButton(true);
    try { api.setVisible(false, false); } catch (_) {}
    if (inspector) inspector.hidden = true;
    status('Existing landscape comparison · release to restore illustrative proposal');
    clearTimeout(compareTimer);
    if (timed) compareTimer = setTimeout(endCompare, 1300);
  }

  function endCompare() {
    clearTimeout(compareTimer);
    compareTimer = null;
    if (!compareActive) return;
    compareActive = false;
    setCompareButton(false);
    if (compareRestoreVisible) {
      try { proposalApi()?.setVisible?.(true, false); } catch (_) {}
      const state = proposalState();
      status(`Illustrative proposal restored${state?.year ? ` · Year ${state.year}` : ''}`);
    }
    compareRestoreVisible = false;
  }

  function viewUrl() {
    const url = new URL(location.href);
    if (map) {
      const center = map.getCenter();
      const values = [center.lng, center.lat, map.getZoom(), map.getBearing(), map.getPitch()].map((v, i) => Number(v).toFixed(i < 2 ? 5 : 2));
      url.searchParams.set('view', values.join(','));
    }
    const state = proposalState();
    if (state?.year) url.searchParams.set('phase', String(state.year));
    if (state?.visible) url.searchParams.set('proposal', '1');
    else url.searchParams.delete('proposal');
    return url.toString();
  }

  async function shareView() {
    const url = viewUrl();
    const title = 'North Barnes Visualisation Observatory viewpoint';
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        status('Viewpoint shared');
        return;
      }
    } catch (error) {
      if (error?.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(url);
      status('Viewpoint link copied');
      return;
    } catch (_) {}
    const input = document.createElement('textarea');
    input.value = url;
    input.setAttribute('readonly', '');
    input.style.position = 'absolute';
    input.style.left = '-9999px';
    document.body.appendChild(input);
    input.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } catch (_) {}
    input.remove();
    status(copied ? 'Viewpoint link copied' : 'Share unavailable · copy the page URL after moving to your view');
  }

  function applySharedView() {
    if (!map) return;
    const params = new URLSearchParams(location.search);
    const raw = params.get('view');
    if (raw) {
      const nums = raw.split(',').map(Number);
      if (nums.length === 5 && nums.every(Number.isFinite)) {
        const [lng, lat, zoom, bearing, pitch] = nums;
        if (lng >= -180 && lng <= 180 && lat >= -85 && lat <= 85) {
          try { map.jumpTo({ center: [lng, lat], zoom: Math.max(8, Math.min(18, zoom)), bearing, pitch: Math.max(0, Math.min(80, pitch)) }); } catch (_) {}
        }
      }
    }
    const phase = Number(params.get('phase'));
    if (Number.isFinite(phase) && phase > 0) {
      try { proposalApi()?.setYear?.(phase); } catch (_) {}
    }
    if (params.get('proposal') === '1') {
      try { proposalApi()?.setVisible?.(true, false); } catch (_) {}
    }
  }

  function ensureControls() {
    toolbar = qs('.hud-actions');
    if (!toolbar) return;
    if (!compareButton?.isConnected) {
      compareButton = document.createElement('button');
      compareButton.type = 'button';
      compareButton.dataset.compareLandscape = '';
      compareButton.setAttribute('aria-pressed', 'false');
      compareButton.setAttribute('aria-label', 'Hold to compare the existing landscape without the illustrative proposal');
      compareButton.title = 'Hold to reveal the existing landscape · keyboard B';
      compareButton.textContent = 'Hold: existing';
      const info = toolbar.querySelector('[data-proposal-info]');
      toolbar.insertBefore(compareButton, info || toolbar.querySelector('[data-exit]') || null);
      compareButton.addEventListener('pointerdown', event => {
        if (event.pointerType === 'touch') beginCompare({ timed: true });
        else beginCompare();
      });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(type => compareButton.addEventListener(type, () => endCompare()));
      compareButton.addEventListener('keydown', event => {
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          beginCompare({ timed: true });
        }
      });
    }
    if (!shareButton?.isConnected) {
      shareButton = document.createElement('button');
      shareButton.type = 'button';
      shareButton.dataset.shareView = '';
      shareButton.textContent = 'Share view';
      shareButton.setAttribute('aria-label', 'Share this exact 3D viewpoint and proposal year');
      toolbar.insertBefore(shareButton, toolbar.querySelector('[data-exit]') || null);
      shareButton.addEventListener('click', shareView);
    }
  }

  function attach(nextMap) {
    if (!nextMap || attached) return;
    map = nextMap;
    attached = true;
    ensureControls();
    ensureInspector();
    map.on('click', event => {
      const state = proposalState();
      if (state?.touring) return;
      inspectAt(event.point);
    });
    map.on('mousemove', event => {
      const available = PROPOSAL_LAYERS.filter(id => map.getLayer?.(id));
      if (!available.length) return;
      try { map.getCanvas().style.cursor = map.queryRenderedFeatures(event.point, { layers: available }).length ? 'pointer' : ''; } catch (_) {}
    });
    map.on('moveend', () => {
      if (inspector && !inspector.hidden) inspector.hidden = true;
    });
    setTimeout(applySharedView, 250);
  }

  function discover() {
    ensureControls();
    const candidate = window.__northBarnesMap;
    if (candidate && !attached) attach(candidate);
  }

  document.addEventListener('keydown', event => {
    if (editingTarget(event.target) || event.altKey || event.ctrlKey || event.metaKey) return;
    if (!document.documentElement.classList.contains('experience-active')) return;
    if (event.key.toLowerCase() === 'b' && !event.repeat) {
      event.preventDefault();
      beginCompare();
    }
  });
  document.addEventListener('keyup', event => {
    if (event.key.toLowerCase() === 'b') endCompare();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) endCompare(); });

  window.NorthBarnesInteraction = {
    version: VERSION,
    shareView,
    compare: { begin: beginCompare, end: endCompare },
    state: () => ({ attached, compareActive, hasMap: !!map })
  };

  css();
  ensureControls();
  ensureInspector();
  discover();
  const observer = new MutationObserver(discover);
  observer.observe(document.documentElement, { subtree: true, childList: true });
  const timer = setInterval(() => {
    discover();
    if (attached) clearInterval(timer);
  }, 250);
  setTimeout(() => clearInterval(timer), 15000);
})();
