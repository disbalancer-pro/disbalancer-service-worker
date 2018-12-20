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
  // console.log("FETCHING: " + event.request.url);
  // serve from cache then network
  // let thing = fromCacheThenNetwork(event.request)
  // console.log(thing);
  event.respondWith(fromCacheThenNetwork(event.request));
  // event.waitUntil(update(event.request));
});

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

// check the hash of the file against the expectedHash
function checkHash(expectedHash, response) {
  return new Promise(function(resolve, reject) {
    let clone = response.clone()
    return clone.blob().then(function(contentString) {
      if (sha256(contentString).toUpperCase() === expectedHash.slice(0, -4).toUpperCase()) {
        resolve(response)
      }
        reject(response)
    })
  })
}

let assets = {
  "dog" : "4b55b347023bd151e3572b0ba98a7ce7d9edc12b40e2255a400674c4111db08a.jpg",
  "cat" : "0ad5d1a8d31831597f9e21185670bfda64f351ad7db3c501155f449518d23e2b.jpg",
  "bunny" : "75b8cbf64122ff2c8903604aaa0db94d1d295921535e0c3cd82cd92f2b7df20e.jpg",
  "frog" : "4e4f855f0d47ab40e0b8a72c846cad364e21462484f5b22a257f622d17ebba65.png"
}

// serve the content from cache if it's there, if not fallback to the network
function fromCacheThenNetwork(request) {
  let url = request.url.split("/")
  let assetName = url[3]
  let asset_temp = assetName
  let check = false
  // first find in local cache
   return caches.match(request).then(function(cachedContent) {
    // return from cache
    if (cachedContent) {
      console.log("serving " + assetName + " from cache");
    }

    if (assetName.includes("dog") || assetName.includes("cat") || assetName.includes("bunny") || assetName.includes("frog")) {
      assetName = findAsset(assetName)
      console.log(asset_temp + ": " + assetName);
      check = true
    } else {
      if (assetName == "") {
        assetName = findAsset(assetName)
      }
    }

    let edgeUrl = EDGENODE + "/content?website=" + WEBSITE + "&asset=" + assetName

    return cachedContent || fetch(edgeUrl).then(function(response) {
      if (check) {
        return checkHash(assetName,response.clone()).then(function(res) {
          console.log("resolved");
          return res.clone();
        }).catch(function(res){
          console.log("rejected");
          return res.clone();
        });
      }
      // checkHash(assetName, contentString)
      // return from the origin + add to cache
      // cache the new response for the future
      addToCache(request.url, response.clone())
      // console.log(response);
      console.log("serving " + url[3] + " from " + edgeUrl);
      let masterNodeUrl = request.url
      return response
    })
  })
  // if the cache doesnt have it AND we are offline
  .catch(function(err) {
    console.log(err);
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

// convert the name to the hash
function findAsset(assetName) {
  if (assetName == "") {
    return "index.html"
  }
  return assets[assetName.split(".")[0]]
}

var sha256 = function a(b) {
     function c(a, b) {
       return a >>> b | a << 32 - b
     }
     for (var d, e, f = Math.pow, g = f(2, 32), h = "length", i = "", j = [], k = 8 * b[h], l = a.h = a.h || [], m = a.k = a.k || [], n = m[h], o = {}, p = 2; 64 > n; p++)
       if (!o[p]) {
         for (d = 0; 313 > d; d += p) o[d] = p;
         l[n] = f(p, .5) * g | 0, m[n++] = f(p, 1 / 3) * g | 0
       }
     for (b += "\x80"; b[h] % 64 - 56;) b += "\x00";
     for (d = 0; d < b[h]; d++) {
       if (e = b.charCodeAt(d), e >> 8) return;
       j[d >> 2] |= e << (3 - d) % 4 * 8
     }
     for (j[j[h]] = k / g | 0, j[j[h]] = k, e = 0; e < j[h];) {
       var q = j.slice(e, e += 16),
         r = l;
       for (l = l.slice(0, 8), d = 0; 64 > d; d++) {
         var s = q[d - 15],
           t = q[d - 2],
           u = l[0],
           v = l[4],
           w = l[7] + (c(v, 6) ^ c(v, 11) ^ c(v, 25)) + (v & l[5] ^ ~v & l[6]) + m[d] + (q[d] = 16 > d ? q[d] : q[d - 16] + (c(s, 7) ^ c(s, 18) ^ s >>> 3) + q[d - 7] + (c(t, 17) ^ c(t, 19) ^ t >>> 10) | 0),
           x = (c(u, 2) ^ c(u, 13) ^ c(u, 22)) + (u & l[1] ^ u & l[2] ^ l[1] & l[2]);
         l = [w + x | 0].concat(l), l[4] = l[4] + w | 0
       }
       for (d = 0; 8 > d; d++) l[d] = l[d] + r[d] | 0
     }
     for (d = 0; 8 > d; d++)
       for (e = 3; e + 1; e--) {
         var y = l[d] >> 8 * e & 255;
         i += (16 > y ? 0 : "") + y.toString(16)
       }
     return i
   };
