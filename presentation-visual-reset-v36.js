(()=>{
const V='36.0';
const OLD_PROPOSAL=['nb-proposal-envelope-fill','nb-proposal-envelope-line','nb-proposal-zones','nb-proposal-streets','nb-proposal-buildings','nb-proposal-roofs'];
const ORGANIC=['v32-groundworks','v32-haul-casing','v32-haul','v32-green','v32-water','v32-road-casing','v32-roads','v32-homes','v32-roofs','v32-trees'];
let map=null,styled=false,badge=null;
const q=(s,r=document)=>r.querySelector(s);
function status(t){const e=q('[data-exp-status]');if(e)e.textContent=t}
function css(){if(q('#nb-v36-css'))return;const s=document.createElement('style');s.id='nb-v36-css';s.textContent=`#nb-v36-badge{position:absolute;z-index:7;left:12px;top:42px;max-width:min(560px,calc(100% - 24px));padding:7px 10px;border:1px solid #ffffff30;border-radius:10px;background:#07110dbf;color:#edf5ed;font:700 .68rem/1.25 system-ui,sans-serif;letter-spacing:.02em;pointer-events:none;backdrop-filter:blur(8px);box-shadow:0 10px 28px #0004}#nb-v36-badge[hidden]{display:none}.nb-v36-active #nb-proposal-card{display:none!important}.nb-v36-active #nb-v32-summary{display:none!important}@media(max-width:700px){#nb-v36-badge{display:none}}`;document.head.appendChild(s)}
function ensureBadge(){css();const host=q('#immersive-experience');if(!host)return null;if(!badge?.isConnected){badge=document.createElement('div');badge.id='nb-v36-badge';badge.hidden=true;badge.textContent='v36 presentation view · organic illustrative massing · exact layout not claimed';host.appendChild(badge)}return badge}
function hide(id){try{if(map?.getLayer(id))map.setLayoutProperty(id,'visibility','none')}catch(_){}}
function show(id){try{if(map?.getLayer(id))map.setLayoutProperty(id,'visibility','visible')}catch(_){}}
function paint(id,prop,val){try{if(map?.getLayer(id))map.setPaintProperty(id,prop,val)}catch(_){}}
function styleOrganic(){if(!map||styled)return;styled=true;try{map.setPaintProperty('osm','raster-saturation',-.28);map.setPaintProperty('osm','raster-contrast',.02);map.setPaintProperty('osm','raster-brightness-max',.92)}catch(_){}
 paint('v32-groundworks','fill-opacity',.18);paint('v32-groundworks','fill-color','#7f735f');
 paint('v32-haul-casing','line-opacity',.22);paint('v32-haul','line-opacity',.34);paint('v32-road-casing','line-opacity',.28);paint('v32-roads','line-opacity',.66);
 paint('v32-green','fill-opacity',.45);paint('v32-water','fill-opacity',.58);
 paint('v32-homes','fill-extrusion-opacity',.82);paint('v32-homes','fill-extrusion-color',['match',['get','typology'],'apartment','#9b7f69','courtyard','#a89076','terrace','#b7a083','semi-detached','#c2ad8e','#cab894']);
 paint('v32-roofs','fill-extrusion-opacity',.88);paint('v32-roofs','fill-extrusion-color','#675447');
 paint('v32-trees','circle-radius',['interpolate',['linear'],['zoom'],12,1.2,14,3.2,16,6.0]);paint('v32-trees','circle-opacity',.72);
}
function active(){return !!window.NorthBarnesProposal?.state?.().visible||document.documentElement.classList.contains('nb-presentation-active')||document.documentElement.classList.contains('nb-v31-active')}
function sync(){map=window.__northBarnesMap||map;if(!map)return;styleOrganic();const on=active();document.documentElement.classList.toggle('nb-v36-active',on);ensureBadge();if(badge)badge.hidden=!on;
 if(on){OLD_PROPOSAL.forEach(hide);ORGANIC.forEach(show);status('v36 presentation view · organic illustrative massing · exact layout not claimed');}
}
window.NorthBarnesPresentationVisualResetV36={version:V,sync,state:()=>({active:active(),map:!!map})};
css();const timer=setInterval(sync,450);addEventListener('pagehide',()=>clearInterval(timer),{once:true});
})();
