#!/bin/bash

# Build script for HoeEdu APK generation
echo "==== Building HoeEdu Android APK ===="

# Cài đặt các phụ thuộc
echo "1. Cài đặt các phụ thuộc..."
npm install

# Build ứng dụng web 
echo "2. Build ứng dụng web..."
npm run build

# Đồng bộ hóa với nền tảng Android
echo "3. Đồng bộ hóa với nền tảng Android..."
npx cap sync android

# Kiểm tra biến môi trường ANDROID_SDK_ROOT
if [ -z "$ANDROID_SDK_ROOT" ]; then
  echo "Cảnh báo: Biến môi trường ANDROID_SDK_ROOT không được đặt!"
  echo "Vui lòng cài đặt Android SDK và thiết lập biến môi trường ANDROID_SDK_ROOT trước khi tiếp tục."
  echo ""
  echo "Mở Android Studio và build APK bằng cách chạy lệnh bên dưới:"
  echo "npx cap open android"
  exit 1
fi

# Kiểm tra xem Gradle có sẵn không
if command -v ./android/gradlew &> /dev/null; then
  # Build APK sử dụng Gradle
  echo "4. Build APK sử dụng Gradle..."
  cd android && ./gradlew assembleDebug
  
  # Kiểm tra kết quả build
  if [ $? -eq 0 ]; then
    echo "==============================================="
    echo "Build thành công! APK được tạo tại:"
    echo "android/app/build/outputs/apk/debug/app-debug.apk"
    echo "==============================================="
  else
    echo "Build thất bại! Vui lòng kiểm tra lỗi ở trên."
  fi
else
  echo "4. Không thể tìm thấy Gradle. Vui lòng build APK thủ công bằng Android Studio:"
  echo "npx cap open android"
fi