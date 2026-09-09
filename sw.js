const CACHE='north-barnes-observatory-v8';
const CORE=['./','index.html','styles.css','app.js','experience.js','site.webmanifest','data/phasing-model.json','data/viewer-config.json','assets/aerial-study.svg','assets/black-cap-study.svg','assets/icon.svg'];
const RELEASE_SENSITIVE=new Set(['styles.css','app.js','experience.js','site.webmanifest','data/phasing-model.json','data/viewer-config.json','data/release.json']);
const NETWORK_TIMEOUT_MS=3500;
const NAVIGATION_TIMEOUT_MS=4500;

async function precacheIndividually(){
  const cache=await caches.open(CACHE);
  const results=await Promise.allSettled(CORE.map(async url=>{
    const response=await fetch(url,{cache:'no-cache'});
    if(!response.ok)throw new Error(`Precache failed ${url}: HTTP ${response.status}`);
    await cache.put(url,response);
  }));
  const failed=results.filter(result=>result.status==='rejected');
  if(failed.length)console.warn(`North Barnes precache completed with ${failed.length} unavailable asset(s); runtime fallback remains enabled.`);
}

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(precacheIndividually());
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

async function fetchWithTimeout(request,timeoutMs){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    return await fetch(request,{cache:'no-cache',signal:controller.signal});
  }finally{
    clearTimeout(timer);
  }
}

function offlineDocument(){
  const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#102017"><title>North Barnes Visualisation Observatory — offline context</title><style>html{background:#102017;color:#fff;font:16px/1.5 system-ui,sans-serif}body{margin:0;min-height:100svh;display:grid;place-items:center;padding:max(20px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(20px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));box-sizing:border-box;background:radial-gradient(circle at 25% 20%,#65805f 0 10%,transparent 11%),repeating-radial-gradient(ellipse at 58% 52%,transparent 0 25px,#ffffff12 26px 27px),linear-gradient(145deg,#5f795d,#17271d 65%,#09130e)}main{width:min(680px,100%);box-sizing:border-box;padding:20px;border:1px solid #ffffff38;border-radius:18px;background:#07110de8;box-shadow:0 20px 70px #0007}h1{font-size:clamp(1.4rem,6vw,2rem);margin:.2rem 0 .7rem}p{color:#d9e4db}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}button,a{min-height:44px;box-sizing:border-box;padding:10px 15px;border-radius:999px;border:1px solid #ffffff45;background:#f4f6ef;color:#102017;font:inherit;font-weight:800;text-decoration:none;cursor:pointer}a{background:#ffffff12;color:#fff}small{display:block;margin-top:18px;color:#b9c6bb}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}</style><main role="status" aria-live="polite"><strong>North Barnes Visualisation Observatory</strong><h1>Connection unavailable — useful context retained</h1><p>The live site could not be reached and a complete cached page is not available on this device. This fallback is deliberately non-spatial and does not show proposal geometry, roads, buildings, utilities, drainage or survey camera positions.</p><p>Retry when the connection improves. Evidence and provenance remain available from the published Observatory repository when online.</p><div class="actions"><button type="button" onclick="location.reload()">Retry site</button><a href="https://github.com/sccnexusdata/North-Barnes-Development-Visualisation-Observatory">Evidence repository</a></div><small>Decorative background only — not a map or planning representation.</small></main></html>`;
  return new Response(html,{status:200,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
}

async function networkThenCache(request,fallbackKey=request,timeoutMs=NETWORK_TIMEOUT_MS,finalFallback=null){
  try{
    const response=await fetchWithTimeout(request,timeoutMs);
    if(response&&response.ok){
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(fallbackKey,copy));
      return response;
    }
    const cached=await caches.match(fallbackKey);
    if(cached)return cached;
    if(finalFallback)return finalFallback();
    return response;
  }catch(error){
    const cached=await caches.match(fallbackKey);
    if(cached)return cached;
    if(finalFallback)return finalFallback();
    throw error;
  }
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;

  if(event.request.mode==='navigate'){
    event.respondWith(networkThenCache(event.request,'index.html',NAVIGATION_TIMEOUT_MS,offlineDocument));
    return;
  }

  const relative=url.pathname.replace(self.registration.scope.replace(url.origin,''),'').replace(/^\//,'');
  if(RELEASE_SENSITIVE.has(relative)){
    event.respondWith(networkThenCache(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(hit=>{
      if(hit)return hit;
      return fetch(event.request).then(response=>{
        if(response&&response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
        return response;
      });
    })
  );
});
