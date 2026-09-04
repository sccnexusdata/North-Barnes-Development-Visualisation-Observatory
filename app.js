const phases = [
  {year:0,label:'Existing landscape',homes:0,commercial:'0 m²',employment:'0 m²',detail:'Baseline farmland and existing landscape structure. No development is implied at this stage.',show:[]},
  {year:1,label:'Enabling works',homes:0,commercial:'0 m²',employment:'0 m²',detail:'Illustrative access, drainage, utilities corridors and construction activity begin. Exact engineering locations remain unresolved.',show:['enabling']},
  {year:3,label:'First neighbourhood',homes:350,commercial:'1,000 m²',employment:'1,000 m²',detail:'A deliberately modest first residential phase, with initial local services and landscape works. This is a modelling assumption, not a published programme.',show:['enabling','phase1']},
  {year:5,label:'Early community',homes:700,commercial:'2,000 m²',employment:'2,500 m²',detail:'A second neighbourhood appears alongside early school/community provision and maturing green infrastructure.',show:['enabling','phase1','phase2','school']},
  {year:10,label:'Settlement takes shape',homes:1400,commercial:'3,500 m²',employment:'5,000 m²',detail:'Roughly half of the illustrative build-out is present. The local centre, employment and sports provision become more substantial.',show:['enabling','phase1','phase2','phase3','school','centre','employment','sports']},
  {year:15,label:'Maturing town',homes:2100,commercial:'5,000 m²',employment:'7,500 m²',detail:'Additional neighbourhoods fill out the internal structure while parks, wetland planting and green corridors continue to mature.',show:['enabling','phase1','phase2','phase3','phase4','school','centre','employment','sports','green']},
  {year:20,label:'Late build-out',homes:2650,commercial:'6,000 m²',employment:'10,000 m²',detail:'Most of the illustrative housing and currently described commercial/employment quantum is present, with later plots still incomplete.',show:['enabling','phase1','phase2','phase3','phase4','phase5','school','centre','employment','sports','green']},
  {year:25,label:'Minimum plausible completion',homes:3000,commercial:'6,000 m²',employment:'10,000 m²',detail:'Illustrative completion at the current maximum of 3,000 homes, with the published school, health, sports, employment and green-space components represented.',show:['enabling','phase1','phase2','phase3','phase4','phase5','phase6','school','centre','employment','sports','green','health']}
];

const root = document.querySelector('[data-timelapse]');
if (root) {
  const slider = root.querySelector('[data-phase-range]');
  const play = root.querySelector('[data-play]');
  const yearEl = root.querySelector('[data-year]');
  const labelEl = root.querySelector('[data-label]');
  const detailEl = root.querySelector('[data-detail]');
  const homesEl = root.querySelector('[data-homes]');
  const commercialEl = root.querySelector('[data-commercial]');
  const employmentEl = root.querySelector('[data-employment]');
  const statusEl = root.querySelector('[data-live-status]');
  const stageGroups = [...root.querySelectorAll('[data-stage]')];
  const ticks = [...root.querySelectorAll('[data-jump]')];
  let timer = null;

  function render(index, announce = false) {
    const i = Math.max(0, Math.min(phases.length - 1, Number(index) || 0));
    const phase = phases[i];
    slider.value = i;
    yearEl.textContent = phase.year === 0 ? 'Today' : `Year ${phase.year}`;
    labelEl.textContent = phase.label;
    detailEl.textContent = phase.detail;
    homesEl.textContent = phase.homes.toLocaleString('en-GB');
    commercialEl.textContent = phase.commercial;
    employmentEl.textContent = phase.employment;
    stageGroups.forEach(group => {
      const visible = phase.show.includes(group.dataset.stage);
      group.classList.toggle('is-visible', visible);
      group.setAttribute('aria-hidden', visible ? 'false' : 'true');
    });
    ticks.forEach((button, idx) => button.classList.toggle('is-current', idx === i));
    if (announce) statusEl.textContent = `${yearEl.textContent}: ${phase.label}. ${phase.homes.toLocaleString('en-GB')} illustrative homes shown.`;
  }

  function stop() {
    if (timer) window.clearInterval(timer);
    timer = null;
    play.textContent = 'Play time-lapse';
    play.setAttribute('aria-pressed', 'false');
  }

  function start() {
    stop();
    play.textContent = 'Pause';
    play.setAttribute('aria-pressed', 'true');
    timer = window.setInterval(() => {
      let next = Number(slider.value) + 1;
      if (next >= phases.length) next = 0;
      render(next, true);
    }, 1500);
  }

  slider.addEventListener('input', () => { stop(); render(slider.value, true); });
  play.addEventListener('click', () => { timer ? stop() : start(); });
  ticks.forEach((button, index) => button.addEventListener('click', () => { stop(); render(index, true); }));
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) play.textContent = 'Play time-lapse';
  render(0, false);
}
