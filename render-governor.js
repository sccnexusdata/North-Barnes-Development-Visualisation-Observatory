(() => {
  const VERSION='26';
  const BIODIVERSITY_MARKER='biodiversity.js?v=26.1';
  function load(src,key){
    if(document.querySelector(`script[data-${key}]`))return;
    const script=document.createElement('script');
    script.src=src;
    script.dataset[key.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]='';
    document.head.appendChild(script);
  }
  load('render-governor-core.js?v=26.1','governor-core');
  load('scene-enrichment.js?v=27','scene-enrichment');
  void VERSION;
  void BIODIVERSITY_MARKER;
})();