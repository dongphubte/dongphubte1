#!/bin/bash

# Script thiết lập HoeEdu Solution trên localhost

echo "===== Thiết lập HoeEdu Solution trên localhost ====="
echo

# Kiểm tra Node.js
if ! command -v node &> /dev/null; then
  echo "Lỗi: Node.js chưa được cài đặt!"
  echo "Vui lòng cài đặt Node.js từ https://nodejs.org/"
  exit 1
fi

# Kiểm tra phiên bản Node.js
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 16 ]; then
  echo "Lỗi: Node.js phiên bản ${NODE_VERSION} quá cũ."
  echo "Vui lòng cài đặt Node.js phiên bản 16 trở lên từ https://nodejs.org/"
  exit 1
fi

# Kiểm tra PostgreSQL
if ! command -v psql &> /dev/null; then
  echo "Cảnh báo: PostgreSQL chưa được cài đặt hoặc không nằm trong PATH!"
  echo "Bạn cần cài đặt PostgreSQL để ứng dụng hoạt động."
  echo "Xem hướng dẫn trong file LOCALHOST_DEPLOYMENT.md"
  
  read -p "Bạn có muốn tiếp tục mà không kiểm tra PostgreSQL? (y/n) " CONTINUE
  if [ "$CONTINUE" != "y" ]; then
    exit 1
  fi
fi

# Tạo file .env nếu chưa tồn tại
if [ ! -f .env ]; then
  echo "Tạo file .env..."
  cat > .env << EOL
DATABASE_URL=postgresql://postgres:password@localhost:5432/hoeedu
NODE_ENV=production
SESSION_SECRET=$(openssl rand -hex 32)
EOL
  
  echo "Đã tạo file .env với các giá trị mặc định."
  echo "Vui lòng chỉnh sửa file này để đặt mật khẩu PostgreSQL của bạn."
fi

# Cài đặt dependencies
echo "Cài đặt dependencies..."
npm install

# Build ứng dụng
echo "Build ứng dụng..."
npm run build

# Hướng dẫn tiếp theo
echo
echo "===== Thiết lập gần hoàn tất! ====="
echo "Các bước tiếp theo:"
echo "1. Chỉnh sửa file .env với thông tin kết nối PostgreSQL của bạn"
echo "2. Tạo cơ sở dữ liệu với lệnh: npm run db:push"
echo "3. Khởi động ứng dụng: npm start"
echo "4. Truy cập ứng dụng tại http://localhost:5000"
echo
echo "Xem thêm chi tiết trong file LOCALHOST_DEPLOYMENT.md"