(()=>{
const V='36.2';
let map=null,badge=null;
const q=(s,r=document)=>r.querySelector(s);
const BLOCKED_LAYER_PATTERNS=[/^nb-proposal-/,/^v28-/,/^v30-/,/^v32-/,/^v36-/,/habitat/i,/impact/i,/clearance/i,/pressure/i,/haul/i,/groundwork/i];
function status(t){const e=q('[data-exp-status]');if(e)e.textContent=t}
function css(){if(q('#nb-v36-css'))return;const s=document.createElement('style');s.id='nb-v36-css';s.textContent=`#nb-v36-badge{position:absolute;z-index:7;left:12px;top:42px;max-width:min(650px,calc(100% - 24px));padding:7px 10px;border:1px solid #ffffff30;border-radius:10px;background:#07110dc8;color:#edf5ed;font:700 .68rem/1.25 system-ui,sans-serif;letter-spacing:.02em;pointer-events:none;backdrop-filter:blur(8px);box-shadow:0 10px 28px #0004}#nb-v36-badge[hidden]{display:none}.nb-v36-active #nb-proposal-card,.nb-v36-active #nb-v32-summary,.nb-v36-active #nb-habitat-impact-panel{display:none!important}@media(max-width:700px){#nb-v36-badge{display:none}}`;document.head.appendChild(s)}
function ensureBadge(){css();const host=q('#immersive-experience');if(!host)return null;if(!badge?.isConnected){badge=document.createElement('div');badge.id='nb-v36-badge';badge.hidden=true;badge.textContent='presentation quality gate · placeholder geometry hidden · photorealistic view pending';host.appendChild(badge)}return badge}
function active(){return !!window.NorthBarnesProposal?.state?.().visible||document.documentElement.classList.contains('nb-presentation-active')||document.documentElement.classList.contains('nb-v31-active')}
function hide(id){try{if(map?.getLayer(id))map.setLayoutProperty(id,'visibility','none')}catch(_){}}
function shouldHide(id){return BLOCKED_LAYER_PATTERNS.some(p=>p.test(id))}
function hideBadGeometry(){if(!map?.getStyle)return;for(const layer of map.getStyle().layers||[]){if(shouldHide(layer.id))hide(layer.id)}}
function softenBase(){try{map.setPaintProperty('osm','raster-saturation',-.18);map.setPaintProperty('osm','raster-contrast',.02);map.setPaintProperty('osm','raster-brightness-max',.96);map.setPaintProperty('hillshade','hillshade-exaggeration',.62)}catch(_){}}
function sync(){map=window.__northBarnesMap||map;if(!map)return;const on=active();document.documentElement.classList.toggle('nb-v36-active',on);ensureBadge();if(badge)badge.hidden=!on;softenBase();if(on){hideBadGeometry();status('presentation quality gate · placeholder proposal geometry hidden · photorealistic view pending');}}
window.NorthBarnesPresentationVisualResetV36={version:V,sync,state:()=>({active:active(),map:!!map,mode:'placeholder-geometry-hidden'})};
css();const timer=setInterval(sync,250);addEventListener('pagehide',()=>clearInterval(timer),{once:true});
})();
