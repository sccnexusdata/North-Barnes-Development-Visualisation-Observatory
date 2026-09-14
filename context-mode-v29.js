(()=>{
  const VERSION='29.2';
  const OS_META='data/os-context.json';
  const OS_SOURCE='nb-os-context';
  const OS_LAYER='nb-os-context-raster';
  let map=null,button=null,mode='osm',meta=null,watchTimer=null;
  const q=(s,r=document)=>r.querySelector(s);
  const status=t=>{const el=q('[data-exp-status]');if(el)el.textContent=t;};
  async function loadMeta(){
    try{const r=await fetch(OS_META,{cache:'no-cache'});if(!r.ok)return null;return await r.json();}catch(_){return null;}
  }
  function toolbar(){return q('.hud-actions');}
  function ensureButton(){
    const bar=toolbar();if(!bar)return;
    if(!button?.isConnected){
      button=document.createElement('button');
      button.type='button';button.dataset.contextMode='';button.textContent='Context: OSM';
      button.title='Switch between cached Ordnance Survey OpenData context and the legacy OSM preview';
      const quality=bar.querySelector('[data-quality]');bar.insertBefore(button,quality||null);
      button.addEventListener('click',()=>setMode(mode==='os'?'osm':'os'));
    }
  }
  function ensureOsLayer(){
    if(!map||!meta?.url_template)return false;
    try{
      if(!map.getSource(OS_SOURCE))map.addSource(OS_SOURCE,{type:'raster',tiles:[meta.url_template],tileSize:256,minzoom:Number(meta.zoom_min||10),maxzoom:Number(meta.zoom_max||14),attribution:meta.attribution||'Contains OS data © Crown copyright and database right 2026'});
      if(!map.getLayer(OS_LAYER)){
        const before=map.getLayer('hillshade')?'hillshade':undefined;
        map.addLayer({id:OS_LAYER,type:'raster',source:OS_SOURCE,layout:{visibility:'none'},paint:{'raster-opacity':0.94,'raster-saturation':-0.04,'raster-contrast':0.05}},before);
      }
      return true;
    }catch(error){console.warn('OS context layer unavailable',error);return false;}
  }
  function setLayer(id,on){try{if(map?.getLayer(id))map.setLayoutProperty(id,'visibility',on?'visible':'none');}catch(_){} }
  function setMode(next){
    if(!map)return;
    if(next==='os'&&(!meta||!ensureOsLayer())){mode='osm';setLayer('osm',true);if(button)button.textContent='Context: OSM';status('OS context not cached yet · legacy OSM context retained');return;}
    mode=next;
    setLayer(OS_LAYER,mode==='os');
    setLayer('osm',mode!=='os');
    if(button)button.textContent=mode==='os'?'Context: OS':'Context: OSM';
    status(mode==='os'?'OS OpenData landscape context · proposal geometry remains illustrative':'Legacy OSM context · proposal geometry remains illustrative');
  }
  async function attach(m){
    map=m;ensureButton();meta=await loadMeta();
    if(meta&&ensureOsLayer())setMode('os');else setMode('osm');
  }
  function discover(){
    ensureButton();
    const candidate=window.__northBarnesMap;
    if(candidate&&candidate!==map){attach(candidate);return;}
    if(!watchTimer)watchTimer=setInterval(()=>{const m=window.__northBarnesMap;if(m&&m!==map)attach(m);ensureButton();},700);
  }
  window.NorthBarnesContext={setMode,state:()=>({version:VERSION,mode,osReady:!!meta})};
  discover();
})();
