// service worker cache polyfill
// importScripts('serviceworker-cache-polyfill.js')

// install stage
self.addEventListener('install', function(event) {
  console.log("SW installing...");
});

// active stage
self.addEventListener('activate', function(event) {
  event.waitUntil(deleteOldCaches(CACHE));
  event.waitUntil(console.log("SW ready!"))
})

// every time a resource is requested
self.addEventListener('fetch', function(event) {
    event.respondWith(networkCacheRace(event.request));
});

// A request is a resource request if it is a `GET`
function isResource(request) {
  return request.method === 'GET';
}

// delete old caches
function deleteOldCaches(currentCache) {
  // get a list of caches
  return caches.keys().then(keys => Promise.all(
    // for each cache
    keys.map(key => {
      // if it's not the currentCache
      if(!currentCache.includes(key)) {
        // delete it
        return caches.delete(key)
      }
    })
  ))
}

// race promises against each other and return the first one to finish
function promiseAny(promises) {
  return new Promise((resolve, reject) => {
    // make sure `promises` are all promises
    promises = promises.map(p => Promise.resolve(p));
    // resolve this promise as soon as one resolves
    promises.forEach(p => p.then(resolve(p)));
    // reject if all promises reject
    promises.reduce((a, b) => a.catch(() => b)).catch(() => reject(Error("network and cache down")));
  })
}

// have the network race against the cache
async function networkCacheRace(request) {
  try {
    const response = await promiseAny([fetch(request), caches.match(request)])
    addToCache(request.url, response.clone())
    if (request.url == MNLIST){
      updateCache(response.clone())
    }
    return response
  } catch (err) {
    console.error("offline and not in cache");
    return useFallback()
  }
}

// add a request/response pair to the cache
async function addToCache(request, response) {
  const match = await caches.match(request)
  if (match) {
    return
  }

  const url = new URL(request)

  caches.open(CACHE).then(function(cache) {
    cache.put(request, response).then(() => {
      console.log("ATC:" ,url.pathname, "added to cache");
    })
  });
}

// deal with cache adding and updating
async function updateCache(response) {
  let updateNeeded = false
  const reqs = []

  // the cached list
  const list = await caches.match(MNLIST)
  // if we dont have the list dont bother updating
  if (!list) {
    return
  }

  const listJson = await list.json()
  const cachedList = listJson.assetHashes

  // the most current list
  const res = await response.clone().json()
  const assetList = res.assetHashes

  // traverse the most current list
  for (const asset in assetList) {
    // see if the "old list" has the asset
    if (cachedList[asset]) {
      // if it does NOT then add to the update list
      if (cachedList[asset] != assetList[asset]) {
        reqs.push("https://" + WEBSITE + asset)
        console.warn("UC:", asset, "out of date");
      }
    } else {
      // if the cached list doesnt have it, then we need to update the cached list
      updateNeeded = true
    }
  }

  // update the list if its out of date
  const cache = await caches.open(CACHE)
  if (updateNeeded) {
    cache.put(new Request(MNLIST), response.clone())
  }

  // update the cache
  cache.addAll(reqs)
}

// check hash of response against expected hash (name of file from masternode)
async function assertHash(expectedHash, response) {
  const clone = await response.clone()
  const content = await clone.blob()
  const fr = new FileReader()
  fr.readAsArrayBuffer(content)
  return new Promise(function(resolve, reject) {
    fr.onloadend = async function() {
      const result = await crypto.subtle.digest('SHA-256', fr.result)
      let hash = bufferToHex(result)
      if (hash.toUpperCase() === expectedHash.toUpperCase()) {
        resolve(response)
      } else {
        reject(Error("CH: hash check failed.\nexpected: " + expectedHash + "\nactual: " + hash))
      }
    }
  })
}

// array buffer to hex
function bufferToHex(buffer) {
    var s = '', h = '0123456789ABCDEF';
    (new Uint8Array(buffer)).forEach((v) => { s += h[v >> 4] + h[v & 15]; });
    return s;
}

// This fallback never fails since it uses embedded fallbacks.
function useFallback() {
  return Promise.resolve(new Response(FALLBACK, { headers: {
    'Content-Type': 'image/svg+xml'
  }}));
}

// The fallback is an embedded SVG image.
const FALLBACK =
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="180" stroke-linejoin="round">' +
  '  <path stroke="#DDD" stroke-width="25" d="M99,18 15,162H183z"/>' +
  '  <path stroke-width="17" fill="#FFF" d="M99,18 15,162H183z" stroke="#eee"/>' +
  '  <path d="M91,70a9,9 0 0,1 18,0l-5,50a4,4 0 0,1-8,0z" fill="#aaa"/>' +
  '  <circle cy="138" r="9" cx="100" fill="#aaa"/>' +
  '</svg>';
