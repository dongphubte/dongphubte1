# Hướng dẫn Triển khai HoeEdu Solution lên cPanel

Bản hướng dẫn này sẽ giúp bạn triển khai ứng dụng HoeEdu Solution lên hosting sử dụng cPanel.

## 1. Yêu cầu cơ bản

Trước khi bắt đầu, hãy đảm bảo hosting cPanel của bạn hỗ trợ:
- Node.js (phiên bản 16 trở lên)
- Cơ sở dữ liệu PostgreSQL
- Tùy chọn Node.js Application trong cPanel (Node.js Selector)

Nếu bạn không chắc chắn, hãy liên hệ với nhà cung cấp hosting để kiểm tra.

## 2. Chuẩn bị tệp tin để tải lên

1. Tạo file nén (ZIP) chứa toàn bộ dự án bằng cách chạy lệnh sau trong máy tính của bạn:
   ```bash
   zip -r hoeedu-solution.zip . -x "node_modules/*" ".git/*"
   ```

   Lệnh này sẽ tạo file `hoeedu-solution.zip` chứa tất cả tệp tin dự án, ngoại trừ thư mục `node_modules` và `.git`.

## 3. Thiết lập cơ sở dữ liệu PostgreSQL trên cPanel

1. Đăng nhập vào cPanel
2. Tìm và nhấp vào mục **PostgreSQL Databases**
3. Tạo cơ sở dữ liệu mới:
   - Nhập tên cho cơ sở dữ liệu (ví dụ: `hoeedu_db`)
   - Nhấp vào **Create Database**
4. Tạo người dùng cơ sở dữ liệu:
   - Nhập tên người dùng (ví dụ: `hoeedu_user`)
   - Nhập mật khẩu mạnh
   - Nhấp vào **Create User**
5. Thêm người dùng vào cơ sở dữ liệu:
   - Chọn người dùng và cơ sở dữ liệu vừa tạo
   - Cấp tất cả quyền (ALL PRIVILEGES)
   - Nhấp vào **Add User To Database**
6. Ghi lại thông tin kết nối:
   - Tên cơ sở dữ liệu
   - Tên người dùng
   - Mật khẩu
   - Máy chủ cơ sở dữ liệu (thường là localhost hoặc địa chỉ server PostgreSQL)
   - Cổng cơ sở dữ liệu (thường là 5432)

## 4. Thiết lập ứng dụng Node.js trên cPanel

1. Trong cPanel, tìm và nhấp vào **Setup Node.js App** hoặc **Node.js Selector**
2. Nhấp vào **Create Application**
3. Điền thông tin ứng dụng:
   - **Application mode**: Production
   - **Application root**: Đường dẫn thư mục nơi bạn muốn cài đặt ứng dụng (ví dụ: `hoeedu`)
   - **Application URL**: URL bạn muốn sử dụng (ví dụ: `yourdomain.com` hoặc `subdomain.yourdomain.com`)
   - **Application startup file**: `dist/index.js` (đây là file khởi động sau khi build)
   - **Node.js version**: Chọn phiên bản mới nhất có sẵn (tối thiểu 16.x)
   - **Passenger log file**: Đặt theo mặc định hoặc tùy chỉnh
4. Nhấp vào **Create** để tạo ứng dụng Node.js

## 5. Tải lên và giải nén file

1. Trong cPanel, mở **File Manager**
2. Điều hướng đến thư mục gốc ứng dụng Node.js đã chọn ở bước trước
3. Nhấp vào **Upload** và tải lên file `hoeedu-solution.zip`
4. Sau khi tải lên hoàn tất, chọn file ZIP và nhấp vào **Extract**
5. Giải nén tất cả tệp tin vào thư mục hiện tại

## 6. Thiết lập biến môi trường

