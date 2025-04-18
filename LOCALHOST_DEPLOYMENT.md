# Hướng dẫn triển khai HoeEdu Solution trên localhost

## 1. Cài đặt PostgreSQL (nếu chưa có)

### Windows
1. Tải PostgreSQL từ [trang chủ PostgreSQL](https://www.postgresql.org/download/windows/)
2. Chạy trình cài đặt và làm theo hướng dẫn
3. Trong quá trình cài đặt, ghi nhớ:
   - Mật khẩu cho người dùng postgres
   - Cổng mặc định (thường là 5432)

### macOS
```bash
brew install postgresql
brew services start postgresql
```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

## 2. Tạo cơ sở dữ liệu

1. Mở terminal hoặc command prompt
2. Đăng nhập vào PostgreSQL:
   ```bash
   # Windows (sau khi cài đặt PostgreSQL)
   psql -U postgres
   
   # macOS
   psql postgres
   
   # Linux
   sudo -u postgres psql
   ```
3. Tạo database mới:
   ```sql
   CREATE DATABASE hoeedu;
   ```
4. Tạo người dùng mới (tùy chọn):
   ```sql
   CREATE USER hoeedu_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE hoeedu TO hoeedu_user;
   ```
5. Thoát khỏi PostgreSQL:
   ```sql
   \q
   ```

## 3. Cấu hình môi trường

1. Tạo file `.env` trong thư mục gốc của dự án:
   ```
   DATABASE_URL=postgresql://postgres:password@localhost:5432/hoeedu
   NODE_ENV=production
   SESSION_SECRET=your_secure_random_string
   ```
   
   (Thay thế `password` bằng mật khẩu của bạn. Nếu bạn tạo người dùng mới ở bước trước, sử dụng `postgresql://hoeedu_user:your_password@localhost:5432/hoeedu`)

## 4. Cài đặt dependencies và build ứng dụng

1. Mở terminal trong thư mục gốc của dự án
2. Cài đặt dependencies:
   ```bash
   npm install
   ```
3. Build ứng dụng:
   ```bash
   npm run build
   ```
4. Di chuyển cơ sở dữ liệu:
   ```bash
   npm run db:push
   ```

## 5. Khởi động ứng dụng

1. Khởi động ứng dụng:
   ```bash
   npm start
   ```
2. Ứng dụng của bạn giờ đây có thể truy cập tại: `http://localhost:5000`

## Gỡ lỗi thường gặp

### Lỗi kết nối cơ sở dữ liệu
- Đảm bảo PostgreSQL đang chạy
- Kiểm tra thông tin kết nối trong DATABASE_URL
- Xác minh database đã được tạo

### Ứng dụng không khởi động
- Kiểm tra xem có lỗi build nào không
- Đảm bảo biến môi trường đã được thiết lập chính xác
- Kiểm tra xem cổng 5000 có đang được sử dụng bởi ứng dụng khác không

### Lỗi cài đặt dependencies
- Xóa thư mục node_modules và file package-lock.json, sau đó chạy lại `npm install`
- Đảm bảo bạn đang sử dụng phiên bản Node.js tương thích (16 trở lên)

## Lưu ý phát triển

### Chạy môi trường phát triển
Nếu bạn muốn chạy ứng dụng ở chế độ phát triển:
```bash
npm run dev
```

### Theo dõi thay đổi
- Chế độ phát triển sẽ tự động tải lại khi có thay đổi
- Trong chế độ production, bạn cần build lại sau mỗi thay đổi

### Sao lưu cơ sở dữ liệu
Để sao lưu cơ sở dữ liệu PostgreSQL:
```bash
pg_dump -U postgres hoeedu > hoeedu_backup.sql
```

## Tài nguyên bổ sung

- [Tài liệu Node.js](https://nodejs.org/en/docs/)
- [Tài liệu PostgreSQL](https://www.postgresql.org/docs/)
- [Tài liệu Express.js](https://expressjs.com/)
- [Tài liệu Vite](https://vitejs.dev/guide/)