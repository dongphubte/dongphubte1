#!/bin/bash

# Sửa package.json để đảm bảo đường dẫn đúng
sed -i 's/"build": "vite build && esbuild server\/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist"/"build": "vite build && esbuild server\/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist\/server"/' package.json
sed -i 's/"start": "NODE_ENV=production node dist\/index.js"/"start": "NODE_ENV=production node dist\/server\/index.js"/' package.json

# Hiển thị kết quả
echo "Đã sửa package.json:"
cat package.json | grep "\"build\"\|\"start\""

# Cài đặt tất cả dependencies
npm install --include=dev

# Build frontend và backend
npm run build

# Kiểm tra kết quả build
if [ -d "dist" ]; then
  echo "Build completed successfully!"
  ls -la dist/
  if [ -d "dist/server" ]; then
    echo "Server folder found:"
    ls -la dist/server/
  else
    echo "Warning: Server folder not found in dist/"
  fi
else
  echo "Build failed. Check the logs."
  exit 1
fi