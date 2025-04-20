FROM node:20-slim

WORKDIR /app

# Sao chép package.json và package-lock.json
COPY package*.json ./

# Cài đặt tất cả dependencies (bao gồm devDependencies)
RUN npm install --include=dev

# Sao chép toàn bộ code
COPY . .

# Thiết lập quyền thực thi cho các file script
RUN chmod +x build.sh start.sh

# Build ứng dụng
RUN ./build.sh

# Thiết lập biến môi trường
ENV NODE_ENV=production
ENV PORT=5000

# Expose port để ứng dụng có thể truy cập
EXPOSE 5000

# Khởi chạy ứng dụng
CMD ["./start.sh"]