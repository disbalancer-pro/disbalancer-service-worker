#!/bin/bash
printf "\
const CACHE = '$SW_CACHE_TAG$(date +%s)';\n\
const WEBSITE = '$SW_DOMAIN';\n\
const MASTERNODE = 'https://$SW_DOMAIN';\n\
const MNLIST = 'https://$SW_DOMAIN/docile-stu';\n\
\n\
" > /build/service-worker.js

SW_FILE="service-worker.js"

if [ ! $USE_EDGENODES ]; then
  SW_FILE="service-worker-accelerator.js"
fi

cat $SW_FILE >> /build/service-worker.js

if [ $SW_OBFUSCATE ]; then

fi