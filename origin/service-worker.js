// install stage
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open('gladius').then(function(cache) {
      return cache.addAll([
        'dog.jpg',
        'cat.jpg',
        'bunny.jpg',
        'fox.png'
      ])
    })
  )
  // we dont need to wait for other clients to close
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
  console.log("fetching: " + event.request.url);
  event.respondWith(
    // first find in local cache
    caches.match(event.request).then(function(resp) {
      // return from cache
      if (resp) {
        console.log("serving " + event.request.url + " from cache");
        return resp
      } else {
        // if not in cache then make a network request
        fetch(event.request).then(function(response) {

        // cache the new response for the future
        let responseClone = response.clone();
        caches.open('gladius').then(function(cache) {
          cache.put(event.request, responseClone);
        });

        console.log("serving " + event.request.url + " from network");

        console.log(response);
        // return the content
        return response;
        });
      }
    }).catch(function() {
      console.log("Offline and not found! Here's something from the cache!");
      // if we can't find it AND we are offline then default
      return caches.match('fox.png');
    })
  );
});

// // this will run on every fetch for a resource
// self.addEventListener('fetch', function(event) {
//   console.log("requested resource: " + event.request.url)
//
//   // get the name of the resource
//   var url = event.request.url
//   var route = url.split("/")[3]
//
//   // make sure its not the index or a js file
//   if (route != "" && !route.includes(".js")) {
//     // make sure we have the route
//     if (checkHash(route, route)) {
//       console.log("route: " + route)
//       var init = {
//         method: 'GET',
//         mode: event.request.mode,
//         cache: 'default'
//       };
//
//       // contruct a request for the edge node
//       url = "http://localhost:5001/" + route
//       console.log("fetching: " + url)
//
//       // make request
//       event.respondWith(fetch(url, init).then(
//         function(res) {
//           console.log("RES: ", res);
//           return res
//         },
//         function(err) {
//           console.log("ERROR: ",err);
//           return err
//         })
//       ) // respond with
//     } // check route
//   } // if !index and !js
// })

function checkHash(hash1, hash2) {
  return true
}

