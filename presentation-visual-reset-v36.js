(()=>{
const V='36.1',SRC='north-barnes-v36-cinematic-massing';
const OLD_PROPOSAL=['nb-proposal-envelope-fill','nb-proposal-envelope-line','nb-proposal-zones','nb-proposal-streets','nb-proposal-buildings','nb-proposal-roofs'];
const TOY_SETTLEMENT=['v32-groundworks','v32-haul-casing','v32-haul','v32-green','v32-water','v32-road-casing','v32-roads','v32-homes','v32-roofs','v32-trees'];
const V36=['v36-landscape-loss','v36-earthworks','v36-massing','v36-road-pressure-casing','v36-road-pressure','v36-canopy'];
let map=null,styled=false,installed=false,badge=null;
const q=(s,r=document)=>r.querySelector(s);
function status(t){const e=q('[data-exp-status]');if(e)e.textContent=t}
function css(){if(q('#nb-v36-css'))return;const s=document.createElement('style');s.id='nb-v36-css';s.textContent=`#nb-v36-badge{position:absolute;z-index:7;left:12px;top:42px;max-width:min(620px,calc(100% - 24px));padding:7px 10px;border:1px solid #ffffff30;border-radius:10px;background:#07110dbf;color:#edf5ed;font:700 .68rem/1.25 system-ui,sans-serif;letter-spacing:.02em;pointer-events:none;backdrop-filter:blur(8px);box-shadow:0 10px 28px #0004}#nb-v36-badge[hidden]{display:none}.nb-v36-active #nb-proposal-card{display:none!important}.nb-v36-active #nb-v32-summary{display:none!important}@media(max-width:700px){#nb-v36-badge{display:none}}`;document.head.appendChild(s)}
function ensureBadge(){css();const host=q('#immersive-experience');if(!host)return null;if(!badge?.isConnected){badge=document.createElement('div');badge.id='nb-v36-badge';badge.hidden=true;badge.textContent='v36 presentation view · cinematic illustrative massing · exact layout not claimed';host.appendChild(badge)}return badge}
function hide(id){try{if(map?.getLayer(id))map.setLayoutProperty(id,'visibility','none')}catch(_){}}
function show(id){try{if(map?.getLayer(id))map.setLayoutProperty(id,'visibility','visible')}catch(_){}}
function paint(id,prop,val){try{if(map?.getLayer(id))map.setPaintProperty(id,prop,val)}catch(_){}}
function blob(cx,cy,rx,ry,n=30,seed=1){const pts=[];for(let i=0;i<n;i++){const a=2*Math.PI*i/n;const wob=1+0.12*Math.sin(a*3+seed)+0.07*Math.cos(a*5+seed*.7);pts.push([cx+Math.cos(a)*rx*wob,cy+Math.sin(a)*ry*wob])}pts.push(pts[0]);return pts}
function F(kind,phase,geometry,p={}){return{type:'Feature',properties:{kind,phase,geometry_status:'illustrative',evidence_status:'visual-communication-not-final-design',...p},geometry}}
function data(){const centres=[[-0.0570,50.9310,.0100,.0044,1,5.0],[-0.0515,50.9330,.0112,.0048,2,5.6],[-0.0452,50.9343,.0100,.0042,3,6.2],[-0.0398,50.9350,.0086,.0038,4,5.2],[-0.0492,50.9288,.0094,.0039,5,4.8],[-0.0436,50.9302,.0076,.0032,4,4.6]];const features=[];
 for(const [cx,cy,rx,ry,ph,h] of centres){features.push(F('loss',ph,{type:'Polygon',coordinates:[blob(cx,cy,rx*1.42,ry*1.55,34,ph)]},{impact:'field-fabric-replaced'}));features.push(F('earthworks',ph,{type:'Polygon',coordinates:[blob(cx,cy,rx*1.08,ry*1.14,32,ph+4)]},{impact:'clearance-and-ground-disturbance'}));features.push(F('massing',ph,{type:'Polygon',coordinates:[blob(cx,cy,rx*.82,ry*.86,28,ph+8)]},{height_m:h,impact:'low-rise-settlement-mass'}));}
 const roads=[[-0.064,50.9285],[-0.057,50.9302],[-0.051,50.9318],[-0.045,50.9331],[-0.039,50.9344],[-0.034,50.9360]];features.push(F('road',1,{type:'LineString',coordinates:roads},{impact:'primary-access-pressure'}));
 features.push(F('road',2,{type:'LineString',coordinates:[[-0.059,50.932],[-0.052,50.933],[-0.046,50.934],[-0.039,50.935]]},{impact:'internal-service-pressure'}));
 features.push(F('road',3,{type:'LineString',coordinates:[[-0.053,50.9278],[-0.049,50.9294],[-0.046,50.9312],[-0.044,50.9332]]},{impact:'construction-and-service-pressure'}));
 for(let i=0;i<120;i++){const t=i/119;const x=-0.064+0.032*((i*37)%119)/119;const y=50.9278+0.0105*((i*53)%119)/119;features.push(F('canopy',1,{type:'Point',coordinates:[x,y]},{impact:'retained-or-replanted-landscape-structure',radius:2+((i*7)%5)}));}
 return{type:'FeatureCollection',metadata:{version:V,status:'presentation-only cinematic massing, not planning geometry',not_for_planning_use:true},features};}
function install(){if(!map||installed||!map.isStyleLoaded?.())return;try{if(!map.getSource(SRC))map.addSource(SRC,{type:'geojson',data:data()});
 map.addLayer({id:'v36-landscape-loss',type:'fill',source:SRC,filter:['==',['get','kind'],'loss'],layout:{visibility:'none'},paint:{'fill-color':'#b99c6d','fill-opacity':.20,'fill-outline-color':'#d6bd89'}});
 map.addLayer({id:'v36-earthworks',type:'fill',source:SRC,filter:['==',['get','kind'],'earthworks'],layout:{visibility:'none'},paint:{'fill-color':'#7f6e58','fill-opacity':.30,'fill-outline-color':'#a8916b'}});
 map.addLayer({id:'v36-massing',type:'fill-extrusion',source:SRC,filter:['==',['get','kind'],'massing'],layout:{visibility:'none'},paint:{'fill-extrusion-color':['interpolate',['linear'],['get','height_m'],4,'#9c896e',6,'#b09a7b',7,'#c1a883'],'fill-extrusion-height':['get','height_m'],'fill-extrusion-base':0,'fill-extrusion-opacity':.72,'fill-extrusion-vertical-gradient':true}});
 map.addLayer({id:'v36-road-pressure-casing',type:'line',source:SRC,filter:['==',['get','kind'],'road'],layout:{visibility:'none','line-cap':'round','line-join':'round'},paint:{'line-color':'#453a2e','line-opacity':.48,'line-width':['interpolate',['linear'],['zoom'],12,3,15,13]}});
 map.addLayer({id:'v36-road-pressure',type:'line',source:SRC,filter:['==',['get','kind'],'road'],layout:{visibility:'none','line-cap':'round','line-join':'round'},paint:{'line-color':'#b89d75','line-opacity':.70,'line-width':['interpolate',['linear'],['zoom'],12,1.8,15,8]}});
 map.addLayer({id:'v36-canopy',type:'circle',source:SRC,filter:['==',['get','kind'],'canopy'],layout:{visibility:'none'},paint:{'circle-color':'#416843','circle-opacity':.58,'circle-radius':['interpolate',['linear'],['zoom'],12,.8,14,2.6,16,5.8],'circle-stroke-color':'#243d2a','circle-stroke-opacity':.45,'circle-stroke-width':.5}});
 installed=true;}catch(e){console.warn('v36 massing install failed',e)}}
function styleBase(){if(!map||styled)return;styled=true;try{map.setPaintProperty('osm','raster-saturation',-.34);map.setPaintProperty('osm','raster-contrast',.0);map.setPaintProperty('osm','raster-brightness-max',.91);map.setPaintProperty('hillshade','hillshade-exaggeration',.68)}catch(_){}}
function active(){return !!window.NorthBarnesProposal?.state?.().visible||document.documentElement.classList.contains('nb-presentation-active')||document.documentElement.classList.contains('nb-v31-active')}
function phaseLimit(){const y=window.NorthBarnesProposal?.state?.().year||25;return y<=5?1:y<=10?2:y<=15?3:y<=20?4:5}
function setV36(on){for(const id of V36)show(id);if(!on){for(const id of V36)hide(id);return}const lim=phaseLimit();for(const id of ['v36-landscape-loss','v36-earthworks','v36-massing'])try{map.setFilter(id,['all',['==',['get','kind'],id.includes('loss')?'loss':id.includes('earthworks')?'earthworks':'massing'],['<=',['get','phase'],lim]])}catch(_){} }
function sync(){map=window.__northBarnesMap||map;if(!map)return;styleBase();install();const on=active();document.documentElement.classList.toggle('nb-v36-active',on);ensureBadge();if(badge)badge.hidden=!on;
 if(on){OLD_PROPOSAL.forEach(hide);TOY_SETTLEMENT.forEach(hide);setV36(true);status('v36 cinematic massing · valley impact view · exact layout not claimed');}
 else setV36(false);
}
window.NorthBarnesPresentationVisualResetV36={version:V,sync,state:()=>({active:active(),map:!!map,installed})};
css();const timer=setInterval(sync,350);addEventListener('pagehide',()=>clearInterval(timer),{once:true});
})();
