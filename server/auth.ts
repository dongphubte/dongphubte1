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
    
    // In a real app, send an email with the reset link
    // For now, we'll just return the token as a response
    res.json({
      message: "Link đặt lại mật khẩu đã được gửi đến email",
      // In production, remove this
      resetLink: `/reset-password?token=${token}`,
    });
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
}
