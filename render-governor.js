(() => {
  const VERSION='26';
  const BUILD='35.0';
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
  load('settlement-v30.js?v=32.0','settlement-v30');
  load('habitat-impact-v34.js?v=34.1','habitat-impact-v34');
  load('context-mode-v29.js?v=33.0','context-mode-v29');
  load('presentation-v29.js?v=29.4','presentation-v29');
  load('google-3d-v30.js?v=33.0','google-3d-v30');
  load('cinematic-v31.js?v=31.0','cinematic-v31');
  load('presentation-visual-reset-v36.js?v=36.2','presentation-visual-reset-v36');
  load('landscape-studio-v37.js?v=37.0','landscape-studio-v37');
  load('landscape-studio-v38.js?v=38.0','landscape-studio-v38');
  load('landscape-studio-v39.js?v=39.2','landscape-studio-v39');
  void VERSION;
  void BUILD;
  void BIODIVERSITY_MARKER;
})();
