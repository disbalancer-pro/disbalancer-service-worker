// install stage
self.addEventListener('install', function(event) {
  // we dont need to wait for other clients to close
  self.skipWaiting();
});

// active stage
self.addEventListener('activate', function(event) {
  // wait until
  event.waitUntil(function(event) {
    // we can take control of this existing session w/o reloading it
    return self.clients.claim();
  });
});

self.addEventListener('fetch', function(event) {
  console.log("requested resource: " + event.request.url)
  var url = event.request.url
  var route = url.split("/")[3]

  if (route != "" && !route.includes(".js")) {
    console.log("route: " + route)
    var init = {
      method: 'GET',
      mode: event.request.mode,
      cache: 'default'
    };

    url = "http://localhost:5001/" + route
    console.log("fetching: " + url)
    event.respondWith(fetch(url, init).then(
      function(res) {
        console.log("RES: ", res);
        return res
      },
      function(err) {
        console.log("ERROR: ",err);
        return err
      })
    )
  }
})