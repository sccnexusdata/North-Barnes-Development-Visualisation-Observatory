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

async function networkThenCache(request,fallbackKey=request,timeoutMs=NETWORK_TIMEOUT_MS){
  try{
    const response=await fetchWithTimeout(request,timeoutMs);
    if(response&&response.ok){
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(fallbackKey,copy));
      return response;
    }
    const cached=await caches.match(fallbackKey);
    if(cached)return cached;
    return response;
  }catch(error){
    const cached=await caches.match(fallbackKey);
    if(cached)return cached;
    throw error;
  }
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;

  if(event.request.mode==='navigate'){
    event.respondWith(networkThenCache(event.request,'index.html',NAVIGATION_TIMEOUT_MS));
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
