const CACHE = 'gladius-cache'
const WEBSITE = 'blog.gladius.io'
const EDGENODE = 'http://localhost:8080'
const MASTERNODE = 'http://blog.gladius.io'

// install stage
self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(preCache());
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
  event.waitUntil(getList(MASTERNODE))
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
            console.log("expected: " + expectedHash);
            console.log("actual:   " + hash);
            reject(Error("Hash check failed"))
          }
        })
      }
    })
  })
}

let assets = {
  "assetHashes": {
    "/1.9c302b2a2acf7a91fb09.css": "5cb33cc1d7fe335475313ed547333dad18a0042e6022eedc088cf4c6c587663f",
    "/static/d/921/path---development-update-17-08-17-be-0-110-8tJcpJsbJvQdOWjqQc1OklZLClg.json": "19ea6e5595a945351c2c1df5eae5351efcfd1cb616f7363d4653f84ab03702c6",
    "/workbox-v3.6.3/workbox-strategies.prod.js": "96b654f16c850c2c437a47268a6f6741045baadf30ab8f5b9815cbc2241c0b69",
    "/offline-plugin-app-shell-fallback/index.html": "c30aa645b3f1d903c3e00db659c182463fc5f4b7064d7a59d7e5fc3ba080e8f6",
    "/static/d/164/path---404-html-516-62a-NZuapzHg3X9TaN1iIixfv1W23E.json": "2aba5a0cedbcb2c9688ff6ad7bd23d3c9a9eda4e3c35b65c7eb80b9216f45ad2",
    "/component---src-templates-blog-post-jsx-930512844aaaab306d69.js": "b4607fef5acef37406309b1558b1bd7ecdbe397b8c2ac9f85429dd7e0584b8bf",
    "/sw.js": "5e1fafb93efa00fd1b8d299f134e96f04c6d94ae606c650bc43acd3f51e6c262",
    "/workbox-v3.6.3/workbox-core.prod.js": "8a4692e0ce9d06bab525501aa85639bb10b8395c0ac46c76a5dc1c589e826486",
    "/0-458e90dba83ef73bda5e.js": "7b92125706ba4947ca8359922127ab897ba258cfbe714f17d6f8ffb31ab590a5",
    "/component---src-pages-404-jsx-2e922e42565e0e43876b.js": "68c0fa7f1cb2638bbf131edd5e50eb8880f84c2c15cd59d1893f525ed771109f",
    "/workbox-v3.6.3/workbox-sw.js": "eb06946054b05d7ebe88169caf2b11f711c605edcfca6cf4ceca0aaa0c36c967",
    "/component---src-pages-index-jsx-606e4b2263e6265f3cbb.js": "2c7625a0d24c3a0e405f9d9e1aa6dec65badb26dac16e1d60810fbf38116f6ae",
    "/static/d/520/path---offline-plugin-app-shell-fallback-a-30-c5a-NZuapzHg3X9TaN1iIixfv1W23E.json": "2aba5a0cedbcb2c9688ff6ad7bd23d3c9a9eda4e3c35b65c7eb80b9216f45ad2",
    "/static/d/28/path---gladius-node-system-requirements-6-af-afb-E5TY9Rj4gBpp3KUtwOgQ0gIPNfo.json": "ac3755cccc3ade542356c23c723ad5bb8dd719c14977ddf0688909e372d0c067",
    "/workbox-v3.6.3/workbox-routing.prod.js": "a696a1298270af6e5c547cd0fd5df4b455ec486d9f832ad9d1b07e9f632ccb88",
    "/site.webmanifest": "310b869434f0ee9d99a110e5ef6bfb41eac115bce2428f562ff5df14378519ff",
    "/workbox-v3.6.3/workbox-precaching.prod.js": "0068f50cd7685dd1191a494ae657377f21797fc573ac5f9b1e7c9bafe8fa4d8d",
    "/static/d/286/path---gladius-open-beta-launch-rewards-program-ffa-3d3-fRjsqEM2lUFNHpMi5b7Ov0TqfY.json": "c6728870a7b1a4e97dc80a6517a6f046166d45ddedd8afac334aabfd50b7ea8e",
    "/static/d/700/path---gladius-partners-with-digital-ocean-9-be-9bd-8MH8XgzI06xEpLEkvfHtxHH6VQ.json": "5549a2b16373ecfd8cd90fbc1afc75ad5ebf65883f1feaab7186d53792fb1d61",
    "/": "cd758e961199370a6f4057f5d302e11d9bbc48c86597b2d9da36eebbd3aea5fe",
    "/1-cfc2fe5656b849c3bc22.js": "e3b1695acdcba900d4dda22a93c42f5dc72a3190ca8843c71ac90f4c09e45c61",
    "/webpack-runtime-e3ba47d3ca04d4c11147.js": "e03bc514184800bf31699a8ba30b6f7be564c88d0f22066d3152d7e7eaa8ef3a",
    "/app-3a9fab6814e6cb51feae.js": "adb1363be87bce937fbd290332168436a8081a208e49b8fc3ca238fdcd62107a",
    "/static/d/672/path---index-6a9-Exrs9ddYxm2BNZvR7PjAyW54HhY.json": "91137914d91f9eb0f0271e6cc023bf436cd550653918cc2a34975740699bf4fc",
    "/8-d36bf60b4184ec6b38dc.js": "c80ce99d7a5c7cf8102e6749e73dfe91e552388cd9d88aafa90327a1fcda78f4",
    "/component---node-modules-gatsby-plugin-offline-app-shell-js-8d468fe74d4d22168837.js": "6f038a3e3a8d9154df235dfff849b263f613a256906b3c46fcee5183542668f1",
    "/static/d/223/path---participating-in-gladius-public-pre-sale-c-5-c-fde-BdqjxDRCW3tp8Ac9a5PEnz6rA.json": "26242216d605d2003a3dbbbc0ac17982112a386c7f5eeb35f57349bc458ee195",
    "/index.html": "b9af6a1c6fd06fa542ebd3f67d1da5c9f654ef082301492889aeedfbd7c613cd",
    "/main.js": "d2aabf3a2034e85612455b98aa37866f917fbbec5016518245b89af95ce93aa0",
    "/service-worker.js":"81dd97de34a05b60f6e52ef03a147b0a7945205d21eb899d325fdd83faccbcbf",
  },
  "edgeNodes": []
}

