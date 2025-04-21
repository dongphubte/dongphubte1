FROM node:20-slim

# Cài đặt jq để xử lý JSON
RUN apt-get update && apt-get install -y jq

WORKDIR /app

# Sao chép package.json và package-lock.json
COPY package*.json ./

# Sao chép script sửa package.json
COPY fix-package.sh ./
RUN chmod +x fix-package.sh

# Sửa package.json trước khi cài đặt
RUN ./fix-package.sh

# Cài đặt tất cả dependencies (bao gồm devDependencies)
RUN npm install --include=dev

# Sao chép toàn bộ code
COPY . .

# Hiển thị scripts trong package.json
RUN cat package.json | grep "\"script"

# Build ứng dụng
RUN npm run build

# Hiển thị cấu trúc thư mục sau khi build
RUN ls -la dist/

# Thiết lập biến môi trường
ENV NODE_ENV=production
ENV PORT=5000

# Expose port để ứng dụng có thể truy cập
EXPOSE 5000

# Khởi chạy ứng dụng
CMD ["npm", "start"]