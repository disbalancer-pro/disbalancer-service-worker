
self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(function(event) {
    return self.clients.claim();
  });
});

self.onfetch = function(event) {
  if (event.request.url.includes('dog.jpg')) {
    var init = {
      method: 'GET',
      mode: event.request.mode,
      cache: 'default'
    };
    var url = 'http://localhost:5001/cat.jpg';
    event.respondWith(fetch(url, init));
  } else {
    event.respondWith(fetch(event.request));
  }
};
