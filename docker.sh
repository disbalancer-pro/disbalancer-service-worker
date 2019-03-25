#!/bin/bash

printf "\
const CACHE = '$SW_CACHE_TAG$(date +%s)';\n\
const WEBSITE = '$SW_DOMAIN';\n\
const MASTERNODE = 'https://$SW_DOMAIN';\n\
const MNLIST = 'https://$SW_DOMAIN/masternode-cache-list';\n\
\n\
" > /build/service-worker.js

SW_FILE="service-worker-edgenode.js"

if $SW_USE_EDGE_NODES; then
  echo "Building for Edge Nodes"
else
  echo "Building for Accelerator"
  SW_FILE="service-worker-accelerator.js"
fi

cat $SW_FILE >> /build/service-worker.js

if $SW_OBFUSCATE; then
  echo "Obfuscating the JS file"
  # Remove source file
  rm -rf /data/*.js

  # Obfuscator
  # https://github.com/javascript-obfuscator/javascript-obfuscator/
  javascript-obfuscator /build/service-worker.js --domainLock ["$SW_DOMAIN"] --disableConsoleOutput true --output /build/service-worker.js --compact true --self-defending true

  echo "Obfuscation Done"
fi
