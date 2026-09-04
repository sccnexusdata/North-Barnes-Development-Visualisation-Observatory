const CACHE='north-barnes-observatory-v5';
const CORE=['./','index.html','styles.css','app.js','experience.js','site.webmanifest','data/phasing-model.json','data/viewer-config.json','assets/aerial-study.svg','assets/black-cap-study.svg','assets/icon.svg'];
const RELEASE_SENSITIVE=new Set(['styles.css','app.js','experience.js','site.webmanifest','data/phasing-model.json','data/viewer-config.json']);

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

async function networkThenCache(request,fallbackKey=request){
  try{
    const response=await fetch(request,{cache:'no-cache'});
    if(response&&response.ok){
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(fallbackKey,copy));
    }
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
    event.respondWith(networkThenCache(event.request,'index.html'));
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
