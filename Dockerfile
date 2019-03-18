FROM alpine

ENV SW_DOMAIN='example.com'

ENV SW_CACHE='gladius-cache-v'

WORKDIR /data

COPY sw/service-worker.js .

RUN mkdir /build
VOLUME /build

CMD echo "const CACHE = '$SW_CACHE$(date +%s)';const WEBSITE = '$SW_DOMAIN';const MASTERNODE = 'https://$SW_DOMAIN';const MNLIST = 'https://$SW_DOMAIN/masternode-cache-list';" > /build/service-worker.js;cat /data/service-worker.js >> /build/service-worker.js
