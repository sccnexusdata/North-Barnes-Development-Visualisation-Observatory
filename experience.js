(() => {
  const FALLBACK_CONFIG={
    flight_duration_seconds:4.5,
    terrain:{url_template:'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',maxzoom:15,exaggeration:1},
    cameras:{
      home:{lon:-0.045,lat:50.93,height:4200,zoom:10.2,bearing:0,heading:0,pitch:52},
      approach:{lon:-0.035,lat:50.94,height:1450,zoom:12.2,bearing:8,heading:8,pitch:58},
      site:{lon:-0.025,lat:50.95,height:650,zoom:13.7,bearing:12,heading:12,pitch:62}
    }
  };
  const state={viewer:null,renderer:null,active:false,loaded:false,loading:null,profile:'auto',config:FALLBACK_CONFIG,lastError:null,lastFocus:null};
  const qs=(s,r=document)=>r.querySelector(s),qsa=(s,r=document)=>[...r.querySelectorAll(s)];

  function reducedMotion(){return matchMedia('(prefers-reduced-motion: reduce)').matches;}
  function deviceProfile(){
    const mem=Number(navigator.deviceMemory||4),cores=Number(navigator.hardwareConcurrency||4),narrow=matchMedia('(max-width:700px)').matches;
    const saveData=!!(navigator.connection&&navigator.connection.saveData);
    if(saveData||mem<=2||cores<=2)return'lite';
    if(narrow||mem<=4||cores<=4)return'balanced';
    return'high';
  }
  function diagnostics(){
    const c=navigator.connection||{};
    return{renderer:state.renderer,profile:state.profile,viewport:`${innerWidth}x${innerHeight}`,dpr:devicePixelRatio||1,memory:navigator.deviceMemory||'unknown',cores:navigator.hardwareConcurrency||'unknown',saveData:!!c.saveData,network:c.effectiveType||'unknown',error:state.lastError?String(state.lastError.message||state.lastError):null};
  }
  function saveDiagnostics(){try{sessionStorage.setItem('north-barnes-3d-diagnostics',JSON.stringify(diagnostics()));}catch(_){} }

  async function loadConfig(){
    try{
      const r=await fetch('data/viewer-config.json',{cache:'no-cache'});if(!r.ok)throw new Error(`viewer config HTTP ${r.status}`);
      const data=await r.json();if(!data?.cameras?.home||!data?.cameras?.site)throw new Error('viewer config schema invalid');state.config=data;
    }catch(err){console.warn('Using embedded viewer config fallback',err);state.config=FALLBACK_CONFIG;}
  }

  function shell(){
    if(qs('#immersive-experience'))return;
    const el=document.createElement('section');el.id='immersive-experience';el.className='immersive-experience';el.setAttribute('aria-label','Interactive North Barnes 3D landscape experience');
    el.innerHTML=`<div id="nb3d" class="nb3d" aria-hidden="true"></div>
      <div class="experience-fallback" data-exp-fallback><div class="experience-copy">
      <p class="eyebrow">North Barnes digital twin · preview</p><h1>Explore the landscape before the proposal.</h1>
      <p>Enter a real-time 3D geographic experience with open elevation terrain and device-adaptive rendering. Verified GIS geometry will progressively replace provisional camera anchors and contextual data.</p>
      <div class="experience-actions"><button type="button" data-enter aria-describedby="experience-note">Enter 3D experience</button><a href="#proposal">Read the evidence</a></div>
      <small id="experience-note" data-exp-note>No planning geometry is presented as final. Current terrain is contextual open elevation data; evidential photomontage will use the locked GIS/OS terrain model.</small></div></div>
      <div class="experience-hud" data-exp-hud hidden><div class="hud-brand">North Barnes <span>Visualisation Observatory</span></div>
      <div class="hud-actions" role="toolbar" aria-label="3D viewer controls"><button data-view="home" aria-label="Fly to regional view">Regional</button><button data-view="approach" aria-label="Fly to approach view">Approach</button><button data-view="site" aria-label="Fly to site view">Site</button><button data-quality aria-label="Change 3D graphics quality">Quality</button><button data-fullscreen aria-label="Toggle full screen">Full screen</button><button data-exit aria-label="Exit 3D viewer and read evidence">Evidence ↓</button></div>
      <div class="hud-status" data-exp-status role="status" aria-live="polite">Initialising 3D terrain…</div></div>`;
    document.body.prepend(el);
    qs('[data-enter]',el).addEventListener('click',enter);qs('[data-exit]',el).addEventListener('click',exit);qs('[data-quality]',el).addEventListener('click',cycleQuality);qs('[data-fullscreen]',el).addEventListener('click',toggleFullscreen);
    qsa('[data-view]',el).forEach(b=>b.addEventListener('click',()=>fly(b.dataset.view)));
    if(!document.fullscreenEnabled){const b=qs('[data-fullscreen]',el);if(b)b.hidden=true;}
  }

  function preconnect(url){try{const u=new URL(url);if(qs(`link[data-nb-preconnect="${u.origin}"]`))return;const l=document.createElement('link');l.rel='preconnect';l.href=u.origin;l.crossOrigin='anonymous';l.dataset.nbPreconnect=u.origin;document.head.append(l);}catch(_){} }
  function addStylesheet(url,key){if(qs(`link[data-viewer-css="${key}"]`))return;const l=document.createElement('link');l.rel='stylesheet';l.href=url;l.dataset.viewerCss=key;document.head.append(l);}
  function loadScript(url,timeoutMs=12000){return new Promise((resolve,reject)=>{const s=document.createElement('script');let done=false;const t=setTimeout(()=>{if(!done){done=true;s.remove();reject(new Error(`Timed out loading ${url}`));}},timeoutMs);s.src=url;s.async=true;s.onload=()=>{if(!done){done=true;clearTimeout(t);resolve();}};s.onerror=()=>{if(!done){done=true;clearTimeout(t);reject(new Error(`Failed loading ${url}`));}};document.head.append(s);});}

  async function loadMapLibre(){
    if(window.maplibregl)return true;
    const cdns=[
      {css:'https://cdn.jsdelivr.net/npm/maplibre-gl@5.21.0/dist/maplibre-gl.css',js:'https://cdn.jsdelivr.net/npm/maplibre-gl@5.21.0/dist/maplibre-gl.js'},
      {css:'https://unpkg.com/maplibre-gl@5.21.0/dist/maplibre-gl.css',js:'https://unpkg.com/maplibre-gl@5.21.0/dist/maplibre-gl.js'}
    ];
    let last;for(const c of cdns){try{addStylesheet(c.css,'maplibre');await loadScript(c.js);if(window.maplibregl)return true;}catch(e){last=e;console.warn('MapLibre CDN attempt failed',e);}}
    throw last||new Error('MapLibre unavailable');
  }
  async function loadCesium(){
    if(window.Cesium)return true;
    const cdns=[
      {css:'https://cdn.jsdelivr.net/npm/cesium@1.132.0/Build/Cesium/Widgets/widgets.css',js:'https://cdn.jsdelivr.net/npm/cesium@1.132.0/Build/Cesium/Cesium.js'},
      {css:'https://unpkg.com/cesium@1.132.0/Build/Cesium/Widgets/widgets.css',js:'https://unpkg.com/cesium@1.132.0/Build/Cesium/Cesium.js'}
    ];let last;for(const c of cdns){try{addStylesheet(c.css,'cesium');await loadScript(c.js);if(window.Cesium)return true;}catch(e){last=e;console.warn('Cesium CDN attempt failed',e);}}
    throw last||new Error('Cesium unavailable');
  }

  function mapLibreStyle(){
    const terrain=state.config.terrain||FALLBACK_CONFIG.terrain;
    return{version:8,sources:{
      osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,maxzoom:19,attribution:'© OpenStreetMap contributors'},
      terrain:{type:'raster-dem',tiles:[terrain.url_template||FALLBACK_CONFIG.terrain.url_template],tileSize:256,encoding:'terrarium',maxzoom:Number(terrain.maxzoom||15),attribution:'Terrain: AWS Open Data / Mapzen'}
    },layers:[{id:'osm',type:'raster',source:'osm'},{id:'hillshade',type:'hillshade',source:'terrain',paint:{'hillshade-shadow-color':'#253a28','hillshade-highlight-color':'#f2ead2','hillshade-accent-color':'#5e795f'}}],terrain:{source:'terrain',exaggeration:Number(terrain.exaggeration||1)},sky:{'sky-color':'#dce7ee','horizon-color':'#f5f3e7','fog-color':'#e8ece5','sky-horizon-blend':0.35,'horizon-fog-blend':0.55,'fog-ground-blend':0.65}};
  }

  function clearViewer(){
    try{
      if(state.renderer==='maplibre-terrain'&&state.viewer?.remove)state.viewer.remove();
      else if(state.renderer==='cesium-fallback'&&state.viewer&&!state.viewer.isDestroyed?.())state.viewer.destroy?.();
    }catch(err){console.warn('3D viewer cleanup warning',err);}
    state.viewer=null;state.renderer=null;state.loaded=false;
    const host=qs('#nb3d');if(host)host.replaceChildren();
  }

  async function initialiseMapLibre(){
    await loadMapLibre();const M=window.maplibregl,p=cameraFor('home');
    state.viewer=new M.Map({container:'nb3d',style:mapLibreStyle(),center:[p.lon,p.lat],zoom:Number(p.zoom||10.2),pitch:Number(p.pitch||52),bearing:Number(p.bearing||0),antialias:state.profile==='high',maxPitch:80,hash:false,attributionControl:{compact:true},cooperativeGestures:false,renderWorldCopies:false});
    await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('3D terrain map timed out')),15000);state.viewer.once('load',()=>{clearTimeout(timer);resolve();});state.viewer.once('error',e=>{if(e?.error?.message&&/WebGL|context/i.test(e.error.message)){clearTimeout(timer);reject(e.error);}});});
    state.renderer='maplibre-terrain';applyProfile(state.profile);state.loaded=true;saveDiagnostics();return true;
  }

  async function initialiseCesiumFallback(){
    await loadCesium();const C=window.Cesium,p=cameraFor('home');
    state.viewer=new C.Viewer('nb3d',{animation:false,timeline:false,baseLayerPicker:false,geocoder:false,homeButton:false,sceneModePicker:false,navigationHelpButton:false,fullscreenButton:false,infoBox:false,selectionIndicator:false,baseLayer:C.ImageryLayer.fromProviderAsync(C.OpenStreetMapImageryProvider.fromUrl('https://tile.openstreetmap.org/'))});
    state.renderer='cesium-fallback';state.loaded=true;applyProfile(state.profile);state.viewer.camera.setView({destination:C.Cartesian3.fromDegrees(p.lon,p.lat,p.height||4200),orientation:{heading:C.Math.toRadians(Number(p.heading||0)),pitch:C.Math.toRadians(-42),roll:0}});saveDiagnostics();return true;
  }

  async function initialise(){
    if(state.loaded)return true;if(state.loading)return state.loading;state.profile=deviceProfile();state.lastError=null;
    state.loading=(async()=>{await loadConfig();clearViewer();try{return await initialiseMapLibre();}catch(primary){console.warn('Primary 3D terrain renderer failed',primary);clearViewer();try{return await initialiseCesiumFallback();}catch(fallback){clearViewer();state.lastError=new Error(`${primary.message||primary}; fallback: ${fallback.message||fallback}`);saveDiagnostics();const note=qs('[data-exp-note]');if(note)note.textContent=`3D could not initialise here: ${state.lastError.message}. You can retry or continue to the evidence below.`;return false;}}})();
    const result=await state.loading;state.loading=null;return result;
  }

  function cameraFor(key){return state.config?.cameras?.[key]||FALLBACK_CONFIG.cameras[key]||FALLBACK_CONFIG.cameras.site;}
  function fly(key){
    if(!state.viewer)return;const p=cameraFor(key),duration=reducedMotion()?0:Number(state.config.flight_duration_seconds||4.5)*1000;
    if(state.renderer==='maplibre-terrain'){state.viewer.flyTo({center:[p.lon,p.lat],zoom:Number(p.zoom||13),pitch:Number(p.pitch||60),bearing:Number(p.bearing||0),duration,essential:!reducedMotion()});}
    else if(state.renderer==='cesium-fallback'){const C=window.Cesium;state.viewer.camera.flyTo({destination:C.Cartesian3.fromDegrees(p.lon,p.lat,p.height||650),orientation:{heading:C.Math.toRadians(Number(p.heading||0)),pitch:C.Math.toRadians(-38),roll:0},duration:duration/1000});}
  }
  function applyProfile(profile){
    state.profile=profile;if(!state.viewer)return;
    if(state.renderer==='maplibre-terrain'){
      const terrain=state.config.terrain||FALLBACK_CONFIG.terrain;const ex=profile==='lite'?0.92:Number(terrain.exaggeration||1);try{state.viewer.setTerrain({source:'terrain',exaggeration:ex});}catch(_){}
      state.viewer.setMaxPitch(profile==='lite'?70:80);state.viewer.triggerRepaint();
    }else if(state.renderer==='cesium-fallback'){
      const scene=state.viewer.scene,dpr=Math.max(1,devicePixelRatio||1);scene.requestRenderMode=true;scene.globe.enableLighting=profile==='high';scene.globe.maximumScreenSpaceError=profile==='lite'?8:profile==='balanced'?4:2;state.viewer.resolutionScale=profile==='lite'?Math.min(.85,1.2/dpr):profile==='balanced'?Math.min(1,1.8/dpr):1;state.viewer.targetFrameRate=profile==='lite'?30:profile==='balanced'?45:60;scene.requestRender();
    }
    const status=qs('[data-exp-status]');if(status&&state.loaded)status.textContent=`${state.renderer==='maplibre-terrain'?'Live 3D terrain':'3D fallback globe'} · ${profile} quality · verified proposal geometry pending`;saveDiagnostics();
  }
  function cycleQuality(){const next=state.profile==='lite'?'balanced':state.profile==='balanced'?'high':'lite';applyProfile(next);const b=qs('[data-quality]');if(b){b.textContent=`Quality: ${next}`;b.setAttribute('aria-label',`Graphics quality ${next}; activate to change`);}}
  async function toggleFullscreen(){const el=qs('#immersive-experience');try{if(!document.fullscreenElement&&el?.requestFullscreen)await el.requestFullscreen();else if(document.exitFullscreen)await document.exitFullscreen();}catch(e){console.warn('Fullscreen unavailable',e);}}

  async function enter(){
    const button=qs('[data-enter]');state.lastFocus=document.activeElement;
    if(button){button.disabled=true;button.textContent='Starting 3D terrain…';}
    const ok=await initialise();if(!ok){if(button){button.disabled=false;button.textContent='Retry 3D';button.focus();}return;}
    state.active=true;document.documentElement.classList.add('experience-active');qs('#nb3d').setAttribute('aria-hidden','false');qs('[data-exp-fallback]').hidden=true;qs('[data-exp-hud]').hidden=false;
    const q=qs('[data-quality]');if(q){q.textContent=`Quality: ${state.profile}`;q.setAttribute('aria-label',`Graphics quality ${state.profile}; activate to change`);}applyProfile(state.profile);
    if(!reducedMotion()){fly('approach');setTimeout(()=>{if(state.active)fly('site');},Math.max(4200,Number(state.config.flight_duration_seconds||4.5)*1000+600));}else fly('site');
    setTimeout(()=>qs('[data-view="site"]')?.focus(),50);
  }
  function exit(){
    if(!state.active)return;state.active=false;document.documentElement.classList.remove('experience-active');if(document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen().catch(()=>{});qs('#nb3d')?.setAttribute('aria-hidden','true');qs('[data-exp-hud]')?.setAttribute('hidden','');
    const target=qs('#proposal');target?.scrollIntoView({behavior:reducedMotion()?'auto':'smooth'});setTimeout(()=>{if(state.lastFocus?.focus)state.lastFocus.focus();else qs('[data-enter]')?.focus();},reducedMotion()?0:350);
  }

  function prewarm(){
    const conn=navigator.connection||{};if(conn.saveData)return;
    preconnect('https://cdn.jsdelivr.net');preconnect('https://unpkg.com');preconnect('https://tile.openstreetmap.org');preconnect((state.config.terrain||FALLBACK_CONFIG.terrain).url_template);
    const run=()=>loadConfig().then(()=>preconnect((state.config.terrain||FALLBACK_CONFIG.terrain).url_template)).catch(()=>{});
    if('requestIdleCallback'in window)requestIdleCallback(run,{timeout:2000});else setTimeout(run,900);
  }
  addEventListener('resize',()=>{if(state.renderer==='maplibre-terrain')state.viewer?.resize();else if(state.renderer==='cesium-fallback'){state.viewer?.resize();state.viewer?.scene?.requestRender();}},{passive:true});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&state.active){event.preventDefault();exit();}});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.renderer==='maplibre-terrain')state.viewer?.triggerRepaint();else if(!document.hidden&&state.renderer==='cesium-fallback')state.viewer?.scene?.requestRender();});
  shell();prewarm();
})();
