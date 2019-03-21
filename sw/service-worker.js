// service worker cache polyfill
// importScripts('serviceworker-cache-polyfill.js')

// install stage
self.addEventListener('install', function(event) {
  console.log("SW installing...");
});

// active stage
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (!CACHE.includes(key)) {
          return caches.delete(key);
        }
      })
    )).then(() => {
      console.log('SW now ready to handle fetches!');
    })
  );
})

// every time a resource is requested
self.addEventListener('fetch', function(event) {
  // serve from cache, fallback on network

  if (isResource(event.request)) {
    event.respondWith(fromCacheOrNetwork(event.request));
    event.waitUntil(updateCache(event.request))
  } else {
    event.respondWith(fetchFromMasterNode(event.request))
  }
});

// A request is a resource request if it is a `GET`
function isResource(request) {
  return request.method === 'GET';
}

// add a request/response pair to the cache
async function addToCache(request, response) {
  const url = new URL(request)

  if(url.hostname.includes(WEBSITE)) {
    caches.open(CACHE).then(function(cache) {
      cache.put(request, response);
      console.log("ATC:" ,url.pathname, "added to cache");
    });
  }
}

// remove a request/response pair from the cache
async function removeFromCache(request) {
  const url = new URL(request)
  caches.open(CACHE).then(function(cache) {
    cache.delete(request)
    console.log("RFC:", url.pathname, "removed from cache");
  })
}

// serve the content from cache if it's there, if not fallback to the network
async function fromCacheOrNetwork(request) {
  const url = new URL(request.url);

  // 1. See if we have the request in the cache
  const cachedContent = await caches.match(request)

  // 2a. If we do, serve (unless it's the MNLIST)
  if (cachedContent && url.href != MNLIST) {
    console.log("CoN: serving", url.pathname, "from cache");
    return cachedContent
  }

  // 2b. If we do not, fetch from network then add to cache
  const res = await fetchFromMasterNode(url)
  addToCache(url,res.clone())
  return res

}

// fetch things from the masternode, bypass http cache
async function fetchFromMasterNode(url) {
  const newUrl = new URL(url)
  console.log("CoN: serving", url.pathname, "from masternode");
  if (newUrl.hostname.includes(WEBSITE)) {
    if (newUrl.href == MNLIST) {
      return fetch(url, {
        method: "GET",
        mode: "cors",
        headers: { 
        "gladius-masternode-direct":"",
        },
        cache: "no-store"
      })
    }
    return fetch(new Request(url, { cache: 'no-store' }))
  }
  return fetch(url)
}

// update consists in opening the cache, seeing if there's new data, and then getting it
async function updateCache(request, mnList) {
  const url = new URL(request.url);

  // never update the MNLIST since we get it at the beginning of every page load
  if(url.href == MNLIST) {
    return
  }

  // 1. Make sure this resource is cached
  const cachedContent = await caches.match(request)
  if (!cachedContent) {
    // if it's not cached for any reason then just return
    return
  }

  let hash
  try{
    // 2. See if the master asset list has is
    hash = await findHashInCache(MNLIST, url.pathname + url.search)
  } catch(err) {
    // well if its not on the cache list then lets delete it
    console.warn("UC:", url.pathname, "not in list, deleting from cache");
    removeFromCache(url)
    return
  }

  let check
  try {
    // 3. Do a hash comparison
    check = await assertHash(hash,cachedContent)
  } catch (err) {
    // if the hash is wrong but we trust the source, we must have wrong content
    // so lets go and get the right content and put it right into the cache
    console.warn("UC:", url.pathname,"updated");
    caches.open(CACHE).then(function(cache) {
      cache.add(request);
    });
    return
  }
  // if the cached content and mnlist have the same hash then it's up to date
  console.log("UC:", url.pathname, "up to date");
  return
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

// find hash from the asset list in cache
async function findHashInCache(mnList, assetName) {
  // find mnlist response in cache
  const cache = await caches.match(mnList)
  if (cache) {
    // we did find in the cache and now we can use it
    const list = await cache.json()
    const hash = list.assetHashes[assetName]
    // make sure its actually in the list
    if (!hash) {
      throw new Error("FHIC: " + assetName + " not in list")
    }
    return hash
  }
  throw new Error("FHIC: asset list not in cache");
}

// array buffer to hex
function bufferToHex(buffer) {
    var s = '', h = '0123456789ABCDEF';
    (new Uint8Array(buffer)).forEach((v) => { s += h[v >> 4] + h[v & 15]; });
    return s;
}

