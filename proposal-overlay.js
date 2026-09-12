(() => {
  const SOURCE_ID='north-barnes-proposal-preview';
  const LAYERS=['nb-proposal-envelope-fill','nb-proposal-envelope-line','nb-proposal-zones','nb-proposal-streets','nb-proposal-buildings'];
  const CENTER=[-0.049,50.9335];
  const PHASES=[5,10,15,20,25];
  const PHASE_LIMIT={5:2,10:3,15:4,20:5,25:7};
  const HOMES={5:700,10:1400,15:2100,20:2650,25:3000};
  let map=null;
  let visible=false;
  let button=null;
  let phaseButton=null;
  let card=null;
  let installed=false;
  let year=25;
  let footprintCount=0;

  function css(){
    if(document.getElementById('nb-proposal-css')) return;
    const style=document.createElement('style');
    style.id='nb-proposal-css';
    style.textContent=`[data-proposal-toggle][aria-pressed="true"]{background:#f3d37a!important;color:#142218!important;border-color:#fff8!important}[data-proposal-phase]{background:#ffffff18!important}#nb-proposal-card{position:absolute;z-index:6;right:18px;bottom:58px;width:min(430px,calc(100% - 36px));padding:14px 16px;border:1px solid #ffffff45;border-radius:15px;background:#07110dec;color:#fff;box-shadow:0 15px 50px #0007;backdrop-filter:blur(10px);pointer-events:none;font-size:.78rem;line-height:1.42}#nb-proposal-card[hidden]{display:none}#nb-proposal-card strong{display:block;font-size:.92rem;margin-bottom:4px}#nb-proposal-card span{display:block;color:#d7e1d7}#nb-proposal-card b{color:#f3d37a}.nb-proposal-legend{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}.nb-proposal-legend em{font-style:normal;padding:3px 7px;border-radius:999px;background:#ffffff12;border:1px solid #ffffff24;color:#e5ede5}@media(max-width:600px){#nb-proposal-card{left:12px;right:12px;bottom:112px;width:auto;max-height:32vh;overflow:hidden}.hud-actions{padding-bottom:2px}}`;
    document.head.appendChild(style);
  }

  function status(text){
    const el=document.querySelector('[data-exp-status]');
    if(el) el.textContent=text;
  }

  function updateCard(){
    ensureCard();
    if(!card) return;
    card.innerHTML=`<strong>Illustrative North Barnes build-out · Year ${year}</strong><span><b>Up to ${HOMES[year].toLocaleString('en-GB')} homes</b> in the analytical scenario at this stage. ${footprintCount||'Hundreds of'} small 3D footprints are used to communicate urban grain and scale; they are <b>not</b> a 1:1 count of homes or final building positions.</span><div class="nb-proposal-legend"><em>gold line · study envelope</em><em>sand · residential massing</em><em>grey · illustrative streets</em></div><span style="margin-top:7px">Exact masterplan, road, junction and building geometry remains pending verified GIS. This layer is not for planning or survey use.</span>`;
  }

  function ensureCard(){
    if(card?.isConnected) return card;
    const host=document.getElementById('immersive-experience');
    if(!host) return null;
    card=document.createElement('div');
    card.id='nb-proposal-card';
    card.hidden=true;
    host.appendChild(card);
    updateCard();
    return card;
  }

  function ensureControls(){
    const toolbar=document.querySelector('.hud-actions');
    if(!toolbar) return;
    if(!button?.isConnected){
      button=document.createElement('button');
      button.type='button';
      button.dataset.proposalToggle='';
      button.setAttribute('aria-pressed','false');
      button.textContent='Proposal';
      const site=toolbar.querySelector('[data-view="site"]');
      if(site?.nextSibling) toolbar.insertBefore(button,site.nextSibling); else toolbar.appendChild(button);
      button.addEventListener('click',()=>setVisible(!visible,true));
    }
    if(!phaseButton?.isConnected){
      phaseButton=document.createElement('button');
      phaseButton.type='button';
      phaseButton.dataset.proposalPhase='';
      phaseButton.textContent=`Year ${year}`;
      phaseButton.hidden=true;
      if(button?.nextSibling) toolbar.insertBefore(phaseButton,button.nextSibling); else toolbar.appendChild(phaseButton);
      phaseButton.addEventListener('click',()=>{
        const i=PHASES.indexOf(year);
        year=PHASES[(i+1)%PHASES.length];
        applyPhase();
      });
    }
  }

  function rect(cx,cy,w,h,angle=0){
    const a=angle*Math.PI/180,ca=Math.cos(a),sa=Math.sin(a);
    const pts=[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]];
    const ring=pts.map(([x,y])=>[cx+x*ca-y*sa,cy+x*sa+y*ca]);
    ring.push(ring[0]);
    return ring;
  }

  function bbox(ring){
    const xs=ring.map(p=>p[0]),ys=ring.map(p=>p[1]);
    return [Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];
  }

  function enrich(base){
    const retained=base.features.filter(f=>!['building','illustrative-street'].includes(f?.properties?.kind));
    const extra=[];
    footprintCount=0;
    for(const zone of base.features.filter(f=>f?.properties?.kind==='development-zone')){
      const phase=Number(zone.properties.phase||1);
      const ring=zone.geometry?.coordinates?.[0];
      if(!ring?.length) continue;
      const [minX,minY,maxX,maxY]=bbox(ring);
      const cols=8,rows=6;
      const dx=(maxX-minX)/cols,dy=(maxY-minY)/rows;

      // Two light internal street guides per neighbourhood. They are explicitly
      // illustrative and exist to make the massing legible, not to imply a road layout.
      for(const f of [0.34,0.67]){
        extra.push({type:'Feature',properties:{kind:'illustrative-street',phase,confidence:'illustrative'},geometry:{type:'LineString',coordinates:[[minX+(maxX-minX)*f,minY+dy*.25],[minX+(maxX-minX)*f,maxY-dy*.25]]}});
      }
      extra.push({type:'Feature',properties:{kind:'illustrative-street',phase,confidence:'illustrative'},geometry:{type:'LineString',coordinates:[[minX+dx*.25,minY+(maxY-minY)*.5],[maxX-dx*.25,minY+(maxY-minY)*.5]]}});

      for(let r=0;r<rows;r++){
        for(let c=0;c<cols;c++){
          // Deliberate gaps stop the massing reading as a continuous slab and leave
          // space for green/streets without asserting exact public-realm geometry.
          if((r*cols+c+phase)%9===0 || (r===2&&c%3===1)) continue;
          const cx=minX+(c+.5)*dx;
          const cy=minY+(r+.5)*dy;
          const w=dx*(0.30+((c+phase)%3)*0.035);
          const h=dy*(0.28+((r+phase)%3)*0.04);
          const angle=((phase*7+r*3+c*2)%14)-7;
          const height=6.8+((r+c+phase)%4)*1.15;
          extra.push({type:'Feature',properties:{kind:'building-detailed',zone:zone.properties.zone||'',phase,height_m:height,confidence:'illustrative',typology:(c+r)%4===0?'terrace':'house'},geometry:{type:'Polygon',coordinates:[rect(cx,cy,w,h,angle)]}});
          footprintCount++;
        }
      }
    }
    return {...base,features:[...retained,...extra],metadata:{...(base.metadata||{}),viewer_generated_footprints:footprintCount,viewer_note:'Procedural low-rise massing is analytical only and is not final promoter or planning geometry.'}};
  }

  function setLayerVisibility(on){
    if(!map) return;
    const value=on?'visible':'none';
    LAYERS.forEach(id=>{try{if(map.getLayer(id))map.setLayoutProperty(id,'visibility',value);}catch(_){}});
  }

  function applyPhase(){
    ensureControls();
    const limit=PHASE_LIMIT[year]||7;
    if(phaseButton) phaseButton.textContent=`Year ${year}`;
    if(map){
      const phasedKinds={
        'nb-proposal-zones':'development-zone',
        'nb-proposal-streets':'illustrative-street',
        'nb-proposal-buildings':'building-detailed'
      };
      for(const [id,kind] of Object.entries(phasedKinds)){
        try{if(map.getLayer(id))map.setFilter(id,['all',['==',['get','kind'],kind],['<=',['get','phase'],limit]]);}catch(_){}
      }
    }
    updateCard();
    if(visible) status(`Illustrative proposal · Year ${year} · up to ${HOMES[year].toLocaleString('en-GB')} homes in scenario`);
  }

  function setVisible(on,fly=false){
    visible=!!on;
    ensureControls();
    ensureCard();
    if(button){button.setAttribute('aria-pressed',visible?'true':'false');button.textContent=visible?'Proposal: on':'Proposal';}
    if(phaseButton) phaseButton.hidden=!visible;
    if(card) card.hidden=!visible;
    setLayerVisibility(visible);
    applyPhase();
    if(visible){
      if(fly&&map){try{map.flyTo({center:CENTER,zoom:13.75,pitch:56,bearing:8,duration:1900,essential:true});}catch(_){}}
    }else{
      status('Existing landscape · proposal preview off');
    }
  }

  async function addLayers(){
    if(!map||installed) return;
    const run=async()=>{
      if(installed||!map?.isStyleLoaded?.()) return;
      try{
        const response=await fetch('data/proposal-preview.geojson',{cache:'no-store'});
        if(!response.ok) throw new Error(`proposal preview HTTP ${response.status}`);
        const data=enrich(await response.json());
        if(!map.getSource(SOURCE_ID)) map.addSource(SOURCE_ID,{type:'geojson',data});
        map.addLayer({id:'nb-proposal-envelope-fill',type:'fill',source:SOURCE_ID,filter:['==',['get','kind'],'site-envelope'],layout:{visibility:'none'},paint:{'fill-color':'#f3d37a','fill-opacity':0.075}});
        map.addLayer({id:'nb-proposal-envelope-line',type:'line',source:SOURCE_ID,filter:['==',['get','kind'],'site-envelope'],layout:{visibility:'none'},paint:{'line-color':'#ffe7a1','line-width':3.5,'line-opacity':0.95}});
        map.addLayer({id:'nb-proposal-zones',type:'fill',source:SOURCE_ID,filter:['==',['get','kind'],'development-zone'],layout:{visibility:'none'},paint:{'fill-color':'#d8b77b','fill-opacity':0.10,'fill-outline-color':'#efd6a7'}});
        map.addLayer({id:'nb-proposal-streets',type:'line',source:SOURCE_ID,filter:['==',['get','kind'],'illustrative-street'],layout:{visibility:'none','line-cap':'round'},paint:{'line-color':'#5c6060','line-width':['interpolate',['linear'],['zoom'],12,1,15,3.2],'line-opacity':0.68}});
        map.addLayer({id:'nb-proposal-buildings',type:'fill-extrusion',source:SOURCE_ID,filter:['==',['get','kind'],'building-detailed'],layout:{visibility:'none'},paint:{'fill-extrusion-color':['interpolate',['linear'],['get','phase'],1,'#ddc6a8',4,'#c18f69',7,'#a47156'],'fill-extrusion-height':['get','height_m'],'fill-extrusion-base':0,'fill-extrusion-opacity':0.91,'fill-extrusion-vertical-gradient':true}});
        installed=true;
        setLayerVisibility(visible);
        applyPhase();
      }catch(error){
        console.warn('Proposal preview layer unavailable',error);
        status('Proposal preview could not be loaded · existing terrain remains available');
      }
    };
    if(map.isStyleLoaded?.()) await run(); else map.once('load',run);
  }

  function attach(m){
    map=m;
    window.__northBarnesMap=m;
    ensureControls();
    ensureCard();
    addLayers();
  }

  function wrapMapLibre(lib){
    if(!lib?.Map||lib.__northBarnesProposalWrapped) return lib;
    const Original=lib.Map;
    class NorthBarnesMap extends Original{
      constructor(options){super(options);attach(this);}
    }
    try{Object.setPrototypeOf(NorthBarnesMap,Original);}catch(_){}
    lib.Map=NorthBarnesMap;
    lib.__northBarnesProposalWrapped=true;
    return lib;
  }

  function hookMapLibre(){
    if(window.maplibregl){wrapMapLibre(window.maplibregl);return;}
    try{
      let value;
      Object.defineProperty(window,'maplibregl',{configurable:true,enumerable:true,get(){return value;},set(v){value=wrapMapLibre(v);Object.defineProperty(window,'maplibregl',{configurable:true,writable:true,enumerable:true,value});}});
    }catch(error){console.warn('MapLibre proposal hook unavailable',error);}
  }

  // Illustrative proposal preview — release-gate wording retained deliberately.
  css();
  ensureControls();
  ensureCard();
  hookMapLibre();
  new MutationObserver(()=>{ensureControls();ensureCard();}).observe(document.documentElement,{subtree:true,childList:true});
})();
