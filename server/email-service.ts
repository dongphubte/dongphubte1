import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";

if (!process.env.MAILERSEND_API_KEY) {
  console.warn("MAILERSEND_API_KEY không được cung cấp - email sẽ không được gửi");
}

// Khởi tạo MailerSend với API key từ biến môi trường
const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY || "",
});

// Thông tin người gửi mặc định - sử dụng địa chỉ email được xác minh trong MailerSend
const defaultSender = {
  email: "no-reply@hoedu.vn",
  name: "HoeEdu Solution"
};

/**
 * Gửi email đặt lại mật khẩu
 * @param to Email người nhận
 * @param resetLink Link đặt lại mật khẩu
 * @returns Kết quả gửi email
 */
export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<boolean> {
  try {
    // Kiểm tra API key
    if (!process.env.MAILERSEND_API_KEY) {
      console.error("Không thể gửi email - MAILERSEND_API_KEY không được cấu hình");
      return false;
    }

    // Thiết lập nội dung email
    const recipients = [new Recipient(to)];
    
    // Thay thế biến trong template
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9e9e9;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #4f46e5;">HoeEdu Solution</h1>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 5px;">
          <h2 style="color: #111827; margin-top: 0;">Đặt lại mật khẩu của bạn</h2>
          <p style="color: #4b5563; margin-bottom: 20px;">Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản HoeEdu Solution của mình. Vui lòng nhấp vào nút bên dưới để đặt lại mật khẩu của bạn.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #4f46e5; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Đặt lại mật khẩu</a>
          </div>
          <p style="color: #4b5563; font-size: 14px;">Hoặc sao chép đường link này vào trình duyệt của bạn:</p>
          <p style="background-color: #e5e7eb; padding: 10px; border-radius: 3px; word-break: break-all; font-size: 14px;">${resetLink}</p>
          <p style="color: #4b5563; font-size: 14px;">Đường link này sẽ hết hạn sau 1 giờ. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px;">
          <p>© 2025 HoeEdu Solution. Tất cả các quyền được bảo lưu.</p>
        </div>
      </div>
    `;

    // Nội dung email text
    const textContent = `
      HoeEdu Solution

      ĐẶT LẠI MẬT KHẨU CỦA BẠN

      Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản HoeEdu Solution của mình.
      Vui lòng truy cập link sau để đặt lại mật khẩu: ${resetLink}

      Link này sẽ hết hạn sau 1 giờ. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.

      © 2025 HoeEdu Solution. Tất cả các quyền được bảo lưu.
    `;

    // Tạo tham số email
    const emailParams = new EmailParams()
      .setFrom(defaultSender)
      .setTo(recipients)
      .setSubject("Đặt lại mật khẩu HoeEdu")
      .setHtml(htmlContent)
      .setText(textContent);

    // Gửi email
    const response = await mailerSend.email.send(emailParams);
    console.log("Email đặt lại mật khẩu đã được gửi:", to);
    return true;
  } catch (error) {
    console.error("Lỗi khi gửi email đặt lại mật khẩu:", error);
    return false;
  }
}

/**
 * Gửi email chào mừng
 * @param to Email người nhận
 * @param username Tên người dùng
 * @returns Kết quả gửi email
 */
export async function sendWelcomeEmail(to: string, username: string): Promise<boolean> {
  try {
    // Kiểm tra API key
    if (!process.env.MAILERSEND_API_KEY) {
      console.error("Không thể gửi email - MAILERSEND_API_KEY không được cấu hình");
      return false;
    }

    // Thiết lập nội dung email
    const recipients = [new Recipient(to)];
    
    // Thay thế biến trong template
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9e9e9;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #4f46e5;">HoeEdu Solution</h1>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 5px;">
          <h2 style="color: #111827; margin-top: 0;">Chào mừng, ${username}!</h2>
          <p style="color: #4b5563; margin-bottom: 20px;">Cảm ơn bạn đã đăng ký sử dụng HoeEdu Solution - nền tảng quản lý giáo dục toàn diện. Chúng tôi rất vui mừng được chào đón bạn!</p>
          <p style="color: #4b5563; margin-bottom: 20px;">Với HoeEdu Solution, bạn có thể:</p>
          <ul style="color: #4b5563; margin-bottom: 20px;">
            <li>Quản lý lớp học và học sinh một cách hiệu quả</li>
            <li>Theo dõi điểm danh và thanh toán học phí</li>
            <li>Tạo báo cáo và phân tích dữ liệu giáo dục</li>
            <li>Và nhiều tính năng hữu ích khác</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://hoedu.vn/login" style="background-color: #4f46e5; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Đăng nhập ngay</a>
          </div>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px;">
          <p>© 2025 HoeEdu Solution. Tất cả các quyền được bảo lưu.</p>
        </div>
      </div>
    `;

    // Nội dung email text
    const textContent = `
      HoeEdu Solution

      CHÀO MỪNG, ${username}!

      Cảm ơn bạn đã đăng ký sử dụng HoeEdu Solution - nền tảng quản lý giáo dục toàn diện. 
      Chúng tôi rất vui mừng được chào đón bạn!

      Với HoeEdu Solution, bạn có thể:
      - Quản lý lớp học và học sinh một cách hiệu quả
      - Theo dõi điểm danh và thanh toán học phí
      - Tạo báo cáo và phân tích dữ liệu giáo dục
      - Và nhiều tính năng hữu ích khác

      Đăng nhập ngay: https://hoedu.vn/login

      © 2025 HoeEdu Solution. Tất cả các quyền được bảo lưu.
    `;

    // Tạo tham số email
    const emailParams = new EmailParams()
      .setFrom(defaultSender)
      .setTo(recipients)
      .setSubject("Chào mừng đến với HoeEdu Solution")
      .setHtml(htmlContent)
      .setText(textContent);

    // Gửi email
    const response = await mailerSend.email.send(emailParams);
    console.log("Email chào mừng đã được gửi:", to);
    return true;
  } catch (error) {
    console.error("Lỗi khi gửi email chào mừng:", error);
    return false;
  }
}