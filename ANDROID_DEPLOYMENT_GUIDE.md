# Hướng dẫn triển khai HoeEdu trên Android

Tài liệu này cung cấp hướng dẫn từng bước để triển khai ứng dụng HoeEdu Solution trên nền tảng Android và tạo file APK để cài đặt.

## Yêu cầu hệ thống

Trước khi bắt đầu, hãy đảm bảo bạn đã cài đặt các phần mềm sau:

1. **Node.js và npm**: Phiên bản 16 trở lên
2. **Android Studio**: Phiên bản mới nhất
3. **Android SDK**: API level 25 trở lên
4. **JDK**: Phiên bản 11 trở lên

## Bước 1: Tải dự án về máy

Tải dự án từ Replit về máy tính của bạn:

```bash
git clone <repo-url>
# Hoặc tải xuống dưới dạng ZIP từ Replit
```

## Bước 2: Sử dụng script tự động

Chúng tôi đã cung cấp một script tự động để giúp quá trình build dễ dàng hơn:

```bash
# Di chuyển vào thư mục dự án
cd hoeedu-solution

# Cấp quyền thực thi cho script
chmod +x build-android-apk.sh

# Chạy script
./build-android-apk.sh
```

Script này sẽ:
1. Cài đặt các phụ thuộc
2. Build ứng dụng web
3. Đồng bộ với nền tảng Android
4. Nếu có thể, sẽ tự động build APK

## Bước 3: Build APK thủ công trong Android Studio

Nếu script không thể build APK tự động, bạn có thể làm thủ công:

1. Mở dự án Android:
   ```bash
   npx cap open android
   ```

2. Android Studio sẽ mở với dự án. Chờ Gradle sync hoàn tất.

3. Build APK:
   - Chọn menu `Build > Build Bundle(s) / APK(s) > Build APK(s)`
   - Hoặc chọn `Run > Run 'app'` để chạy trực tiếp trên thiết bị/máy ảo đang kết nối

4. Tìm APK:
   - APK sẽ được tạo tại: `android/app/build/outputs/apk/debug/app-debug.apk`

## Bước 4: Cài đặt APK trên thiết bị Android

### Cách 1: Từ máy tính

1. Kết nối thiết bị Android với máy tính qua cáp USB
2. Bật chế độ nhà phát triển và gỡ lỗi USB trên thiết bị
3. Sử dụng ADB để cài đặt:
   ```bash
   adb install android/app/build/outputs/apk/debug/app-debug.apk
   ```

### Cách 2: Trên thiết bị

1. Chuyển file APK vào thiết bị (qua email, cloud storage, v.v.)
2. Mở file APK trên thiết bị để cài đặt
3. Có thể bạn cần cấp quyền cài đặt từ nguồn không xác định

## Khắc phục sự cố

### Lỗi "Trust developer" trên Android

Nếu gặp lỗi này, bạn cần:
1. Mở **Cài đặt** > **Bảo mật**
2. Bật "Cài đặt từ nguồn không xác định" hoặc "Cài đặt ứng dụng không rõ nguồn gốc"

### Lỗi Gradle Build

Nếu gặp lỗi khi build:
1. Mở `android/build.gradle` và kiểm tra phiên bản Gradle
2. Đảm bảo JDK phù hợp với phiên bản Gradle
3. Thử clean và rebuild dự án trong Android Studio

### Lỗi kết nối API

Ứng dụng Android mặc định sẽ cố gắng kết nối đến API từ server phát triển. Nếu muốn sử dụng API production:

1. Mở `capacitor.config.ts`
2. Thay đổi cài đặt server:
   ```typescript
   server: {
     url: 'https://your-production-api.com',
     cleartext: true
   }
   ```
3. Đồng bộ lại với Android:
   ```bash
   npx cap sync android
   ```
4. Build lại APK

## Kết luận

Bằng cách làm theo hướng dẫn này, bạn đã có thể tạo file APK cho ứng dụng HoeEdu Solution và cài đặt nó trên các thiết bị Android. Nếu có bất kỳ câu hỏi nào, vui lòng liên hệ với đội ngũ phát triển.