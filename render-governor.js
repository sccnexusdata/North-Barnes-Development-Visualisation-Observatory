(() => {
  const VERSION='26';
  const BUILD='30.0';
  const BIODIVERSITY_MARKER='biodiversity.js?v=26.1';
  function load(src,key){
    if(document.querySelector(`script[data-${key}]`))return;
    const script=document.createElement('script');
    script.src=src;
    script.dataset[key.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]='';
    document.head.appendChild(script);
  }
  load('render-governor-core.js?v=27.1','governor-core');
  load('scene-enrichment.js?v=27.1','scene-enrichment');
  load('settlement-v28.js?v=28.0','settlement-v28');
  load('settlement-v30.js?v=30.0','settlement-v30');
  load('context-mode-v29.js?v=29.2','context-mode-v29');
  load('presentation-v29.js?v=29.4','presentation-v29');
  load('google-3d-v30.js?v=30.0','google-3d-v30');
  void VERSION;
  void BUILD;
  void BIODIVERSITY_MARKER;
})();