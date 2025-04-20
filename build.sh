#!/bin/bash

# Cài đặt tất cả dependencies
npm install --include=dev

# Build frontend và backend
npm run build

# Kiểm tra kết quả build
if [ -d "dist" ]; then
  echo "Build completed successfully!"
else
  echo "Build failed. Check the logs."
  exit 1
fi