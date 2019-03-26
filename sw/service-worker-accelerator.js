// service worker cache polyfill
// importScripts('serviceworker-cache-polyfill.js')

// install stage
self.addEventListener('install', function(event) {
  console.log("SW installing...");
});

// active stage
self.addEventListener('activate', function(event) {
  // delete all of the old caches (previous versions)
  event.waitUntil(deleteOldCaches(CACHE));
  event.waitUntil(console.log("SW ready!"))
})

// every time a resource is requested
self.addEventListener('fetch', function(event) {
  if (isValidRequest(event.request)) {
    event.respondWith(networkCacheRace(event.request));
  } else {
    event.respondWith(fetch(event.request))
  }
});

// validates if the request is even worth the SW's time
// for example we don't want the request if its a POST or from a different site
function isValidRequest(request) {
  return request.url.includes(WEBSITE) && request.method === 'GET';
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

// resolves when the first promise resolves, rejects if all reject
async function oneSuccess(promises) {
  try {
    // go through all of the promises
    const err = await Promise.all(promises.map(p => {
      // on each promise we REJECT if the promise RESOLVES
      // this takes advantage of Promise.all rejection behavior
      // and lets us return the first resolved promise
      return p.then(val => Promise.reject(val), err => Promise.resolve(err))
    }))
    // if Promise.all resolves it should return an array of errors
    throw new Error("all promises failed")
  } catch (val) {
    // if Promise.all rejects then it should contain our result
    return val
  }
}

// wrapper that creates a promise that rejects if the asset is not in the cache
async function inCache(request) {
  return new Promise((resolve, reject) => {
    caches.match(request).then((req) => req ? resolve(req) : reject(Error("not in cache")));
  })
}

// have the network race against the cache
async function networkCacheRace(request) {
  try {
    // we see which finishes first, the fetch or the disk cache.
    // here we count on the fact that MOST servers will have some caching headers
    // even if its just Etag or Last Modified. this approach takes advantage of
    // the memory cache of browsers. if the the mem cache has a fresh asset, we
    // can get it from there and not even have to run this logic. if it doesnt
    // then we race the network and the cache.
    const response = await oneSuccess([fetch(request), inCache(request)])
    // if we get here, the browser didn't have a fresh copy of the asset in memory
    // lets try and add the asset to the cache asynchronously
    addToCache(request.url, response.clone())
    // if its the masternode list request, kick off the updateCache function
    if (request.url == MNLIST){
      updateCache(response.clone())
    }
    // serve the response from the winner of fetch vs disk cache
    return response
  } catch (err) {
    // if we get here that means the fetch failed and theres nothing in cache
    console.error(err);
    // lets just return the built in fallback svg
    return useFallback()
  }
}

// add a request/response pair to the cache
async function addToCache(request, response) {
  // if its already in cache then dont add it again
  const match = await caches.match(request)
  if (match) {
    console.log("NCR: served", request, "from cache");
    return
  } else {
    console.log("NCR: served", request, "from network");
  }

  // if it isn't, then add it
  const url = new URL(request)
  caches.open(CACHE).then(function(cache) {
    cache.put(request, response).then(() => {
      console.log("ATC:" ,url.pathname, "added to cache");
    })
  });
}

// update all cache entries based on the asset list we get from the masternode
async function updateCache(response) {
  let updateNeeded = false // keeps track if the masternode list needs to be updated
  const reqs = [] // holds all of our assets/requests we need to update

  // the cached list
  const list = await caches.match(MNLIST)
  if (!list) { // if we dont have the list dont bother updating anything
    return
  }

  // getting our last asset list from cache
  const listJson = await list.json()
  const cachedList = listJson.assetHashes

  // getting our latest asset list from network
  const res = await response.clone().json()
  const assetList = res.assetHashes

  // traverse the most current list
  for (const asset in assetList) {
    // see if the cached list has the asset
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
      // hash and compare the contents of the file with the expected hash
      // provided by the masternode
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
