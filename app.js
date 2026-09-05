const visualRules = {
  0:{detail:'Baseline farmland and existing landscape structure. No development is implied at this stage.',show:[]},
  1:{detail:'Illustrative enabling works begin. Exact access, drainage, utilities and construction locations remain unresolved.',show:['enabling']},
  3:{detail:'A deliberately modest first residential phase, with initial local services and landscape works. This is a modelling assumption, not a published programme.',show:['enabling','phase1']},
  5:{detail:'A second illustrative neighbourhood appears alongside early community provision and maturing green infrastructure.',show:['enabling','phase1','phase2','school']},
  10:{detail:'Roughly half of the illustrative build-out is present. Commercial and employment quantities are scenario representations; sports provision is primary-supported in principle but its timing and geometry here remain illustrative.',show:['enabling','phase1','phase2','phase3','school','centre','employment','sports']},
  15:{detail:'Additional illustrative neighbourhoods fill out the internal structure while parks, wetland planting and green corridors continue to mature. Named landscape elements are primary-supported in principle, not fixed to this schematic geometry.',show:['enabling','phase1','phase2','phase3','phase4','school','centre','employment','sports','green']},
  20:{detail:'Most illustrative housing is present. Commercial and employment quantities shown are analytical scenario values and do not constitute a published construction programme.',show:['enabling','phase1','phase2','phase3','phase4','phase5','school','centre','employment','sports','green']},
  25:{detail:'Illustrative completion at the current maximum of 3,000 homes. Healthcare, Bevern Valley Park, sports hub/pavilion and Wet Home Wood nature reserve are primary-supported components in principle; their placement, phasing and detailed geometry here remain illustrative. The 6,000 m² and 10,000 m² quantities remain pending direct primary confirmation.',show:['enabling','phase1','phase2','phase3','phase4','phase5','phase6','school','centre','employment','sports','green','health']}
};

const fallbackPhases = [0,1,3,5,10,15,20,25].map(year => ({
  year,
  label: ({0:'Existing landscape',1:'Enabling works',3:'First neighbourhood',5:'Early community',10:'Settlement takes shape',15:'Maturing town',20:'Late build-out',25:'Illustrative completion'})[year],
  illustrative_homes: ({0:0,1:0,3:350,5:700,10:1400,15:2100,20:2650,25:3000})[year],
  commercial_m2: ({0:0,1:0,3:1000,5:2000,10:3500,15:5000,20:6000,25:6000})[year],
  employment_m2: ({0:0,1:0,3:1000,5:2500,10:5000,15:7500,20:10000,25:10000})[year]
}));

async function loadPhases(){
  try{
    const response = await fetch('data/phasing-model.json',{cache:'no-cache'});
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    const model = await response.json();
    if(!Array.isArray(model.phases) || model.phases.length !== 8) throw new Error('Unexpected phasing schema');
    return model.phases;
  }catch(error){
    console.warn('Using embedded phasing fallback:', error);
    return fallbackPhases;
  }
}

function formatM2(value){return `${Number(value||0).toLocaleString('en-GB')} m²`;}

async function initTimelapse(){
  const root=document.querySelector('[data-timelapse]');
  if(!root) return;
  const phases=await loadPhases();
  const slider=root.querySelector('[data-phase-range]');
  const play=root.querySelector('[data-play]');
  const yearEl=root.querySelector('[data-year]');
  const labelEl=root.querySelector('[data-label]');
  const detailEl=root.querySelector('[data-detail]');
  const homesEl=root.querySelector('[data-homes]');
  const commercialEl=root.querySelector('[data-commercial]');
  const employmentEl=root.querySelector('[data-employment]');
  const statusEl=root.querySelector('[data-live-status]');
  const stageGroups=[...root.querySelectorAll('[data-stage]')];
  const ticks=[...root.querySelectorAll('[data-jump]')];
  const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let timer=null;

  slider.max=String(phases.length-1);

  function render(index,announce=false){
    const i=Math.max(0,Math.min(phases.length-1,Number(index)||0));
    const phase=phases[i];
    const rule=visualRules[phase.year]||{detail:'Illustrative stage.',show:[]};
    slider.value=String(i);
    yearEl.textContent=phase.year===0?'Today':`Year ${phase.year}`;
    labelEl.textContent=phase.label;
    detailEl.textContent=rule.detail;
    homesEl.textContent=Number(phase.illustrative_homes||0).toLocaleString('en-GB');
    commercialEl.textContent=formatM2(phase.commercial_m2);
    employmentEl.textContent=formatM2(phase.employment_m2);
    stageGroups.forEach(group=>{
      const visible=rule.show.includes(group.dataset.stage);
      group.classList.toggle('is-visible',visible);
      group.setAttribute('aria-hidden',visible?'false':'true');
    });
    ticks.forEach((button,idx)=>{
      button.classList.toggle('is-current',idx===i);
      button.setAttribute('aria-current',idx===i?'step':'false');
    });
    const url=new URL(window.location.href);
    if(phase.year===0) url.searchParams.delete('phase'); else url.searchParams.set('phase',String(phase.year));
    history.replaceState(null,'',url);
    if(announce && statusEl) statusEl.textContent=`${yearEl.textContent}: ${phase.label}. ${Number(phase.illustrative_homes||0).toLocaleString('en-GB')} illustrative homes shown.`;
  }

  function stop(){
    if(timer) clearInterval(timer);
    timer=null;
    play.textContent='Play time-lapse';
    play.setAttribute('aria-pressed','false');
  }

  function start(){
    stop();
    play.textContent='Pause';
    play.setAttribute('aria-pressed','true');
    timer=setInterval(()=>{
      let next=Number(slider.value)+1;
      if(next>=phases.length) next=0;
      render(next,true);
    },reduceMotion?2600:1500);
  }

  slider.addEventListener('input',()=>{stop();render(slider.value,true);});
  play.addEventListener('click',()=>{timer?stop():start();});
  ticks.forEach((button,index)=>button.addEventListener('click',()=>{stop();render(index,true);}));
  document.addEventListener('visibilitychange',()=>{if(document.hidden) stop();});
  if('IntersectionObserver' in window){
    new IntersectionObserver(entries=>{if(!entries[0].isIntersecting) stop();},{threshold:.05}).observe(root);
  }

  const requested=Number(new URLSearchParams(location.search).get('phase'));
  const initialIndex=Math.max(0,phases.findIndex(p=>p.year===requested));
  render(initialIndex,false);
}

function enhanceInstallability(){
  if(!document.querySelector('link[rel="manifest"]')){
    const manifest=document.createElement('link'); manifest.rel='manifest'; manifest.href='site.webmanifest'; document.head.appendChild(manifest);
  }
  if(!document.querySelector('link[rel="icon"]')){
    const icon=document.createElement('link'); icon.rel='icon'; icon.href='assets/icon.svg'; icon.type='image/svg+xml'; document.head.appendChild(icon);
  }
  if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}),{once:true});
}

enhanceInstallability();
initTimelapse();
