FROM node:8.15.1-alpine

ENV SW_DOMAIN='example.com'
ENV SW_CACHE='gladius-cache-v'

WORKDIR /data

COPY sw/service-worker.js .
COPY docker.sh .

RUN npm install -g javascript-obfuscator; mkdir /build
VOLUME /build

RUN ls -a

CMD ["sh", "./docker.sh"]
