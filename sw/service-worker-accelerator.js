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
    event.respondWith(networkThenCache(event.request))
});

// A request is a resource request if it is a `GET`
function isResource(request) {
  return request.method === 'GET';
}

// add a request/response pair to the cache
async function addToCache(request, response) {
  const url = new URL(request)
  caches.open(CACHE).then(function(cache) {
    cache.put(request, response);
    console.log("ATC:" ,url.pathname, "added to cache");
  });
  }

// http cache then disk cache then network
async function networkThenCache(request) {
  const url = new URL(request.url)

  // if its not on our site then just fetch from network
  if(!url.hostname.includes(WEBSITE)) {
    return fetch(url)
  }

  // if its in browser cache return immediately
  let response
  try {
    // fetch only from browser cache, if not there check elsewhere
    response = await fetch(new Request(url, {mode:"same-origin", cache: "only-if-cached"}))
    console.log("NC: serving", url.pathname, "from http cache");
    addToCache(url, response.clone())
    return response
  } catch (err) {
    // it was not in the browser cache
    console.error("NC:",err);

    // let's check the disk cache
    const cachedContent = await caches.match(request)
    if (cachedContent) {
      console.log("NC: serving", url.pathname, "from disk cache");
      return cachedContent
    }

    // looks like we have to fallback to the network
    let res
    try {
      res = await fetch(url)
      console.log("NC: serving", url.pathname, "from network");
      // cache in disk for later
      addToCache(url, res.clone())
      return res
    } catch (err) {
      // we are offline and we dont have this content
      console.error("NC:", "offline and", url.pathname, "not in cache");
      return useFallback()
    }
  }
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
