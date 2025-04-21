#!/bin/bash

# Đảm bảo jq đã được cài đặt
if ! command -v jq &> /dev/null; then
  echo "jq không được cài đặt, đang cài đặt..."
  apt-get update && apt-get install -y jq
fi

# Sửa package.json để đảm bảo đường dẫn đúng
echo "Backup package.json trước khi sửa đổi"
cp package.json package.json.bak

# Sửa đường dẫn build trong package.json
echo "Sửa đường dẫn build và start trong package.json"
cat package.json | jq '.scripts.build = "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist/server"' > package.json.tmp
mv package.json.tmp package.json

cat package.json | jq '.scripts.start = "NODE_ENV=production node dist/server/index.js"' > package.json.tmp
mv package.json.tmp package.json

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