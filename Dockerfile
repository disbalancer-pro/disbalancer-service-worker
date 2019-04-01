FROM node:8.15.1-alpine

ENV SW_DOMAIN='example.com'
ENV SW_CACHE_TAG='gladius-cache-v'
ENV SW_USE_EDGE_NODES=false
ENV SW_OBFUSCATE=false

RUN npm install mime
RUN npm install -g browserify
RUN npm install -g javascript-obfuscator; mkdir /build

WORKDIR /data

COPY sw/service-worker-*.js ./
COPY docker.sh .

VOLUME /build

CMD ["sh", "docker.sh"]