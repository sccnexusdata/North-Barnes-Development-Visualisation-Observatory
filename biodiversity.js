(() => {
  const VERSION='26';
  const BUILD='26.1';
  const TABS=['baseline','species','seasonality','impacts','vvip'];
  let data=null, button=null, panel=null;
  let activeTab=TABS.includes(new URLSearchParams(location.search).get('bio'))?new URLSearchParams(location.search).get('bio'):'baseline';
  let requestedOpen=TABS.includes(new URLSearchParams(location.search).get('bio'));
  const qs=(s,r=document)=>r.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sourceMap=()=>new Map((data?.sources||[]).map(s=>[s.id,s]));
  const sourceLinks=ids=>{const map=sourceMap();return(ids||[]).map(id=>{const s=map.get(id);return s?`<a href="${esc(s.url)}" target="_blank" rel="noreferrer">${esc(s.title)}</a>`:`<span>${esc(id)}</span>`;}).join(' · ');};
  const tags=items=>(items||[]).filter(Boolean).map(x=>`<span class="bio-tag">${esc(x)}</span>`).join('');
  const monthName=n=>['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][n]||'';
  const currentMonth=()=>new Date().getMonth()+1;

  function ensureCss(){
    if(qs('#nb-bio-css'))return;
    const s=document.createElement('style');s.id='nb-bio-css';
    s.textContent=`#nb-bio-panel{position:absolute;z-index:8;left:18px;top:118px;width:min(560px,calc(100% - 36px));max-height:68vh;overflow:auto;padding:14px;border:1px solid #ffffff3a;border-radius:16px;background:#07110df2;color:#fff;box-shadow:0 18px 55px #0008;backdrop-filter:blur(11px);font-size:.76rem;line-height:1.45}#nb-bio-panel[hidden]{display:none}#nb-bio-panel h3{margin:.1rem 2.3rem .45rem 0;font-size:1rem}#nb-bio-panel h4{margin:.9rem 0 .35rem;font-size:.82rem}#nb-bio-panel p{margin:.3rem 0;color:#dce5dc}#nb-bio-panel ul,#nb-bio-panel ol{margin:.25rem 0 .55rem;padding-left:1.15rem;color:#dce5dc}#nb-bio-panel li{margin:.28rem 0}#nb-bio-panel a{color:#d8ebd6}#nb-bio-panel .bio-tag{display:inline-block;margin:.15rem .2rem .15rem 0;padding:.2rem .45rem;border:1px solid #ffffff2f;border-radius:999px;background:#ffffff10;color:#e9f0e9;font-size:.68rem}#nb-bio-panel .bio-note{padding:.55rem .65rem;border-radius:10px;background:#ffffff0d;color:#cbd8cd}#nb-bio-panel .bio-alert{padding:.55rem .65rem;border:1px solid #e6cf7d55;border-radius:10px;background:#e6cf7d12;color:#f4e8b2}#nb-bio-panel .bio-tabs{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;margin:.7rem 0}.bio-tabs button{position:static!important;min-width:0!important;min-height:34px!important;padding:5px!important;border:1px solid #ffffff2b!important;border-radius:9px!important;background:#ffffff0d!important;color:#fff!important;font-size:.66rem!important}.bio-tabs button[aria-selected="true"]{background:#d9e7d5!important;color:#132018!important}.bio-source{font-size:.68rem;color:#aebcaf;margin-top:.15rem}.bio-kpi{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin:.5rem 0}.bio-kpi div{padding:.55rem;border:1px solid #ffffff20;border-radius:10px;background:#ffffff08}.bio-kpi b{display:block;font-size:.95rem}.bio-actions{display:flex;gap:6px;flex-wrap:wrap;margin:.6rem 0}.bio-actions button,.bio-actions a{position:static!important;min-height:34px!important;padding:6px 9px!important;border:1px solid #ffffff2b!important;border-radius:9px!important;background:#ffffff0d!important;color:#fff!important;text-decoration:none!important;font:inherit!important;font-weight:700!important;cursor:pointer}.bio-season-now{border-left:3px solid #f3d37a;padding-left:.55rem}.bio-close{position:absolute!important;right:8px!important;top:8px!important;min-width:32px!important;min-height:32px!important;border:0!important;border-radius:999px!important;background:#ffffff14!important;color:#fff!important;cursor:pointer!important}@media(max-width:700px){#nb-bio-panel{left:10px;right:10px;top:142px;width:auto;max-height:58vh}.bio-tabs{grid-template-columns:repeat(2,minmax(0,1fr))!important}.bio-actions{display:grid!important;grid-template-columns:1fr 1fr!important}}`;
    document.head.appendChild(s);
  }

  function baselineHtml(){
    const habitats=(data.habitats||[]).map(h=>`<li><b>${esc(h.label)}</b><br>${tags([h.evidence_class,h.geometry_status,h.impact_status])}<div>${esc((h.risks||[]).join(' · '))}</div><div class="bio-source">Sources: ${sourceLinks(h.source_ids)}</div></li>`).join('');
    const w=data.water_context||{}, c=w.latest_public_classification||{}, bng=data.bng||{};
    return `<h4>Authority/source-supported habitat context</h4><ul>${habitats}</ul><h4>Bevern Stream context</h4><div class="bio-kpi"><div><b>${esc(c.ecological_status||'Unknown')}</b>2022 ecological status</div><div><b>${esc(c.fish||'Unknown')}</b>fish element</div><div><b>${esc(c.invertebrates||'Unknown')}</b>invertebrates</div><div><b>${esc(c.macrophytes_and_phytobenthos||'Unknown')}</b>macrophytes / phytobenthos</div></div><p class="bio-note">Water body ${esc(w.waterbody_id)}. ${esc(w.interpretation_rule)}</p><h4>Biodiversity Net Gain</h4><p><b>Statutory objective: at least ${esc(bng.statutory_objective_percent)}%.</b> North Barnes calculation status: <span class="bio-tag">${esc(bng.north_barnes_calculation_status)}</span></p><p>${esc(bng.calculation_gate)}</p>`;
  }

  function speciesHtml(){
    const surveys=(data.survey_targets||[]).map(x=>`<li><b>${esc(x.group)}</b><br>${tags([x.evidence_class,x.site_presence_status])}<div class="bio-source">Source: ${sourceLinks(x.source_ids)}</div></li>`).join('');
    const species=(data.species_examples||[]).map(x=>`<li><b>${esc(x.common_name)}</b> <i>${esc(x.scientific_name)}</i><br>${tags([x.evidence_class,x.public_location_rule])}<div>${esc(x.site_presence_status)}</div><div class="bio-source">Source: ${sourceLinks(x.source_ids)}</div></li>`).join('');
    const associations=(data.habitat_association_context||[]).map(x=>`<li><b>${esc(x.habitat)}</b><br>${tags(x.groups)}<div>${esc(x.interpretation)}</div><div class="bio-source">Source: ${sourceLinks(x.source_ids)}</div></li>`).join('');
    const inv=data.observation_inventory||{};
    return `<p class="bio-alert"><b>${esc(inv.confirmed_site_specific_occurrence_records_loaded??0)} site-specific occurrence records are currently loaded.</b> ${esc(inv.interpretation)}</p><h4>Site-specific targeted survey groups</h4><ul>${surveys}</ul><h4>Source-supported species/habitat-use examples</h4><ul>${species}</ul><h4>National habitat-association context</h4><ul>${associations}</ul><p class="bio-note">Sensitive records are never shown more precisely than the source allows. Habitat association and survey potential are not sightings.</p>`;
  }

  function seasonalityHtml(){
    const month=currentMonth();
    const windows=data.survey_seasonality||[];
    const now=windows.filter(x=>(x.months||[]).includes(month));
    const rows=windows.map(x=>`<li class="${(x.months||[]).includes(month)?'bio-season-now':''}"><b>${esc(x.group)} · ${esc(x.survey)}</b><br>${tags([(x.months||[]).includes(month)?`${monthName(month)} overlaps broad window`:'outside broad current-month window',x.evidence_class])}<div>${esc(x.window)}</div><div class="bio-source">Source: ${sourceLinks(x.source_ids)}</div></li>`).join('');
    return `<p class="bio-alert"><b>${monthName(month)} context:</b> ${now.length} listed survey-method windows overlap this month. This is a planning aid only; weather, method, licence, species ecology and professional judgement still govern survey design.</p><h4>Natural England broad survey windows</h4><ul>${rows}</ul><p class="bio-note">A calendar window does not prove that North Barnes has been surveyed, that survey effort was sufficient, or that a species is present or absent.</p>`;
  }

  function impactsHtml(){
    const renderGroup=(title,items)=>`<h4>${title}</h4><ul>${(items||[]).map(x=>`<li><b>${esc(x.impact)}</b> ${tags([x.status])}</li>`).join('')}</ul>`;
    return `${renderGroup('Construction pathways',data.impact_pathways?.construction)}${renderGroup('Operational pathways',data.impact_pathways?.operation)}<p class="bio-note">These are impact pathways in scope, not quantified outcomes. Area loss, fragmentation or residual effect remains blocked until verified habitat and development geometry is available.</p><h4>Next evidence gates</h4><ol>${(data.next_gates||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ol>`;
  }

  function vvipHtml(){
    const v=data.vvip||{}, p=data.publication_policy||{};
    const sources=(data.sources||[]).map(s=>`<li><b>${esc(s.title)}</b><br><span class="bio-tag">${esc(s.type)}</span> ${esc(s.use)}<div class="bio-source"><a href="${esc(s.url)}" target="_blank" rel="noreferrer">Open source</a> · retrieved ${esc(s.retrieved)} · ${esc(s.licence_access_note)}</div></li>`).join('');
    return `<h4>VVIP controls</h4><ul><li><b>Validation</b> — ${esc(v.validation)}</li><li><b>Verification</b> — ${esc(v.verification)}</li><li><b>Integrity</b> — ${esc(v.integrity)}</li><li><b>Provenance</b> — ${esc(v.provenance)}</li></ul><h4>Publication safeguards</h4>${tags([p.sensitive_locations,p.rarity_scores,p.coordinate_uncertainty_required?'coordinate uncertainty required':'',p.decorative_wildlife_is_not_evidence?'decorative wildlife ≠ evidence':'',p.survey_windows_are_guidance_not_completion_evidence?'survey windows ≠ survey completion':''])}<p class="bio-note">Absence of record ≠ absence of species. Public data must never gain spatial precision during processing.</p><h4>Current source register</h4><ul>${sources}</ul>`;
  }

  function currentUrl(){const url=new URL(location.href);url.searchParams.set('bio',activeTab);return url.toString();}
  async function shareCurrent(){
    const url=currentUrl();
    try{if(navigator.share){await navigator.share({title:'North Barnes biodiversity evidence view',url});return;}}catch(e){if(e?.name==='AbortError')return;}
    try{await navigator.clipboard.writeText(url);const status=qs('[data-exp-status]');if(status)status.textContent='Biodiversity view link copied';}catch(_){location.hash='visuals';}
  }

  function setTab(next,{updateUrl=true}={}){
    if(!TABS.includes(next))return;
    activeTab=next;
    if(updateUrl){const url=new URL(location.href);url.searchParams.set('bio',activeTab);history.replaceState(null,'',url);}
    render();
  }

  function render(){
    if(!panel||!data)return;
    const tabs=[['baseline','Baseline'],['species','Species'],['seasonality','Seasonality'],['impacts','Impacts'],['vvip','VVIP']];
    const body=activeTab==='species'?speciesHtml():activeTab==='seasonality'?seasonalityHtml():activeTab==='impacts'?impactsHtml():activeTab==='vvip'?vvipHtml():baselineHtml();
    panel.innerHTML=`<button class="bio-close" type="button" aria-label="Close biodiversity panel">×</button><h3>Biodiversity evidence lens · v${BUILD}</h3><p class="bio-note">${esc(data.warning)}</p><div class="bio-actions"><button type="button" data-bio-share>Share this ecology view</button><a href="biodiversity.html">Full ecology page</a></div><div class="bio-tabs" role="tablist" aria-label="Biodiversity evidence views">${tabs.map(([id,label])=>`<button type="button" role="tab" data-bio-tab="${id}" aria-selected="${activeTab===id?'true':'false'}">${label}</button>`).join('')}</div><div role="tabpanel">${body}</div>`;
    panel.querySelector('.bio-close').addEventListener('click',()=>togglePanel(false));
    panel.querySelector('[data-bio-share]').addEventListener('click',shareCurrent);
    panel.querySelectorAll('[data-bio-tab]').forEach(tab=>tab.addEventListener('click',()=>setTab(tab.dataset.bioTab)));
  }

  function togglePanel(force){
    ensurePanel();
    if(!panel)return;
    const open=typeof force==='boolean'?force:panel.hidden;
    panel.hidden=!open;
    if(button)button.setAttribute('aria-pressed',open?'true':'false');
    if(open){const url=new URL(location.href);url.searchParams.set('bio',activeTab);history.replaceState(null,'',url);render();}
  }

  function ensurePanel(){if(panel?.isConnected)return;const host=qs('#immersive-experience');if(!host)return;panel=document.createElement('aside');panel.id='nb-bio-panel';panel.hidden=true;panel.setAttribute('aria-live','polite');host.appendChild(panel);render();}
  function ensureButton(){
    const toolbar=qs('.hud-actions');if(!toolbar||button?.isConnected)return;
    button=document.createElement('button');button.type='button';button.dataset.biodiversity='';button.textContent='Biodiversity';button.setAttribute('aria-pressed','false');button.setAttribute('aria-controls','nb-bio-panel');button.setAttribute('aria-label','Show biodiversity evidence, species survey status, survey seasonality, impacts and VVIP provenance');toolbar.insertBefore(button,toolbar.querySelector('[data-exit]')||null);button.addEventListener('click',()=>togglePanel());
    if(requestedOpen){requestedOpen=false;setTimeout(()=>togglePanel(true),60);}
  }

  async function load(){try{const r=await fetch('data/biodiversity-context.json',{cache:'no-store'});if(!r.ok)throw new Error(`HTTP ${r.status}`);data=await r.json();if(data.schema_version!=='1.1')throw new Error(`Unsupported biodiversity schema ${data.schema_version}`);ensureCss();ensureButton();ensurePanel();window.NorthBarnesBiodiversity={version:BUILD,state:()=>({loaded:true,status:data.status,tab:activeTab,sources:(data.sources||[]).length,surveyWindows:(data.survey_seasonality||[]).length}),open:tab=>{if(TABS.includes(tab))setTab(tab);togglePanel(true);},close:()=>togglePanel(false),share:shareCurrent};}catch(e){console.warn('Biodiversity evidence layer unavailable',e);window.NorthBarnesBiodiversity={version:BUILD,state:()=>({loaded:false,error:String(e.message||e)})};}}

  document.addEventListener('keydown',event=>{if(event.altKey||event.ctrlKey||event.metaKey||event.target?.closest?.('input,textarea,select,[contenteditable="true"]'))return;if(!document.documentElement.classList.contains('experience-active'))return;if(event.key.toLowerCase()==='e'){event.preventDefault();togglePanel();}});
  load();
  const mo=new MutationObserver(()=>{ensureButton();ensurePanel();});mo.observe(document.documentElement,{subtree:true,childList:true});
})();
