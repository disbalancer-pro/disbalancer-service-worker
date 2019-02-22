// service worker cache polyfill
// importScripts('serviceworker-cache-polyfill.js')

const CACHE = 'gladius-cache-v1'
const WEBSITE = 'blog.gladius.io'
const HOST = 'blog.gladius.io'
const SEEDNODE = 'http://blog.gladius.io:8080'
const MASTERNODE = 'https://blog.gladius.io'
const MNLIST = 'https://blog.gladius.io/docile-stu'
const MNONLINE = false

const MNRESPONSE = {
  "assetHashes": {
    "/component---src-templates-blog-post-jsx-c65019d94aacb4255eb4.js": "eae35559dae5a6c3045823b422b5e5584c2302d933d6d2e3a260e9743e357e4a",
    "/0-9452b028c0c63d766294.js": "6ba2d9faf76eb13f81c8b2af7359ed209e064bd522b73fb319e1f63e6ff3f461",
    "/api/v1/pods": "cbf1fdfdb7257daf8b0905d94bd04e2829c502c9c01b1d96bb979069e2ebc895",
    "/static/d/978/path---gladius-node-system-requirements-6-af-afb-F7VFRyTXrKoeIEWPC2xRXb5eKRE.json": "0021d411925ee700ddf66a58df9ff116cf2e54ce9e2284b440dc47e2f5ebe637",
    "/": "114eb75ed4a010ffe764063c9b1e62a7bdcf4d36d899a28d7ec1fdb0927a72d1",
    "/pages-manifest-a59a9b14babd21544c52.js": "f0f763984de40d22b02eb62dc51c457b2da40e993805848fda0b9b90c2f46d0e",
    "/imp/test.php": "887c8ada6058f01125a5131f1c495ba5f0171b2c40466ea824494403b87c1a22",
    "/1-35a3119f4bd4d69c5356.js": "473f8aac07094d08eb3240cf669411dc98f5607d6e186cd337c81052eabe63e2",
    "/favicon.ico": "eea4f9f9f33015be7589f3bddb4061a5d4d44dc731b6593d2c1cf5030d7fd5cd",
    "/.DS_Store": "887c8ada6058f01125a5131f1c495ba5f0171b2c40466ea824494403b87c1a22",
    "/developer": "cbf1fdfdb7257daf8b0905d94bd04e2829c502c9c01b1d96bb979069e2ebc895",
    "/static/d/663/path---gladius-partners-with-digital-ocean-9-be-9bd-rlHy22hzDzTlKw24wAdqMXH4.json": "0e9ba8a33f14ac13c33f56ce95b1ea31e39fd2bc9fe4e1682dd2941dff137afc",
    "/component---src-pages-index-jsx-2918ee385d89424c0187.js": "b5920228d900e2cd1b2e6a7f96b5d0be4b2aaeecd93072dc97be820cc1742508",
    "/app-2d61a7a6a4bf01441be5.js": "dd15140ba52f86cf591747f0b54e3a734e10454677c60f7b21288b8dc758fc0f",
    "/gladius-node-system-requirements/": "58223d7c53c415e3f539fdf57296c941255a8f420297dae76b7db68cf888f6b8",
    "/static/d/632/path---index-6a9-PB7wvjHk4PfGcA6zbEVWoh6BtZI.json": "af2fb12ae0bc18662955b21ecc86e89c4df43e9bdd336ad845b55e4036a3d5d3",
    "/webpack-runtime-8dd6218e3a37d039210b.js": "6164e6839f8afe1bfad9c1240387abf09a7303e6325bfb310eda9f796732dec8",
    "/robots.txt": "887c8ada6058f01125a5131f1c495ba5f0171b2c40466ea824494403b87c1a22",
    "/static/d/673/path---development-update-17-08-17-be-0-110-Mq1xK98NvJj7wEYcx1yfPSJthM.json": "29af607eca7885d59fd15b5ea5e93a5ef23c8e0269a33e78ce0e5093b452ea35",
    "/static/d/240/path---gladius-open-beta-launch-rewards-program-ffa-3d3-rQtDlrghi1aHCbpbCW4PSy6OFc.json": "a47f21c7a164540eff77b32d50e4594f0231c65100112c128037a9d748fc009e"
  },
  "edgeNodes": ["https://0xe8ebd13306f6f27562cf471ddde325985a1f76fe.cdn.beta.gladiuspool.com:8080"]
}

