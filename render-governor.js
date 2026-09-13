(() => {
  const VERSION='26';
  const LAYERS={
    roofs:'nb-proposal-roofs',
    trees:'nb-reality-trees',
    hedges:'nb-reality-hedges',
    buildings:'nb-proposal-buildings'
  };
  let map=null;
  let attached=false;
  let raf=0;
  let lastTs=0;
  let frameCount=0;
  let frameMs=0;
  let tier=matchMedia('(max-width:700px)').matches?'lite':'balanced';
  let measuredFps=null;
  let downgradeWindows=0;
  let upgradeWindows=0;
  let reapplyTimer=null;

  function setZoomRange(id,minzoom,maxzoom=24){
    if(!map?.getLayer?.(id))return;
    try{if(typeof map.setLayerZoomRange==='function')map.setLayerZoomRange(id,minzoom,maxzoom);}catch(_){}
  }

  function setAtmosphere(nextTier){
    if(!map||typeof map.setSky!=='function')return;
    const lite=nextTier==='lite';
    try{
      map.setSky({
        'sky-color':lite?'#d7ddda':'#cbd9df',
        'horizon-color':'#e7e4d8',
        'fog-color':'#d9ddd3',
        'sky-horizon-blend':lite?0.18:0.28,
        'horizon-fog-blend':lite?0.25:0.42,
        'fog-ground-blend':lite?0.34:0.52,
        'atmosphere-blend':['interpolate',['linear'],['zoom'],10,0.9,14,0.25,16,0.08]
      });
    }catch(error){console.warn('North Barnes atmosphere unavailable',error);}
  }

  function applyTier(next){
    if(!['lite','balanced','high'].includes(next))return;
    tier=next;
    document.documentElement.dataset.nbRenderTier=tier;
    if(tier==='high'){
      setZoomRange(LAYERS.roofs,12.8);
      setZoomRange(LAYERS.trees,12.0);
      setZoomRange(LAYERS.hedges,11.5);
    }else if(tier==='balanced'){
      setZoomRange(LAYERS.roofs,13.8);
      setZoomRange(LAYERS.trees,13.2);
      setZoomRange(LAYERS.hedges,12.5);
    }else{
      setZoomRange(LAYERS.roofs,19.5);
      setZoomRange(LAYERS.trees,15.2);
      setZoomRange(LAYERS.hedges,14.0);
    }
    try{
      if(map?.getLayer?.(LAYERS.buildings))map.setPaintProperty(LAYERS.buildings,'fill-extrusion-opacity',tier==='lite'?0.76:tier==='balanced'?0.84:0.90);
      if(map?.getLayer?.(LAYERS.roofs))map.setPaintProperty(LAYERS.roofs,'fill-extrusion-opacity',tier==='lite'?0.55:tier==='balanced'?0.68:0.78);
    }catch(_){}
    setAtmosphere(tier);
  }

  function evaluate(fps){
    measuredFps=fps;
    const candidate=fps<28?'lite':fps<48?'balanced':'high';
    const rank={lite:0,balanced:1,high:2};
    if(rank[candidate]<rank[tier]){
      downgradeWindows++;
      upgradeWindows=0;
      if(downgradeWindows>=2){downgradeWindows=0;applyTier(candidate);}
    }else if(rank[candidate]>rank[tier]){
      upgradeWindows++;
      downgradeWindows=0;
      if(upgradeWindows>=4){upgradeWindows=0;applyTier(candidate);}
    }else{
      downgradeWindows=0;
      upgradeWindows=0;
    }
  }

  function sample(ts){
    const active=document.documentElement.classList.contains('experience-active')&&!document.hidden;
    if(!active){lastTs=0;frameCount=0;frameMs=0;raf=requestAnimationFrame(sample);return;}
    if(lastTs){const dt=Math.min(250,Math.max(0,ts-lastTs));frameCount++;frameMs+=dt;}
    lastTs=ts;
    if(frameCount>=120){const avg=frameMs/frameCount;if(avg>0)evaluate(1000/avg);frameCount=0;frameMs=0;}
    raf=requestAnimationFrame(sample);
  }

  function reapply(){
    clearTimeout(reapplyTimer);
    reapplyTimer=setTimeout(()=>applyTier(tier),90);
  }

  function attach(nextMap){
    if(!nextMap||attached)return;
    map=nextMap;
    attached=true;
    applyTier(tier);
    map.on('styledata',reapply);
    map.on('sourcedata',reapply);
    raf=requestAnimationFrame(sample);
  }

  function discover(){
    const candidate=window.__northBarnesMap;
    if(candidate&&!attached)attach(candidate);
  }

  function loadBiodiversity(){
    if(document.querySelector('script[data-biodiversity]'))return;
    const script=document.createElement('script');
    script.src='biodiversity.js?v=26';
    script.dataset.biodiversity='';
    document.head.appendChild(script);
  }

  window.NorthBarnesRenderGovernor={
    version:VERSION,
    state:()=>({attached,tier,fps:measuredFps?Number(measuredFps.toFixed(1)):null}),
    setTier:next=>applyTier(next)
  };

  loadBiodiversity();
  discover();
  const observer=new MutationObserver(discover);
  observer.observe(document.documentElement,{subtree:true,childList:true});
  const timer=setInterval(()=>{discover();if(attached)clearInterval(timer);},250);
  setTimeout(()=>clearInterval(timer),15000);
  addEventListener('pagehide',()=>{if(raf)cancelAnimationFrame(raf);},{once:true});
})();
