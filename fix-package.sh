#!/bin/bash

# Sửa đường dẫn trong package.json
sed -i 's/"build": "vite build && esbuild server\/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist"/"build": "vite build && esbuild server\/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist\/server"/' package.json
sed -i 's/"start": "NODE_ENV=production node dist\/index.js"/"start": "NODE_ENV=production node dist\/server\/index.js"/' package.json

echo "Package.json đã được sửa thành công!"
cat package.json | grep "build\|start"