#!/bin/bash

echo "Backup package.json trước khi sửa đổi"
cp package.json package.json.bak

echo "Sửa đường dẫn build trong package.json"
# Sử dụng jq để chỉnh sửa JSON đúng cách
cat package.json | jq '.scripts.build = "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist/server"' > package.json.tmp
mv package.json.tmp package.json

echo "Sửa đường dẫn start trong package.json"
cat package.json | jq '.scripts.start = "NODE_ENV=production node dist/server/index.js"' > package.json.tmp
mv package.json.tmp package.json

echo "Package.json đã được sửa thành công!"
cat package.json | grep "build\|start"