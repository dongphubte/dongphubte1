-- Thêm cột notes vào bảng payments nếu chưa tồn tại
ALTER TABLE payments ADD COLUMN IF NOT EXISTS notes TEXT;