(() => {
  const VERSION='27.1';
  const SOURCE='north-barnes-scene-enrichment';
  const LAYERS=['nb-scene-green-pockets','nb-scene-hedges','nb-scene-tree-trunks','nb-scene-tree-canopies','nb-scene-cars'];
  const PHASE_LIMIT={5:2,10:3,15:4,20:5,25:7};
  let map=null;
  let installed=false;
  let installing=false;
  let waitingForStyle=false;
  let enabled=true;
  let proposalVisible=false;
  let year=25;
  let button=null;
  let featureCount=0;
  let lastAppliedYear=null;
  let lastAppliedVisibility=null;
  let deferredInstallTimer=null;

  const qs=(s,r=document)=>r.querySelector(s);

  function rect(cx,cy,w,h,angle=0){
    const a=angle*Math.PI/180,ca=Math.cos(a),sa=Math.sin(a);
    const pts=[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]];
    const ring=pts.map(([x,y])=>[cx+x*ca-y*sa,cy+x*sa+y*ca]);
    ring.push(ring[0]);
    return ring;
  }

  function octagon(cx,cy,rx,ry=rx){
    const ring=[];
    for(let i=0;i<8;i++){
      const a=(Math.PI*2*i)/8;
      ring.push([cx+Math.cos(a)*rx,cy+Math.sin(a)*ry]);
    }
    ring.push(ring[0]);
    return ring;
  }

  function bbox(ring){
    const xs=ring.map(p=>p[0]),ys=ring.map(p=>p[1]);
    return [Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];
  }

  function status(text){
    const el=qs('[data-exp-status]');
    if(el)el.textContent=text;
  }

  function generate(base){
    const features=[];
    for(const zone of (base.features||[]).filter(f=>f?.properties?.kind==='development-zone')){
      const phase=Number(zone.properties.phase||1);
      const ring=zone.geometry?.coordinates?.[0];
      if(!ring?.length)continue;
      const [minX,minY,maxX,maxY]=bbox(ring);
      const dx=maxX-minX,dy=maxY-minY;
      const zoneName=zone.properties.zone||'';

      [[.18,.20,.15,.10],[.78,.72,.12,.09]].forEach(([xf,yf,wf,hf],i)=>features.push({
        type:'Feature',properties:{kind:'illustrative-green-pocket',phase,zone:zoneName,confidence:'atmospheric-illustrative',variant:i%2},
        geometry:{type:'Polygon',coordinates:[rect(minX+dx*xf,minY+dy*yf,dx*wf,dy*hf,0)]}
      }));

      const insetX=dx*.055,insetY=dy*.055;
      features.push({
        type:'Feature',properties:{kind:'illustrative-hedge',phase,zone:zoneName,confidence:'atmospheric-illustrative'},
        geometry:{type:'LineString',coordinates:[[minX+insetX,minY+insetY],[maxX-insetX,minY+insetY],[maxX-insetX,maxY-insetY],[minX+insetX,maxY-insetY],[minX+insetX,minY+insetY]]}
      });

      let treeIndex=0;
      for(const xf of [.34,.67]){
        for(let i=0;i<7;i++){
          const t=.12+i*(.76/6),cx=minX+dx*xf+(i%2?dx*.012:-dx*.012),cy=minY+dy*t;
          const height=6.5+((i+phase+treeIndex)%5)*1.15,crown=.000045+((i+phase)%3)*.000010,variant=(i+phase+treeIndex)%3;
          features.push({type:'Feature',properties:{kind:'illustrative-tree-trunk',phase,zone:zoneName,height_m:Math.max(2.4,height*.36),confidence:'atmospheric-illustrative'},geometry:{type:'Polygon',coordinates:[octagon(cx,cy,.0000105,.0000075)]}});
          features.push({type:'Feature',properties:{kind:'illustrative-tree-canopy',phase,zone:zoneName,base_m:Math.max(2.2,height*.28),height_m:height,variant,confidence:'atmospheric-illustrative'},geometry:{type:'Polygon',coordinates:[octagon(cx,cy,crown,crown*.78)]}});
          treeIndex++;
        }
      }

      for(let i=0;i<8;i++){
        const edge=i%4,t=.18+((i*.17)%0.64);let cx,cy;
        if(edge===0){cx=minX+dx*t;cy=minY+dy*.075;}
        else if(edge===1){cx=maxX-dx*.075;cy=minY+dy*t;}
        else if(edge===2){cx=minX+dx*t;cy=maxY-dy*.075;}
        else{cx=minX+dx*.075;cy=minY+dy*t;}
        const height=7.2+((i+phase)%4)*1.25,crown=.000052+((i+phase)%2)*.000012,variant=(i+phase)%3;
        features.push({type:'Feature',properties:{kind:'illustrative-tree-trunk',phase,zone:zoneName,height_m:Math.max(2.6,height*.34),confidence:'atmospheric-illustrative'},geometry:{type:'Polygon',coordinates:[octagon(cx,cy,.000011,.000008)]}});
        features.push({type:'Feature',properties:{kind:'illustrative-tree-canopy',phase,zone:zoneName,base_m:Math.max(2.4,height*.27),height_m:height,variant,confidence:'atmospheric-illustrative'},geometry:{type:'Polygon',coordinates:[octagon(cx,cy,crown,crown*.80)]}});
      }

      for(let i=0;i<4;i++){
        const cx=minX+dx*(.27+i*.16),cy=minY+dy*(i%2?.48:.52),angle=(phase*7+i*11)%16-8;
        features.push({type:'Feature',properties:{kind:'illustrative-car',phase,zone:zoneName,height_m:1.45,variant:(i+phase)%4,confidence:'atmospheric-illustrative'},geometry:{type:'Polygon',coordinates:[rect(cx,cy,.000060,.000018,angle)]}});
      }
    }
    featureCount=features.length;
    return {type:'FeatureCollection',metadata:{status:'atmospheric-illustrative',not_evidence:true,note:'Vegetation, hedge-style planting, green pockets and vehicles are generated presentation aids only. They are not existing ecology records, promoter landscape geometry, traffic forecasts or final design.'},features};
  }

  function safeLayer(spec){
    try{if(!map.getLayer(spec.id))map.addLayer(spec);}catch(error){console.warn(`Scene enrichment layer ${spec.id} unavailable`,error);}
  }

  function applyVisibility(force=false){
    if(!map||!installed)return;
    const on=enabled&&proposalVisible;
    if(!force&&on===lastAppliedVisibility)return;
    lastAppliedVisibility=on;
    for(const id of LAYERS){try{if(map.getLayer(id))map.setLayoutProperty(id,'visibility',on?'visible':'none');}catch(_){}}
    if(button){button.hidden=!proposalVisible;button.setAttribute('aria-pressed',on?'true':'false');button.textContent=enabled?'Scene: enriched':'Scene: simple';}
  }

  function applyPhase(force=false){
    if(!map||!installed)return;
    if(!force&&year===lastAppliedYear)return;
    lastAppliedYear=year;
    const limit=PHASE_LIMIT[year]||7;
    for(const id of LAYERS){try{if(map.getLayer(id))map.setFilter(id,['<=',['get','phase'],limit]);}catch(_){}}
  }

  function ensureControl(){
    if(!installed)return;
    const toolbar=qs('.hud-actions');
    if(!toolbar)return;
    if(!button?.isConnected){
      button=document.createElement('button');
      button.type='button';button.dataset.sceneEnrichment='';button.textContent='Scene: enriched';button.setAttribute('aria-pressed','true');
      button.setAttribute('aria-label','Toggle illustrative landscape enrichment');
      button.title='Atmospheric vegetation, hedgerow-style planting and light vehicle proxies. Illustrative only; not ecology evidence or final design.';
      const bio=toolbar.querySelector('[data-biodiversity]');toolbar.insertBefore(button,bio||toolbar.querySelector('[data-exit]')||null);
      button.addEventListener('click',()=>{enabled=!enabled;applyVisibility(true);status(enabled?`Enriched scene on · ${featureCount.toLocaleString('en-GB')} atmospheric features · illustrative, not ecology evidence`:'Enriched scene off · analytical proposal only');});
    }
    button.hidden=!proposalVisible;
  }

  function scheduleInstall(){
    if(installed||installing||!map||!proposalVisible)return;
    if(!map.isStyleLoaded?.()){
      if(!waitingForStyle){waitingForStyle=true;map.once('load',()=>{waitingForStyle=false;scheduleInstall();});}
      return;
    }
    clearTimeout(deferredInstallTimer);
    deferredInstallTimer=setTimeout(install,450);
  }

  async function install(){
    if(installed||installing||!map||!proposalVisible)return;
    installing=true;
    try{
      const response=await fetch('data/proposal-preview.geojson?v=22',{cache:'no-store'});
      if(!response.ok)throw new Error(`proposal preview HTTP ${response.status}`);
      const data=generate(await response.json());
      if(!map.getSource(SOURCE))map.addSource(SOURCE,{type:'geojson',data});
      safeLayer({id:'nb-scene-green-pockets',type:'fill',source:SOURCE,filter:['==',['get','kind'],'illustrative-green-pocket'],layout:{visibility:'none'},paint:{'fill-color':['match',['get','variant'],0,'#7f9d6b','#91aa78'],'fill-opacity':.36,'fill-outline-color':'#6d8b60'}});
      safeLayer({id:'nb-scene-hedges',type:'line',source:SOURCE,filter:['==',['get','kind'],'illustrative-hedge'],layout:{visibility:'none','line-cap':'round','line-join':'round'},paint:{'line-color':'#38573a','line-width':['interpolate',['linear'],['zoom'],12,.8,15,3.2,17,5.2],'line-opacity':.82}});
      safeLayer({id:'nb-scene-tree-trunks',type:'fill-extrusion',source:SOURCE,filter:['==',['get','kind'],'illustrative-tree-trunk'],layout:{visibility:'none'},paint:{'fill-extrusion-color':'#6c523e','fill-extrusion-base':0,'fill-extrusion-height':['get','height_m'],'fill-extrusion-opacity':.88}});
      safeLayer({id:'nb-scene-tree-canopies',type:'fill-extrusion',source:SOURCE,filter:['==',['get','kind'],'illustrative-tree-canopy'],minzoom:12.2,layout:{visibility:'none'},paint:{'fill-extrusion-color':['match',['get','variant'],0,'#4f744b',1,'#628458','#759064'],'fill-extrusion-base':['get','base_m'],'fill-extrusion-height':['get','height_m'],'fill-extrusion-opacity':.84,'fill-extrusion-vertical-gradient':true}});
      safeLayer({id:'nb-scene-cars',type:'fill-extrusion',source:SOURCE,filter:['==',['get','kind'],'illustrative-car'],minzoom:13.8,layout:{visibility:'none'},paint:{'fill-extrusion-color':['match',['get','variant'],0,'#69747d',1,'#8a4f43',2,'#d0c6ae','#40484c'],'fill-extrusion-base':0,'fill-extrusion-height':['get','height_m'],'fill-extrusion-opacity':.92}});
      installed=true;installing=false;ensureControl();applyPhase(true);applyVisibility(true);
    }catch(error){installing=false;console.warn('Scene enrichment unavailable',error);}
  }

  function syncFromProposal(){
    const p=window.NorthBarnesProposal?.state?.();
    if(!p)return;
    const nextVisible=!!p.visible,nextYear=Number(p.year||25);
    const visibilityChanged=nextVisible!==proposalVisible,yearChanged=nextYear!==year;
    proposalVisible=nextVisible;year=nextYear;
    if(proposalVisible&&!installed)scheduleInstall();
    if(installed){if(yearChanged)applyPhase();if(visibilityChanged)applyVisibility();ensureControl();}
  }

  function discoverMap(){
    const candidate=window.__northBarnesMap;
    if(!candidate||candidate===map)return;
    map=candidate;installed=false;installing=false;waitingForStyle=false;lastAppliedYear=null;lastAppliedVisibility=null;
    syncFromProposal();
  }

  window.NorthBarnesSceneEnrichment={version:VERSION,state:()=>({installed,installing,enabled,proposalVisible,year,featureCount,classification:'atmospheric-illustrative'}),setEnabled:on=>{enabled=!!on;applyVisibility(true);}};

  discoverMap();
  const mapFinder=setInterval(()=>{discoverMap();if(map)clearInterval(mapFinder);},500);
  const stateWatcher=setInterval(syncFromProposal,1000);
  document.addEventListener('click',event=>{if(event.target?.closest?.('[data-proposal-toggle],[data-proposal-phase],[data-cinematic-tour]'))setTimeout(syncFromProposal,80);},{passive:true});
  addEventListener('pagehide',()=>{clearInterval(mapFinder);clearInterval(stateWatcher);clearTimeout(deferredInstallTimer);},{once:true});
})();