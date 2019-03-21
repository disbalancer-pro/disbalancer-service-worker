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
    event.respondWith(fromCacheThenNetwork(event.request));
    // fetch requests again in order to update the cache
    event.waitUntil(updateCache(event.request));
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

// serve the content from cache if it's there, if not fallback to the network
async function fromCacheThenNetwork(request) {
  const url = new URL(request.url);

  // 1. See if we have the request in the cache
  const cachedContent = await caches.match(request)

  // if it is then we just serve from cache
  if (cachedContent) {
    console.log("FCTN: serving " + url.pathname + " from cache");
    return cachedContent
  }

  // if it's from a different host then proxy it
  if (!url.hostname.includes(WEBSITE)) {
    return proxyToMasterNode(request)
  }

  try{
    // 2. See if it's on an edgenode (check the masternode list)
    const hash = await findHash(MNLIST, url.pathname)
    const asset = {
      "name" : url.pathname,
      "hash" : hash
    }

    // 3. If it is on an edgenode, pick one to serve it from
    const edgenode = await pickEdgeNode(MNLIST)
    // build the new url for the edgenode
    const edgeUrl = edgenode + "/content?website=" + WEBSITE + "&asset=" + asset.hash
    const eurl = new URL(edgeUrl)

    // 4. Try and get the content from the edgenode
    const edgeResponse = await fetch(edgeUrl)

    // 5. Check the hash
    const checkedResponse = await assertHash(asset.hash, edgeResponse.clone())

    // 6. Rebuild the response with the correct headers
    const rebuiltResponse = await rebuildResponse(checkedResponse.clone(), asset.name)

    // 7. Finally return and add it to the cache for future use
    addToCache(request.url, rebuiltResponse.clone())
    console.log("FCTN: serving " + asset.name + " from " + eurl.origin);
    return rebuiltResponse
  } catch (err) {
    console.warn("FCTN:" + err);
    return proxyToMasterNode(request)
  }
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
  try{
    // 3. Do a hash comparison
    check = await assertHash(hash,cachedContent.clone())
  } catch (err) {
    console.warn("UC: wrong hash, proxying to edgenode");
    // if it's the wrong hash go get new content
    // 3. If it is on an edgenode, pick one to serve it from
    try {
      const edgenode = await pickEdgeNode(MNLIST)
      // build the new url for the edgenode
      const edgeUrl = edgenode + "/content?website=" + WEBSITE + "&asset=" + hash
      const eurl = new URL(edgeUrl)

      // 4. Try and get the content from the edgenode
      const edgeResponse = await fetch(edgeUrl)

      // 5. Check the hash
      const checkedResponse = await assertHash(hash,edgeResponse.clone())

      // 6. Rebuild the response with the correct headers
      const rebuiltResponse = await rebuildResponse(checkedResponse.clone(), url.pathname)

      // 7. Finally return and add it to the cache for future use
      addToCache(url, rebuiltResponse.clone())
    } catch (err) {
      console.warn("UC: edgenode unavailable, proxying to masternode");
      return proxyToMasterNode(request)
    }
    return
  }

  // if the cached content and mnlist have the same hash then it's up to date
  console.log("UC:", url.pathname, "up to date");
  return
}

// the edgenode just sends a body, so we need to rebuild the response
// with some headers so it can render correctly
async function rebuildResponse(response, assetName) {
  const res = response.clone()

  // this is just to give the root a .html extension
  if (assetName == "/") {
    assetName = "/index.html"
  }

  // seperate file from file type
  const file = assetName.split(".")
  const fileType = file[file.length - 1]
  let contentType = ""

  // we don't have a default here, but so far nothing has errored
  // if it doesn't have a content type, the browser just figures it out
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

  // extract the blob
  const blob = await res.blob()
  // if there is no matching content type there's nothing we can really do
  if(contentType == "") {
    const response = new Response(blob)
    return response
  }

  // build the new response
  const init = { "status" : res.status , headers: {"Content-Type": contentType}}
  const myResponse = new Response(blob, init)
  return myResponse
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

// takes the MN json response and picks an egdenode from the list
async function pickEdgeNode(mnList) {
  // find mnlist response in cache
  const cache = await caches.match(mnList)
  if (cache) {
    // we did find in the cache and now we can use it
    const list = await cache.json()
    const node = list.edgeNodes[0]
    // make sure its actually in the list
    if (!node) {
      throw new Error("PEN: node not in list")
    }
    return node
  }
  // if not in cache well then get it from the mn direct
  console.warn("PEN: ", "node list not in cache");
  let response
  try {
    response = await retrieveList(mnList)
  } catch(err) {
    // if we can't get the list then throw an error
    console.error(err)
    throw new Error("PEN:",err)
  }
  // we successfully got the list and now we can use it
  const list = await response.json()
  const node = list.edgeNodes[0]
  // make sure its actually in the list
  if (!node) {
    throw new Error("PEN: node not in list")
  }
  return node
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

// proxy to masternode
async function proxyToMasterNode(request) {
  const url = new URL(request.url);
  console.log("PTMN: proxied " + url.pathname + " to masternode");
  const res = await fetch(request.url)
  if (url.hostname.includes(WEBSITE)) {
    addToCache(request.url, res.clone())
  }
  return res
}
