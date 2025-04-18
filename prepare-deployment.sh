#!/bin/bash

# Script chuẩn bị file triển khai cho HoeEdu Solution

echo "===== Chuẩn bị triển khai HoeEdu Solution ====="
echo

# Kiểm tra các công cụ cần thiết
command -v zip >/dev/null 2>&1 || { echo "Lỗi: Cần cài đặt 'zip'. Vui lòng cài đặt và thử lại."; exit 1; }

# Tạo thư mục tạm thời cho triển khai
DEPLOY_DIR="deploy_hoeedu"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

echo "1. Sao chép file dự án..."
# Sao chép tất cả file cần thiết
cp -r client "$DEPLOY_DIR/"
cp -r server "$DEPLOY_DIR/"
cp -r shared "$DEPLOY_DIR/"
cp package.json package-lock.json "$DEPLOY_DIR/"
cp tsconfig.json vite.config.ts "$DEPLOY_DIR/"
cp postcss.config.js tailwind.config.ts "$DEPLOY_DIR/"
cp theme.json drizzle.config.ts "$DEPLOY_DIR/"
cp .env.example "$DEPLOY_DIR/.env.example"
cp CPANEL_DEPLOYMENT_GUIDE.md "$DEPLOY_DIR/DEPLOYMENT_GUIDE.md"
cp setup-production-db.sh "$DEPLOY_DIR/"

# Đảm bảo file shell script có quyền thực thi
chmod +x "$DEPLOY_DIR/setup-production-db.sh"

echo "2. Tạo file cấu hình ví dụ cho môi trường production..."
cat > "$DEPLOY_DIR/production.example.env" << EOL
# Cấu hình cơ sở dữ liệu
DATABASE_URL=postgresql://username:password@localhost:5432/database_name

# Môi trường ứng dụng
NODE_ENV=production

# Bảo mật phiên
SESSION_SECRET=thay_doi_chuoi_nay_thanh_mot_chuoi_ngau_nhien_an_toan
EOL

echo "3. Tạo file README.txt với hướng dẫn cơ bản..."
cat > "$DEPLOY_DIR/README.txt" << EOL
HoeEdu Solution - Hướng dẫn triển khai

1. Đọc file DEPLOYMENT_GUIDE.md để biết hướng dẫn chi tiết
2. Thiết lập biến môi trường dựa trên file .env.example
3. Cài đặt dependencies: npm install
4. Build ứng dụng: npm run build
5. Thiết lập cơ sở dữ liệu bằng cách chạy: npm run db:push
6. Khởi động ứng dụng: npm start

Để được hỗ trợ, vui lòng liên hệ: [thông tin liên hệ của bạn]
EOL

echo "4. Tạo file ZIP để triển khai..."
(cd "$DEPLOY_DIR" && zip -r ../hoeedu-solution.zip .)

echo "5. Dọn dẹp..."
rm -rf "$DEPLOY_DIR"

echo
echo "===== Hoàn tất! ====="
echo "File triển khai: hoeedu-solution.zip"
echo "Bạn có thể tải lên file này lên cPanel hosting của mình."
echo "Làm theo hướng dẫn trong CPANEL_DEPLOYMENT_GUIDE.md để hoàn tất triển khai."