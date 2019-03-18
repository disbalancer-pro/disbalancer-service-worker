#!/bin/bash
echo "Creating Javascript File"

echo "const CACHE = '$SW_CACHE$(date +%s)';const WEBSITE = '$SW_DOMAIN';const MASTERNODE = 'https://$SW_DOMAIN';const MNLIST = 'https://$SW_DOMAIN/masternode-cache-list';" > /build/service-worker.js

cat /data/service-worker.js >> /build/service-worker.js

# Remove source file
rm -rf /data/service-worker.js

# Obfuscator
# https://github.com/javascript-obfuscator/javascript-obfuscator/
javascript-obfuscator /build/service-worker.js --domainLock ["$SW_DOMAIN"] --disableConsoleOutput true --output /build/service-worker.js --compact true --self-defending true

echo "Obfuscation Done"