// serve the content from cache if it's there, if not fallback to the network
function fromCacheThenNetwork(request) {
  let url = request.url.split("/")
  let assetName = url[3]
  let asset_temp = assetName

  if (asset_temp == "") {
    asset_temp = "/"
  }

  if (!url.includes("localhost:8001")) {
    return fetch(request.url)
  }

  // first find in local cache
   return caches.match(request).then(function(cachedContent) {
    if (cachedContent) {
      console.log("Serving " + asset_temp + " from cache");
    }
    // rename the asset to its hash
    asset = {
      "name" : assetName,
      "hash" : findAsset(assetName)
    }

    if (!asset.hash) {
      console.log("serving " + asset.name + " from masternode");
      return fetch(request.url)
    }

    if (asset.name == "") {
      asset.name = "index.html"
    }

    // build the url
    let edgeUrl = EDGENODE + "/content?website=" + WEBSITE + "&asset=" + asset.hash

    // return from cache or fetch from network (edge node)
    return cachedContent || fetch(edgeUrl).then(function(response) {
      // check the hash first to make sure its the same file
      return checkHash(asset.hash,response.clone()).then(function(res) {
        // rebuild the response in order to set the correct headers
        console.log("serving " + asset.name + " from edgenode");
        return rebuildResponse(res.clone(), asset.name).then(function(response) {
          // add it to the cache for future use
          addToCache(request.url, response.clone())
          return response
        })
      }).catch(function(err){
        console.log(err);
        // replace with a default picture from cache
        return caches.match('mstile-150x150.png');
      });
    }).catch(function(err){
      console.log(err);
      return fetch(request.url)
    })
  })
  // if the cache doesnt have it AND we are offline
  .catch(function(err) {
    console.log(err);
    console.log("Offline and not found! Here's a default from the cache!");
    return caches.match('mstile-150x150.png');
  })
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
function findAsset(assetName) {
  if (assetName == "") {
    assetName = "index.html"
  }

  // console.log("FINDER: " + assetName + " : " + assets.assetHashes["/" + assetName]);

  return assets.assetHashes["/" + assetName]
}

// array buffer to hex
function bufferToHex1(buffer) {
    var s = '', h = '0123456789ABCDEF';
    (new Uint8Array(buffer)).forEach((v) => { s += h[v >> 4] + h[v & 15]; });
    return s;
}

function getList(url){
  fetch(url, {
    method: "GET",
    mode: "cors", // no-cors, cors, *same-origin
    headers: {
      "gladius-masternode-direct":"",
    },
  }).then(function(res){
    // console.log(res);
  })
}