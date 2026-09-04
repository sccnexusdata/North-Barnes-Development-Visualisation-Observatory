(() => {
  const CONFIG = {
    home: { lon: -0.045, lat: 50.93, height: 4200 },
    approach: { lon: -0.035, lat: 50.94, height: 1450 },
    site: { lon: -0.025, lat: 50.95, height: 650 },
    duration: 4.5
  };
  const state = { viewer: null, active: false, loaded: false, profile: 'auto' };
  const qs = (s, r=document) => r.querySelector(s);

  function reducedMotion(){ return matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function deviceProfile(){
    const mem = navigator.deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;
    const narrow = matchMedia('(max-width: 700px)').matches;
    const saveData = !!(navigator.connection && navigator.connection.saveData);
    if(saveData || mem <= 2 || cores <= 2) return 'lite';
    if(narrow || mem <= 4) return 'balanced';
    return 'high';
  }

  function shell(){
    if(qs('#immersive-experience')) return;
    const el=document.createElement('section');
    el.id='immersive-experience';
    el.className='immersive-experience';
    el.setAttribute('aria-label','Interactive North Barnes 3D landscape experience');
    el.innerHTML=`<div id="nb3d" class="nb3d" aria-hidden="true"></div>
      <div class="experience-fallback" data-exp-fallback>
        <div class="experience-copy"><p class="eyebrow">North Barnes digital twin · preview</p><h1>Explore the landscape before the proposal.</h1><p>Enter an evidence-led, terrain-aware 3D experience. The viewer now attempts real-time rendering first and adapts quality to the device.</p><div class="experience-actions"><button type="button" data-enter>Enter 3D experience</button><a href="#proposal">Read the evidence</a></div><small data-exp-note>3D quality adapts automatically. No planning geometry is presented as final.</small></div>
      </div>
      <div class="experience-hud" data-exp-hud hidden><div class="hud-brand">North Barnes <span>Visualisation Observatory</span></div><div class="hud-actions"><button data-view="home">Regional</button><button data-view="approach">Approach</button><button data-view="site">Site</button><button data-exit>Evidence ↓</button></div><div class="hud-status" data-exp-status>Initialising landscape…</div></div>`;
    document.body.prepend(el);
    qs('[data-enter]',el).addEventListener('click', enter);
    qs('[data-exit]',el).addEventListener('click', exit);
    el.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>fly(b.dataset.view)));
  }

  async function loadCesium(){
    if(window.Cesium) return true;
    const css=document.createElement('link'); css.rel='stylesheet'; css.href='https://cdn.jsdelivr.net/npm/cesium@1.132.0/Build/Cesium/Widgets/widgets.css'; document.head.append(css);
    await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/cesium@1.132.0/Build/Cesium/Cesium.js';s.onload=resolve;s.onerror=()=>reject(new Error('Cesium library failed to load'));document.head.append(s);});
    return !!window.Cesium;
  }

  async function initialise(){
    if(state.loaded) return true;
    state.profile=deviceProfile();
    try{
      await loadCesium();
      const C=window.Cesium;
      state.viewer=new C.Viewer('nb3d',{
        animation:false,timeline:false,baseLayerPicker:false,geocoder:false,homeButton:false,sceneModePicker:false,navigationHelpButton:false,fullscreenButton:false,infoBox:false,selectionIndicator:false,shouldAnimate:true,
        baseLayer:C.ImageryLayer.fromProviderAsync(C.OpenStreetMapImageryProvider.fromUrl('https://tile.openstreetmap.org/'))
      });
      const scene=state.viewer.scene;
      scene.globe.enableLighting=state.profile==='high';
      scene.fog.enabled=true;
      scene.globe.depthTestAgainstTerrain=true;
      scene.requestRenderMode=true;
      scene.maximumRenderTimeChange=Infinity;
      if(state.profile==='lite'){
        scene.globe.maximumScreenSpaceError=6;
        scene.fog.density=0.00035;
        state.viewer.resolutionScale=Math.min(1,window.devicePixelRatio ? 1/window.devicePixelRatio*1.5 : 1);
      } else if(state.profile==='balanced'){
        scene.globe.maximumScreenSpaceError=4;
        state.viewer.resolutionScale=Math.min(1,window.devicePixelRatio ? 1/window.devicePixelRatio*2 : 1);
      } else {
        scene.globe.maximumScreenSpaceError=2;
      }
      state.viewer.camera.setView({destination:C.Cartesian3.fromDegrees(CONFIG.home.lon,CONFIG.home.lat,CONFIG.home.height),orientation:{heading:0,pitch:C.Math.toRadians(-42),roll:0}});
      state.loaded=true;
      return true;
    }catch(err){
      console.warn('North Barnes 3D initialisation failed',err);
      const note=qs('[data-exp-note]');
      if(note) note.textContent=`3D could not initialise in this browser: ${err.message || 'rendering unavailable'}. Evidence remains available below.`;
      return false;
    }
  }

  function fly(key){
    if(!state.viewer) return;
    const p=CONFIG[key]||CONFIG.site, C=window.Cesium;
    state.viewer.camera.flyTo({destination:C.Cartesian3.fromDegrees(p.lon,p.lat,p.height),orientation:{heading:C.Math.toRadians(8),pitch:C.Math.toRadians(-38),roll:0},duration:reducedMotion()?0:CONFIG.duration});
  }

  async function enter(){
    const button=qs('[data-enter]');
    if(button){button.disabled=true;button.textContent='Starting 3D…';}
    const ok=await initialise();
    if(!ok){
      if(button){button.disabled=false;button.textContent='Retry 3D';}
      return;
    }
    state.active=true;
    document.documentElement.classList.add('experience-active');
    qs('#nb3d').setAttribute('aria-hidden','false');
    qs('[data-exp-fallback]').hidden=true;
    qs('[data-exp-hud]').hidden=false;
    const status=qs('[data-exp-status]');
    if(status) status.textContent=`Live terrain viewer · ${state.profile} quality · proposal geometry withheld until verified`;
    if(!reducedMotion()){
      fly('approach');
      setTimeout(()=>{if(state.active) fly('site');},5200);
    }
  }

  function exit(){
    state.active=false;
    document.documentElement.classList.remove('experience-active');
    const target=qs('#proposal');
    if(target) target.scrollIntoView({behavior:reducedMotion()?'auto':'smooth'});
  }

  shell();
})();