1. Quay lại phần **Setup Node.js App** trong cPanel
2. Tìm ứng dụng của bạn và nhấp vào **Edit**
3. Cuộn xuống phần **Environment Variables** (hoặc **ENV Variables**)
4. Thêm các biến môi trường sau:
   ```
   DATABASE_URL=postgresql://username:password@host:port/database
   NODE_ENV=production
   SESSION_SECRET=your_secure_random_string
   ```
   
   Thay thế các giá trị:
   - `username`: Tên người dùng PostgreSQL đã tạo
   - `password`: Mật khẩu PostgreSQL đã tạo
   - `host`: Máy chủ PostgreSQL (thường là localhost)
   - `port`: Cổng PostgreSQL (thường là 5432)
   - `database`: Tên cơ sở dữ liệu PostgreSQL đã tạo
   - `your_secure_random_string`: Một chuỗi ngẫu nhiên an toàn cho phiên làm việc

5. Nhấp vào **Save** để lưu biến môi trường

## 7. Cài đặt dependencies và build ứng dụng

1. Trong cPanel, mở **Terminal** hoặc sử dụng **SSH** để kết nối đến hosting
2. Điều hướng đến thư mục ứng dụng Node.js:
   ```bash
   cd path/to/your/application
   ```
3. Cài đặt dependencies:
   ```bash
   npm install
   ```
4. Build ứng dụng:
   ```bash
   npm run build
   ```
5. Di chuyển cơ sở dữ liệu:
   ```bash
   npm run db:push
   ```

## 8. Khởi động ứng dụng

1. Quay lại phần **Setup Node.js App** trong cPanel
2. Tìm ứng dụng của bạn và nhấp vào **Restart**
3. Kiểm tra logs để đảm bảo ứng dụng đã khởi động thành công (theo dõi file log đã chỉ định khi tạo ứng dụng)

## 9. Kiểm tra ứng dụng

1. Mở trình duyệt và truy cập URL ứng dụng của bạn (ví dụ: `yourdomain.com` hoặc `subdomain.yourdomain.com`)
2. Đăng nhập và kiểm tra các chức năng để đảm bảo mọi thứ hoạt động bình thường

## Gỡ lỗi thường gặp

### Ứng dụng không khởi động
1. Kiểm tra file log của ứng dụng
2. Đảm bảo biến môi trường đã được thiết lập chính xác
3. Kiểm tra file khởi động (startup file) đã được đặt đúng
4. Đảm bảo build hoàn tất thành công và tạo file `dist/index.js`

### Lỗi kết nối cơ sở dữ liệu
1. Kiểm tra biến `DATABASE_URL` đã được thiết lập chính xác
2. Đảm bảo cơ sở dữ liệu PostgreSQL đang chạy
3. Kiểm tra người dùng cơ sở dữ liệu có quyền truy cập đầy đủ
4. Xác minh kết nối đến PostgreSQL không bị chặn bởi tường lửa

### Giao diện người dùng không hiển thị đúng
1. Kiểm tra quá trình build có lỗi nào không
2. Đảm bảo tệp tin tĩnh (CSS, JS) được phục vụ chính xác
3. Kiểm tra cấu hình CORS hoặc các vấn đề liên quan đến đường dẫn

## Bảo trì ứng dụng

### Cập nhật ứng dụng
1. Tải phiên bản mới lên máy chủ
2. Cài đặt lại dependencies: `npm install`
3. Build lại ứng dụng: `npm run build`
4. Khởi động lại ứng dụng trong cPanel

### Sao lưu dữ liệu
1. Trong cPanel, sử dụng tính năng **Backup** để sao lưu tất cả tệp tin và cơ sở dữ liệu
2. Xuất cơ sở dữ liệu PostgreSQL định kỳ để sao lưu riêng

### Giám sát hiệu suất
1. Sử dụng công cụ giám sát trong cPanel
2. Theo dõi file log của ứng dụng để phát hiện lỗi
3. Kiểm tra tài nguyên sử dụng (CPU, RAM) để đảm bảo ứng dụng hoạt động hiệu quả