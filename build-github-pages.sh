#!/bin/bash

# Đảm bảo script dừng lại khi có lỗi
set -e

echo "====== Bắt đầu quá trình build cho GitHub Pages ======"

# Cài đặt dependencies nếu chưa có
echo "===> Cài đặt dependencies..."
npm install

# Build ứng dụng với cấu hình GitHub Pages
echo "===> Building cho GitHub Pages..."
npx vite build --config vite.config.github.ts

# Tạo file CNAME nếu bạn có tên miền tùy chỉnh
# echo "example.com" > docs/CNAME

# Tạo file .nojekyll để tránh xử lý Jekyll không cần thiết
echo "===> Tạo file .nojekyll..."
touch docs/.nojekyll

# Tạo file index.html nếu chuyển hướng
echo "===> Tạo file chuyển hướng..."
cat > docs/index.html << 'EOL'
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>HoeEdu Solution</title>
  <script>
    // Chuyển hướng đến trang chính của ứng dụng
    window.location.href = "/dongphubte1/";
  </script>
  <meta http-equiv="refresh" content="0; url=/dongphubte1/">
</head>
<body>
  <p>Nếu bạn không được chuyển hướng tự động, nhấp vào <a href="/dongphubte1/">đây</a>.</p>
</body>
</html>
EOL

echo "===> Commit thay đổi lên GitHub..."
git add docs
git commit -m "Build GitHub Pages"
git push

echo "====== Hoàn thành quá trình build ======"
echo "Bây giờ bạn có thể truy cập GitHub Pages Settings để triển khai trang web!"