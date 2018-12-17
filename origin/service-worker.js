var CACHE = 'gladius-cache'

// install stage
self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(precache());
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
  console.log("fetching: " + event.request.url);
  event.respondWith(
    // first find in local cache
    caches.match(event.request).then(function(cachedContent) {
      // return from cache
      if (cachedContent) {
        console.log("serving " + event.request.url + " from cache");
      }
      return cachedContent || fetch(event.request).then(function(response) {
        // return from the origin + add to cache
        // cache the new response for the future
        addToCache(event.request,response.clone())
        // console.log(response);
        console.log("serving " + event.request.url + " from network");
        return response;
      });
    })
    // if the cache doesnt have it AND we are offline
    .catch(function() {
      console.log("Offline and not found! Here's a default from the cache!");
      return caches.match('fox.png');
    })
  );
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
function precache() {
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