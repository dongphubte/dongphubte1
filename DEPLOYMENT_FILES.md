# File cần thiết để triển khai HoeEdu Solution

Đây là danh sách các file và thư mục bạn cần tải lên hosting cPanel của mình:

## Thư mục
- `client/` - Chứa mã nguồn giao diện người dùng
- `server/` - Chứa mã nguồn máy chủ API
- `shared/` - Chứa mã nguồn dùng chung giữa client và server

## File cấu hình
- `package.json` - Cấu hình dự án và dependencies
- `package-lock.json` - Khóa phiên bản dependencies
- `tsconfig.json` - Cấu hình TypeScript
- `vite.config.ts` - Cấu hình Vite
- `postcss.config.js` - Cấu hình PostCSS
- `tailwind.config.ts` - Cấu hình Tailwind CSS
- `theme.json` - Cấu hình theme
- `drizzle.config.ts` - Cấu hình ORM cho database

## File hướng dẫn và script
- `CPANEL_DEPLOYMENT_GUIDE.md` - Hướng dẫn triển khai chi tiết
- `setup-production-db.sh` - Script thiết lập database
- `.env.example` - Mẫu file biến môi trường

## Quy trình tải lên
1. Tạo một thư mục mới trên hosting của bạn
2. Tải lên tất cả file và thư mục được liệt kê ở trên
3. Làm theo hướng dẫn trong `CPANEL_DEPLOYMENT_GUIDE.md`

## Lưu ý quan trọng
- **KHÔNG** tải lên thư mục `node_modules/` vì nó rất lớn và sẽ được tạo lại khi chạy `npm install` trên server
- **KHÔNG** tải lên file `.env` (nếu có) vì nó chứa thông tin nhạy cảm. Thay vào đó, tạo file này trên server dựa trên mẫu `.env.example`
- Đảm bảo cấu hình môi trường production đúng cách trước khi khởi động ứng dụng