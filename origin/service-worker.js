const CACHE = 'gladius-cache'
const WEBSITE = 'test.gladius.io'
const EDGENODE = 'http://localhost:8080'
const MASTERNODE = 'http://localhost:5000'

// install stage
self.addEventListener('install', function(event) {
  self.skipWaiting();
  // event.waitUntil(preCache());
});

// active stage
self.addEventListener('activate', function(event) {
  event.waitUntil(function(event) {
    // we can take control of this existing session w/o reloading it
    return self.clients.claim();
  });
});

// every time a resource is requested
self.addEventListener('fetch', function(event) {
  // serve from cache then network
  event.respondWith(fromCacheThenNetwork(event.request));
  // event.waitUntil(update(event.request));
});

// compare hash of the files
function checkHash(hash1, hash2) {
  if (hash1 == hash2) {
    return true
  }
  return false
}

// Open a cache and use `addAll()` with an array of assets to add all of them
// to the cache. Return a promise resolving when all the assets are added.
function preCache() {
  return caches.open(CACHE).then(function (cache) {
    return cache.addAll([
      'dog.jpg',
      'cat.jpg',
      'bunny.jpg',
      'fox.png'
    ]);
  });
}

// Add a request/response pair to the cache
function addToCache(request, response) {
  caches.open(CACHE).then(function(cache) {
    cache.put(request, response);
  });
}

// serve the content from cache if it's there, if not fallback to the network
function fromCacheThenNetwork(request) {
  let url = request.url.split("/")
  let assetName = url[3]
  // first find in local cache
   return caches.match(request).then(function(cachedContent) {
    // return from cache
    if (cachedContent) {
      console.log("serving " + assetName + " from cache");
    }

    let edgeUrl = EDGENODE + "/content?website=" + WEBSITE + "&asset=" + assetName
    if (assetName == "" || assetName == "main.js") {
      edgeUrl = request.url
    }
    return cachedContent || fetch(edgeUrl).then(function(response) {
      // return from the origin + add to cache
      // cache the new response for the future
      addToCache(request.url,response.clone())
      // console.log(response);
      console.log("serving " + assetName + " from " + edgeUrl);
      if (assetName == "frog.png" || assetName == "") {
        console.log(response);
      }
      let masterNodeUrl = request.url
      return response
    });
  })
  // if the cache doesnt have it AND we are offline
  .catch(function() {
    console.log("Offline and not found! Here's a default from the cache!");
    return caches.match('fox.png');
  })
}

// Update consists in opening the cache, performing a network request and
// storing the new response data.
function update(request) {
  return caches.open(CACHE).then(function (cache) {
    return fetch(request).then(function (response) {
      return cache.put(request, response);
    });
  });
}