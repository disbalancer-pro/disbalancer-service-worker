// service worker cache polyfill
// importScripts('serviceworker-cache-polyfill.js')

// install stage
self.addEventListener('install', function(event) {
  console.log("SW installing...");
  event.waitUntil(retrieveList(MNLIST));
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
  if(isResource(event.request)) {
    event.respondWith(fromCacheOrNetwork(event.request));
    // fetch requests again in order to update the cache
    // event.waitUntil(updateCache(event.request));
  } else {
    event.respondWith(fetch(event.request));
  }
});

// A request is a resource request if it is a `GET`
function isResource(request) {
  return request.method === 'GET';
}

// add a request/response pair to the cache
function addToCache(request, response) {
  const url = new URL(request)
  console.log("ATC:" ,url.pathname, "added to cache");
  caches.open(CACHE).then(function(cache) {
    cache.put(request, response);
  });
}

// remove a request/response pair from the cache
function removeFromCache(request) {
  const url = new URL(request)
  console.log("RFC:", url.pathname, "removed from cache");
  caches.open(CACHE).then(function(cache) {
    cache.delete(request)
  })
}

// serve the content from cache if it's there, if not fallback to the network
async function fromCacheOrNetwork(request) {
  const url = new URL(request.url);

  // 1. See if we have the request in the cache
  const cachedContent = await caches.match(request)

  // 2a. If we do, serve
  if (cachedContent) {
    console.log("CoN: serving", url.pathname, "from cache");
    return cachedContent
  }

  // 2b. If we do not, fetch from network then add to cache
  console.log("CoN: serving", url.pathname, "from masternode");
  const response = await fetch(request)
  addToCache(url,response.clone())
  return response
}

// update consists in opening the cache, seeing if there's new data, and then getting it
async function updateCache(request, mnList) {
  const url = new URL(request.url);

  // 1. Make sure this resource is cached
  const cachedContent = await caches.match(request)
  if (!cachedContent) {
    // if it's not cached for any reason then just return
    return
  }

  let hash
  try{
    // 2. See if the master list has is
    hash = await findHash(MNLIST, url.pathname)
  } catch(err) {
    // well if its not on the cache list then lets delete it
    console.warn("UC:", url.pathname, "not in list, deleting from cache");
    removeFromCache(url)
    return
  }

  let check
  try {
    // 3. Do a hash comparison
    check = await assertHash(hash,cachedContent.clone())
  } catch (err) {
    console.warn("UC:", url.pathname,"out of date, updating the cache");
    return proxyToMasterNode(request)
  }
  // if the cached content and mnlist have the same hash then it's up to date
  console.log("UC:", url.pathname, "up to date");
  return
}

// match the name to the hash
async function findHash(mnList, assetName) {
  // find mnlist response in cache
  const cache = await caches.match(mnList)
  if (cache) {
    // we did find in the cache and now we can use it
    const list = await cache.json()
    const hash = list.assetHashes[assetName]
    // make sure its actually in the list
    if (!hash) {
      throw new Error("FH: " + assetName + " not in list")
    }
    return hash
  }
  // if not in cache well then get it from the mn direct
  console.warn("FH:", "asset list not in cache");
  let response
  try {
    response = await retrieveList(mnList)
  } catch(err) {
    // if we can't get the list then throw an error
    console.error(err)
    throw new Error("FH:",err)
  }
  // we successfully got the list and now we can use it
  const list = await response.json()
  const hash = list.assetHashes[assetName]
  // make sure its actually in the list
  if (!hash) {
    throw new Error("FH: asset not in list")
  }
  return hash
}

// array buffer to hex
function bufferToHex(buffer) {
    var s = '', h = '0123456789ABCDEF';
    (new Uint8Array(buffer)).forEach((v) => { s += h[v >> 4] + h[v & 15]; });
    return s;
}

// retrieve asset list from MN
function retrieveList(url) {
  return fetch(url,
    {
      method: "GET",
      mode: "cors",
      headers: {
        "gladius-masternode-direct":"",
      },
    }
  ).then(function(res) {
    addToCache(url,res.clone())
    return res
  })
  .catch(function(err) {
    throw new Error(err)
  })
}

//
// // make sure that things are in the list before we decide to cache them
// let cacheIt
// try {
//   cacheIt = await findHash(MNLIST, url.pathname)
//   if (url.hostname.includes(WEBSITE)) {
//     addToCache(request.url, res.clone())
//   }
// } catch(err) {
//   console.warn(err);
// }
