(() => {
  const SOURCE_ID='north-barnes-proposal-preview';
  const LAYERS=['nb-proposal-envelope-fill','nb-proposal-envelope-line','nb-proposal-zones','nb-proposal-buildings'];
  const CENTER=[-0.049,50.9335];
  let map=null;
  let visible=false;
  let button=null;
  let card=null;
  let installed=false;

  function css(){
    if(document.getElementById('nb-proposal-css')) return;
    const style=document.createElement('style');
    style.id='nb-proposal-css';
    style.textContent=`[data-proposal-toggle][aria-pressed="true"]{background:#f3d37a!important;color:#142218!important;border-color:#fff8!important}#nb-proposal-card{position:absolute;z-index:6;right:18px;bottom:58px;width:min(390px,calc(100% - 36px));padding:13px 15px;border:1px solid #ffffff45;border-radius:15px;background:#07110de8;color:#fff;box-shadow:0 15px 50px #0007;backdrop-filter:blur(10px);pointer-events:none;font-size:.78rem;line-height:1.4}#nb-proposal-card[hidden]{display:none}#nb-proposal-card strong{display:block;font-size:.9rem;margin-bottom:3px}#nb-proposal-card span{color:#d7e1d7}@media(max-width:600px){#nb-proposal-card{left:12px;right:12px;bottom:112px;width:auto}}`;
    document.head.appendChild(style);
  }

  function status(text){
    const el=document.querySelector('[data-exp-status]');
    if(el) el.textContent=text;
  }

  function ensureCard(){
    if(card) return card;
    const host=document.getElementById('immersive-experience');
    if(!host) return null;
    card=document.createElement('div');
    card.id='nb-proposal-card';
    card.hidden=true;
    card.innerHTML='<strong>Illustrative proposal preview</strong><span>Shows the scale of development within an analytical Site 11EC envelope. Building blocks and zone positions are illustrative massing, not a final masterplan, planning boundary or survey geometry.</span>';
    host.appendChild(card);
    return card;
  }

  function ensureButton(){
    if(button?.isConnected) return button;
    const toolbar=document.querySelector('.hud-actions');
    if(!toolbar) return null;
    button=document.createElement('button');
    button.type='button';
    button.dataset.proposalToggle='';
    button.setAttribute('aria-pressed','false');
    button.textContent='Proposal';
    const site=toolbar.querySelector('[data-view="site"]');
    if(site?.nextSibling) toolbar.insertBefore(button,site.nextSibling); else toolbar.appendChild(button);
    button.addEventListener('click',()=>setVisible(!visible,true));
    return button;
  }

  function setLayerVisibility(on){
    if(!map) return;
    const value=on?'visible':'none';
    LAYERS.forEach(id=>{try{if(map.getLayer(id))map.setLayoutProperty(id,'visibility',value);}catch(_){}});
  }

  function setVisible(on,fly=false){
    visible=!!on;
    ensureButton();
    ensureCard();
    if(button){button.setAttribute('aria-pressed',visible?'true':'false');button.textContent=visible?'Proposal: on':'Proposal';}
    if(card) card.hidden=!visible;
    setLayerVisibility(visible);
    if(visible){
      status('Illustrative proposal massing · exact GIS geometry still pending');
      if(fly&&map){try{map.flyTo({center:CENTER,zoom:14.15,pitch:62,bearing:8,duration:1800,essential:true});}catch(_){}}
    }else{
      status('Existing landscape · proposal preview off');
    }
  }

  function addLayers(){
    if(!map||installed) return;
    const run=()=>{
      if(installed||!map?.isStyleLoaded?.()) return;
      try{
        if(!map.getSource(SOURCE_ID)) map.addSource(SOURCE_ID,{type:'geojson',data:'data/proposal-preview.geojson'});
        map.addLayer({id:'nb-proposal-envelope-fill',type:'fill',source:SOURCE_ID,filter:['==',['get','kind'],'site-envelope'],layout:{visibility:'none'},paint:{'fill-color':'#f3d37a','fill-opacity':0.10}});
        map.addLayer({id:'nb-proposal-envelope-line',type:'line',source:SOURCE_ID,filter:['==',['get','kind'],'site-envelope'],layout:{visibility:'none'},paint:{'line-color':'#ffe7a1','line-width':4,'line-opacity':0.95}});
        map.addLayer({id:'nb-proposal-zones',type:'fill',source:SOURCE_ID,filter:['==',['get','kind'],'development-zone'],layout:{visibility:'none'},paint:{'fill-color':'#c99555','fill-opacity':0.20,'fill-outline-color':'#f4d8a5'}});
        map.addLayer({id:'nb-proposal-buildings',type:'fill-extrusion',source:SOURCE_ID,filter:['==',['get','kind'],'building'],layout:{visibility:'none'},paint:{'fill-extrusion-color':['interpolate',['linear'],['get','phase'],1,'#d9c0a3',4,'#b98562',7,'#8e6c57'],'fill-extrusion-height':['get','height_m'],'fill-extrusion-base':0,'fill-extrusion-opacity':0.84}});
        installed=true;
        setLayerVisibility(visible);
      }catch(error){
        console.warn('Proposal preview layer unavailable',error);
        status('Proposal preview could not be loaded · existing terrain remains available');
      }
    };
    if(map.isStyleLoaded?.()) run(); else map.once('load',run);
  }

  function attach(m){
    map=m;
    window.__northBarnesMap=m;
    ensureButton();
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

  css();
  ensureButton();
  ensureCard();
  hookMapLibre();
  new MutationObserver(()=>{ensureButton();ensureCard();}).observe(document.documentElement,{subtree:true,childList:true});
})();
