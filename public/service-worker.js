const CACHE = 'gladius-cache'
const WEBSITE = 'blog.gladius.io'
const EDGENODE = 'http://localhost:8080'
const MASTERNODE = 'http://blog.gladius.io'

// install stage
self.addEventListener('install', function(event) {
  event.waitUntil(retrieveList(MASTERNODE));
  self.skipWaiting();
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
  // serve from cache, fallback on network
  event.respondWith(fromCacheThenNetwork(event.request));
  // // fetch requests again in order to update the cache
  // event.waitUntil(update(event.request));
  // event.respondWith(fetch(event.request.url))
});

// open a cache and use `addAll()` with an array of assets to add all of them
// to the cache. Return a promise resolving when all the assets are added.
function preCache() {
  return caches.open(CACHE).then(function (cache) {
    return cache.addAll([
      'mstile-150x150.png'
    ]);
  });
}

// add a request/response pair to the cache
function addToCache(request, response) {
  console.log("Added "+ request + " to cache");
  caches.open(CACHE).then(function(cache) {
    cache.put(request, response);
  });
}

// check the hash of the file against the expected hash
function checkHash(expectedHash, response) {
  return new Promise(function(resolve, reject) {
    let clone = response.clone()
    return clone.blob().then(function(content) {
      let fr = new FileReader();
      fr.readAsArrayBuffer(content)
      fr.onloadend = function () {
        crypto.subtle.digest('SHA-256', fr.result).then(function(res){
          let hash = bufferToHex1(res)
          if (hash.toUpperCase() === expectedHash.toUpperCase()){
            resolve(response)
          } else {
            reject(Error("Hash check failed.\nexpected hash: " + expectedHash + "\nactual hash: " + hash))
          }
        })
      }
    })
  })
}

// serve the content from cache if it's there, if not fallback to the network
function fromCacheThenNetwork(request) {
  let url = new URL(request.url);
  return findHash(url.pathname).then(function(hash) {
    let asset = {
      "name" : url.pathname,
      "hash" : hash
    }

    // replace this for MN
    if(asset.hash == "cd758e961199370a6f4057f5d302e11d9bbc48c86597b2d9da36eebbd3aea5fe") {
      asset.hash = "b9af6a1c6fd06fa542ebd3f67d1da5c9f654ef082301492889aeedfbd7c613cd"
    }

    // first find in local cache then try the edge nodes then the masternode
    return caches.match(request).then(function(cachedContent) {
      if (cachedContent) {
        console.log("Serving " + asset.name + " from cache");
      } else {
        // if its not for our site or edgenode doesnt have it, proxy it to the masternode
        if (!url.hostname.includes("localhost") || !asset.hash) {
          console.log("Proxied " + url.pathname);
          return fetch(request.url).then(function(response) {
            addToCache(request.url, response.clone())
            return response
          })
        }
      }

      // if we get here, we assume the content is either cached or on an edgenode
      // build the url
      let edgeUrl = EDGENODE + "/content?website=" + WEBSITE + "&asset=" + asset.hash

      // return from cache or fetch from network (edge node)
      return cachedContent || fetch(edgeUrl).then(function(response) {
        // check the hash first to make sure its the same file
        if (url.pathname == "/") {
          console.log(asset.hash);
        }
        return checkHash(asset.hash,response.clone()).then(function(res) {
          // rebuild the response in order to set the correct headers
          console.log("serving " + asset.name + " from edgenode");
          console.log(response);
          return rebuildResponse(res.clone(), asset.name).then(function(response) {
            // add it to the cache for future use
            addToCache(request.url, response.clone())
            return response
          })
        }).catch(function(err){
          // if the asset fails the hash check
          console.log(err);
          console.log("Asset failed the hash check! Using default fallback.");
          return useFallback()
        });
      }).catch(function(err){
        // if the fetch to the edgenode was unsuccessful (return from masternode)
        console.log(err);
        return fetch(request.url)
      })
    }).catch(function(err) {
      // if the cache doesnt have it and we cant get from network (doesnt have or offline)
      Error(err);
      console.log(asset.name + " not found in cache or on network! Using default fallback.");
      return useFallback()
    })
  })
}

// This fallback never fails since it uses embedded fallbacks.
function useFallback() {
  return Promise.resolve(new Response(FALLBACK, { headers: {
    'Content-Type': 'image/svg+xml'
  }}));
}

// update consists in opening the cache, performing a network request and
// storing the new response data.
function update(request) {
  return caches.open(CACHE).then(function (cache) {
    return fetch(request).then(function (response) {
      return cache.put(request, response);
    }).catch(function(err){
      console.log("Could not update the cache");
    });
  });
}

// takes a blob and adds the appropriate headers, this is temporary
function rebuildResponse(response, assetName) {
  return new Promise(function(resolve, reject) {
    let res = response.clone()

    if (assetName == "/") {
      assetName = "/index.html"
    }

    let file = assetName.split(".")
    let fileType = file[file.length - 1]
    let contentType = ""

    switch(fileType) {
      case "html":
        contentType = "text/html"
        break;
      case "js":
        contentType = "text/javascript"
        break;
      case "png":
        contentType = "image/png"
        break;
      case "jpg":
        contentType = "image/jpeg"
        break;
      }


    return res.blob().then(function(blob) {
      if(contentType == "") {
        let response = new Response(blob)
        resolve(response)
      }
      let init = { "status" : res.status , headers: {"Content-Type": contentType}};
      let myResponse =  new Response(blob, init)
      resolve(myResponse)
    }).catch(function(err) {
      reject(err)
    })
  })
}

// match the name to the hash
function findHash(assetName) {
  // we SHOULD have the cached asset list, if we do, use it
  return caches.match(MASTERNODE).then(function(cachedAssets) {
    return cachedAssets.json().then(function(hashList) {
      return hashList.assetHashes[assetName]
    })
  })
  .catch(function(err) {
    // if for some reason the list isnt in the cache, add it to the cached, and use it
    console.log(err);
    return retrieveList(MASTERNODE).then(function(res){
      return res.json().then(function(hashList) {
        return hashList.assetHashes[assetName]
      })
    })
  })
}

// array buffer to hex
function bufferToHex1(buffer) {
    var s = '', h = '0123456789ABCDEF';
    (new Uint8Array(buffer)).forEach((v) => { s += h[v >> 4] + h[v & 15]; });
    return s;
}

// retrieve asset list from MN
function retrieveList(url) {
  return fetch(url, {
    method: "GET",
    mode: "cors", // no-cors, cors, *same-origin
    headers: {
      "gladius-masternode-direct":"",
    },
  }).then(function(res){
    addToCache(url,res.clone())
    return res
  })
}

// The fallback is an embedded SVG image.
let FALLBACK =
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="180" stroke-linejoin="round">' +
  '  <path stroke="#DDD" stroke-width="25" d="M99,18 15,162H183z"/>' +
  '  <path stroke-width="17" fill="#FFF" d="M99,18 15,162H183z" stroke="#eee"/>' +
  '  <path d="M91,70a9,9 0 0,1 18,0l-5,50a4,4 0 0,1-8,0z" fill="#aaa"/>' +
  '  <circle cy="138" r="9" cx="100" fill="#aaa"/>' +
  '</svg>';
