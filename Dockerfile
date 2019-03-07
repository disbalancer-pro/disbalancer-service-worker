FROM alpine

ENV SW_DOMAIN='example.com'

ENV SW_CACHE='gladius-cache-v1'

WORKDIR /data

COPY sw/service-worker.js .

RUN mkdir /build
VOLUME /build

CMD echo "const CACHE = '$SW_CACHE';const WEBSITE = '$SW_DOMAIN';const MASTERNODE = 'https://$SW_DOMAIN';const MNLIST = '$SW_DOMAIN/docile-stu';" > /build/service-worker.js;cat /data/service-worker.js >> /build/service-worker.js