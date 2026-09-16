(() => {
  const VERSION = '39.2';
  let host = null;
  let button = null;
  let context = false;
  let timer = null;

  const q = (selector, root = document) => root.querySelector(selector);
  const status = (message) => {
    const el = q('[data-exp-status]');
    if (el) el.textContent = message;
  };

  function css() {
    if (q('#nb-v39-css')) return;
    const style = document.createElement('style');
    style.id = 'nb-v39-css';
    style.textContent = [
      '#nb-v39-real{position:absolute;right:18px;top:18px;z-index:30;border:1px solid #ffffff42;border-radius:999px;background:#14231de8;color:#fff;padding:10px 14px;font:600 12px/1 system-ui;cursor:pointer;box-shadow:0 10px 30px #0006}',
      '#nb-v39-real:hover{background:#274438}',
      '.nb-v39-real #nb-v38{display:none!important}',
      '.nb-v39-real #nb3d{visibility:visible!important;opacity:1!important}',
      '.nb-v39-real #nb-v39-real{background:#d8b867;color:#152017}',
      '@media(max-width:700px){#nb-v39-real{right:10px;top:10px}}'
    ].join('');
    document.head.appendChild(style);
  }

  async function showContext() {
    try { await window.NorthBarnesGoogle3D?.setMode?.('map'); } catch (_) {}
    context = true;
    document.documentElement.classList.add('nb-v39-real');
    button.textContent = 'Return to landscape study';
    button.setAttribute('aria-pressed', 'true');
    status('Existing map and terrain context · proposal geometry remains illustrative');
  }

  function showStudy() {
    context = false;
    document.documentElement.classList.remove('nb-v39-real');
    button.textContent = 'Existing landscape';
    button.setAttribute('aria-pressed', 'false');
    status('Illustrative habitat and valley study · exact GIS and LiDAR terrain pending');
  }

  function install() {
    host = q('#nb-v38');
    if (!host || button?.isConnected) return;
    css();
    button = document.createElement('button');
    button.id = 'nb-v39-real';
    button.type = 'button';
    button.textContent = 'Existing landscape';
    button.title = 'Show the available real map and terrain context. Contextual geography only; proposal geometry remains illustrative.';
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => context ? showStudy() : showContext());
    host.appendChild(button);
  }

  install();
  timer = setInterval(install, 500);
  addEventListener('pagehide', () => clearInterval(timer), { once: true });
  window.NorthBarnesLandscapeBridge = { version: VERSION, showContext, showStudy };
})();