// install stage
self.addEventListener('install', function(event) {
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
  // fetch requests again in order to update the cache
  event.waitUntil(updateCache(event.request));
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
  console.log("added "+ request + " to cache");
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
            return
          } else {
            reject(Error("hash check failed.\nexpected hash: " + expectedHash + "\nactual hash: " + hash))
            return
          }
        }).catch(function(err){
          console.error(expectedHash);
          console.error(err);
        })
      }
    })
  })
}

// serve the content from cache if it's there, if not fallback to the network
async function fromCacheThenNetwork(request) {
  const url = new URL(request.url);

  // if it's from a different host then proxy it
  if (!url.hostname.includes(HOST)) {
    console.warn(url.pathname,"not from host");
    return await proxyToMasterNode(request)
  }

  // 1. See if we have the request in the cache
  const cachedContent = await caches.match(request)
  // if it is then we just serve from cache
  if (cachedContent) {
    console.log("serving " + url.pathname + " from cache");
    return cachedContent
  }

  // 2. See if it's on an edgenode (check the masternode list)
  let hash, asset
  try {
    hash = await findHash(url.pathname)
    asset = {
      "name" : url.pathname,
      "hash" : hash
    }
  } catch(err) {
    // if there's a problem getting the hash just proxy it
    // also cache for next time
    console.warn("fromCacheThenNetwork:" + err);
    return await proxyToMasterNode(request)
  }

  // 3. If it is on an edgenode, pick one to serve it from
  let edgenode
  try {
    edgenode = await pickLocalEdgeNode(MNRESPONSE)
  } catch(err) {
    // if it's not on an edgenode proxy to masternode then cache for next time
    console.warn("pickEdgeNode: " + err)
    return await proxyToMasterNode(request)
  }

  // build the url
  const edgeUrl = edgenode + "/content?website=" + WEBSITE + "&asset=" + asset.hash
  const eurl = new URL(edgeUrl)

  // 4. Try and get the content from the edgenode
  let edgeResponse
  try {
    // return from edgenode or fallback to masternode
    edgeResponse = await fetch(edgeUrl)
  } catch(err) {
    console.warn("edgeNodeFetch: " + err)
    return await proxyToMasterNode(request)
  }

  // 5. Check the hash
  let checkedResponse
  try {
    // check the hash first to make sure its the same file
    // if the hash check fails then serve the fallback warning image
    checkedResponse = await checkHash(asset.hash,edgeResponse.clone())
  } catch(err) {
    console.error("checkHash: " + err)
    return useFallback()
  }

  // 6. Rebuild the response with the correct headers
  let rebuiltResponse
  try {
    // rebuilding the response to have the right headers
    rebuiltResponse = await rebuildResponse(checkedResponse.clone(), asset.name)
  } catch(err) {
    console.warn("rebuildResponse: " + err)
    return await proxyToMasterNode(request)
  }

  // 7. Finally return and add it to the cache for future use
  addToCache(request.url, rebuiltResponse.clone())
  console.log("serving " + asset.name + " from " + eurl.origin);
  return rebuiltResponse
}

// update consists in opening the cache, performing a network request and
// storing the new response data.
async function updateCache(request) {
  const url = new URL(request.url)

  // if it's from a different host then don't even try
  if (!url.hostname.includes(HOST)) {
    console.warn("update:",url.pathname,"not from host");
    return
  }

  // 2. See if it's on an edgenode (check the masternode list)
  let hash, asset
  try {
    hash = await findHash(url.pathname)
    asset = {
      "name" : url.pathname,
      "hash" : hash
    }
  } catch(err) {
    // if there's a problem getting the hash just update from network
    console.warn("updateCache/findHash: " + err);
    console.log("updateCache: cache updated from network");
    return await proxyToMasterNode(request)
  }

  // 3. If it is on an edgenode, pick one to serve it from
  let edgenode
  try {
    edgenode = await pickLocalEdgeNode(MNRESPONSE)
  } catch(err) {
    // if there's a problem getting the hash just update from network
    console.warn("updateCache/pickEdgeNode: " + err);
    console.log("updateCache: cache updated from network");
    return await proxyToMasterNode(request)
  }

  // build the url
  const edgeUrl = edgenode + "/content?website=" + WEBSITE + "&asset=" + asset.hash
  const eurl = new URL(edgeUrl)

  // 4. Try and get the content from the edgenode
  let edgeResponse
  try {
    // return from edgenode or fallback to masternode
    edgeResponse = await fetch(edgeUrl)
  } catch(err) {
    // if there's a problem getting the hash just update from network
    console.warn("updateCache/fetchEdgeNode: " + err);
    const res = await proxyToMasterNode(request)
    console.log("updateCache: cache updated from network");
  }

  // 5. Check the hash
  let checkedResponse
  try {
    // check the hash first to make sure its the same file
    // if the hash check fails then serve the fallback warning image
    checkedResponse = await checkHash(asset.hash,edgeResponse.clone())
  } catch(err) {
    console.error("updateCache/checkHash: " + err)
    console.error("updateCache/checkHash: hash check failed, could not update cache!");
    return
  }

  // 6. Rebuild the response with the correct headers
  let rebuiltResponse
  try {
    // rebuilding the response to have the right headers
    rebuiltResponse = await rebuildResponse(checkedResponse.clone(), asset.name)
  } catch(err) {
    // if there's a problem getting the hash just update from network
    console.warn("updateCache/rebuildResponse: " + err);
    console.log("updateCache: cache updated from", WEBSITE);
    return await proxyToMasterNode(request)
  }

  // if it passes all the checks then update the cache
  console.log("updateCache: cache updated from", edgenode);
  return addToCache(request, rebuiltResponse)
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
        return
      }
      let init = { "status" : res.status , headers: { "Content-Encoding": "gzip","Content-Type": contentType}};
      let myResponse =  new Response(blob, init)
      resolve(myResponse)
      return
    }).catch(function(err) {
      reject(err)
      return
    })
  })
}

