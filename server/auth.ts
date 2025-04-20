import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import crypto from "crypto";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export { hashPassword, comparePasswords };
export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "hoeedu-session-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  // Setup initial admin user if not exists
  const setupAdminUser = async () => {
    const adminUsername = "dongphubte";
    const adminPassword = "@Bentre2013";
    const adminEmail = "dongphubte@gmail.com";

    const existingAdmin = await storage.getUserByUsername(adminUsername);
    if (!existingAdmin) {
      await storage.createUser({
        username: adminUsername,
        password: await hashPassword(adminPassword),
        email: adminEmail,
      });
      console.log("Admin user created successfully");
    }
  };
  
  setupAdminUser();

  app.post("/api/register", async (req, res, next) => {
    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      return res.status(400).send("Tên đăng nhập đã tồn tại");
    }

    const user = await storage.createUser({
      ...req.body,
      password: await hashPassword(req.body.password),
    });

    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json(user);
    });
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  app.post("/api/forgot-password", async (req, res) => {
    const { email } = req.body;
    
    if (email !== "dongphubte@gmail.com") {
      return res.status(400).send("Email không đúng");
    }
    
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(404).send("Không tìm thấy người dùng với email này");
    }
    
    const token = crypto.randomBytes(20).toString("hex");
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 1); // Token valid for 1 hour
    
    await storage.updateUserResetToken(user.id, token, expiry);
    
    try {
      // Import sendPasswordResetEmail from email-service
      const { sendPasswordResetEmail } = require("./email-service");
      
      // Tạo link đặt lại mật khẩu (thay thế bằng domain thực tế khi triển khai)
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://hoedu.vn' 
        : 'http://localhost:5000';
      
      const resetLink = `${baseUrl}/reset-password?token=${token}`;
      
      // Gửi email đặt lại mật khẩu
      const emailSent = await sendPasswordResetEmail(email, resetLink);
      
      if (emailSent) {
        return res.json({
          message: "Link đặt lại mật khẩu đã được gửi đến email của bạn"
        });
      } else {
        console.error("Không thể gửi email đặt lại mật khẩu");
        // Vẫn trả về token trong môi trường phát triển để dễ kiểm tra
        if (process.env.NODE_ENV !== 'production') {
          return res.json({
            message: "Link đặt lại mật khẩu đã được gửi đến email (giả lập)",
            resetLink: `/reset-password?token=${token}`, // Chỉ hiển thị trong môi trường phát triển
          });
        } else {
          return res.status(500).send("Không thể gửi email đặt lại mật khẩu");
        }
      }
    } catch (error) {
      console.error("Lỗi khi xử lý email đặt lại mật khẩu:", error);
      
      // Trong môi trường phát triển, vẫn trả về token để kiểm tra
      if (process.env.NODE_ENV !== 'production') {
        return res.json({
          message: "Link đặt lại mật khẩu đã được gửi đến email (giả lập)",
          resetLink: `/reset-password?token=${token}`, // Chỉ hiển thị trong môi trường phát triển
        });
      } else {
        return res.status(500).send("Lỗi hệ thống khi xử lý yêu cầu đặt lại mật khẩu");
      }
    }
  });

  app.post("/api/reset-password", async (req, res) => {
    const { token, password } = req.body;
    
    const user = await storage.getUserByResetToken(token);
    if (!user) {
      return res.status(400).send("Token không hợp lệ hoặc đã hết hạn");
    }
    
    if (user.resetTokenExpiry && new Date(user.resetTokenExpiry) < new Date()) {
      return res.status(400).send("Token đã hết hạn");
    }
    
    const hashedPassword = await hashPassword(password);
    await storage.updateUserPassword(user.id, hashedPassword);
    await storage.clearUserResetToken(user.id);
    
    res.json({ message: "Mật khẩu đã được đặt lại thành công" });
  });

  app.post("/api/change-password", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Bạn cần đăng nhập để thực hiện thao tác này");
    }

    const { currentPassword, newPassword } = req.body;
    const userId = (req.user as Express.User).id;
    
    // Lấy thông tin người dùng
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).send("Không tìm thấy người dùng");
    }
    
    // Kiểm tra mật khẩu hiện tại
    const isPasswordValid = await comparePasswords(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).send("Mật khẩu hiện tại không đúng");
    }
    
    // Cập nhật mật khẩu mới
    const hashedPassword = await hashPassword(newPassword);
    await storage.updateUserPassword(userId, hashedPassword);
    
    res.json({ message: "Mật khẩu đã được thay đổi thành công" });
  });
}
