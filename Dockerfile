FROM alpine

ENV SW_DOMAIN='example.com'
ENV SW_CACHE_TAG='gladius-cache-v'
ENV SW_USE_EDGENODES=false
ENV SW_OBFUSCATE=false

WORKDIR /data

COPY sw/service-worker.js .
COPY sw/service-worker-accelerator.js .
COPY docker.sh .

RUN mkdir /build

VOLUME /build

CMD ["sh", "docker.sh"]