// match the name to the hash
// uses the local "fake" api response
async function findLocalHash(assetName) {
  // makes things work when the masternode is down
  const asset = MNRESPONSE.assetHashes[assetName]
  if (asset === undefined) {
    console.warn(assetName, "NOT found in the fake api");
    throw new Error("findHash:",err)
  }
    console.log(assetName, "found in the fake api");
    return asset
}

// match the name to the hash
async function findHash(assetName) {
  // find mnlist response in cache
  const cache = await caches.match(MNLIST)
  if (cache) {
    // we did find in the cache and now we can use it
    const list = await cache.json()
    const hash = list.assetHashes[assetName]
    // make sure its actually in the list
    if (!hash) {
      throw new Error("findHash: asset not in list")
    }
    return hash
  }
  // if not in cache well then get it from the mn direct
  console.warn("cache: ", "asset list not in cache");
  let response
  try {
    response = await retrieveList(MNLIST)
  } catch(err) {
    // if we can't get the list then throw an error
    console.error(err)
    throw new Error("findHash:",err)
  }
  // we successfully got the list and now we can use it
  const list = await response.json()
  const hash = list.assetHashes[assetName]
  // make sure its actually in the list
  if (!hash) {
    throw new Error("findHash: asset not in list")
  }
  return hash
}

// pick an edgenode for lists
// uses the local "fake" api response
async function pickLocalEdgeNode(mnList) {
  // makes things work when the masternode is down
  const edgenode = MNRESPONSE.edgeNodes[0]
  if (edgenode === undefined) {
    console.warn("Edgenode not found in the fake api");
    throw new Error("pickLocalEdgeNode:",err)
  }
    console.log(edgenode, "found in the fake api");
    return edgenode
}

// takes the MN json response and picks an egdenode from the list
async function pickEdgeNode(mnList) {
  // find mnlist response in cache
  const cache = await caches.match(MNLIST)
  if (cache) {
    // we did find in the cache and now we can use it
    const list = await cache.json()
    const node = list.edgeNodes[0]
    // make sure its actually in the list
    if (!node) {
      throw new Error("pickEdgeNode: node not in list")
    }
    return node
  }
  // if not in cache well then get it from the mn direct
  console.warn("cache: ", "node list not in cache");
  let response
  try {
    response = await retrieveList(MNLIST)
  } catch(err) {
    // if we can't get the list then throw an error
    console.error(err)
    throw new Error("pickEdgeNode:",err)
  }
  // we successfully got the list and now we can use it
  const list = await response.json()
  const node = list.edgeNodes[0]
  // make sure its actually in the list
  if (!node) {
    throw new Error("pickEdgeNode: node not in list")
  }
  return node
}

// array buffer to hex
function bufferToHex1(buffer) {
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

async function proxyToMasterNode(request) {
  const url = new URL(request.url);
  console.log("proxied " + url.pathname + " to masternode");
  const res = await fetch(request.url)
  if (url.hostname.includes(HOST)) {
    addToCache(request.url, res.clone())
  }
  return res
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