# Gladius Service Manager

## How To Run
1. Build the Gladius Blog
2. Paste the blog files into the `public` folder
3. Use nginx to serve the blog on `localhost:XXXX`

## Nginx config
```
server {
    listen 8001 default_server;
    listen [::]:8001;

    # this needs to be wherever you built the blog
    root /Users/marcelo/Developer/gladius-service-worker/public;
    index index.html;

    server_name blog.gladius.io;

    location / {
        try_files $uri $uri/ $uri/index.html =404;
    }
```

## How To Use
Use the browser to access `localhost:XXXX`

## Tips
**Helpful Developer Tool Options**
- Chrome Dev Tools > Application:
  - Service Workers (left menu) > Update on Reload (Update SW on every page reload)
  - Clear storage (left menu):
    - Unregistered service workers
    - IndexedDB
    - Cache storage
    - Application cache

**Don't want to deal with CORS?**
- https://chrome.google.com/webstore/detail/allow-control-allow-origi/nlfbmbojpeacfghkpbjhddihlkkiljbi