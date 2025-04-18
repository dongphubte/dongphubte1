import { pgTable, text, serial, integer, boolean, timestamp, varchar, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define enums for payment cycle and student status
export const PaymentCycleEnum = {
  MONTH: "1-thang",
  EIGHT_SESSIONS: "8-buoi",
  TEN_SESSIONS: "10-buoi",
  DAILY: "theo-ngay",
} as const;

export const StudentStatusEnum = {
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;

// User schema for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
});

// Schema for classes
export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  fee: integer("fee").notNull(), // stored in VND
  schedule: text("schedule").notNull(), // store as comma separated values
  location: text("location").notNull(),
  paymentCycle: text("payment_cycle"), // 1-thang, 8-buoi, 10-buoi, theo-ngay
});

export const insertClassSchema = createInsertSchema(classes).pick({
  name: true,
  fee: true,
  schedule: true,
  location: true,
  paymentCycle: true,
});

// Schema for students
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  phone: text("phone").notNull(),
  classId: integer("class_id").notNull(),
  registrationDate: timestamp("registration_date").notNull().defaultNow(),
  paymentCycle: text("payment_cycle").notNull(),
  status: text("status").notNull().default("active"), // active or inactive
});

export const insertStudentSchema = createInsertSchema(students).pick({
  name: true,
  code: true,
  phone: true,
  classId: true,
  paymentCycle: true,
  status: true,
});

// Schema for payments
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  amount: integer("amount").notNull(), // stored in VND
  paymentDate: timestamp("payment_date").notNull().defaultNow(),
  validFrom: timestamp("valid_from").notNull(),
  validTo: timestamp("valid_to").notNull(),
  status: text("status").notNull().default("paid"), // paid, pending, overdue
});

export const insertPaymentSchema = createInsertSchema(payments).pick({
  studentId: true,
  amount: true,
  validFrom: true,
  validTo: true,
  status: true,
});

// Schema for attendance
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  date: timestamp("date").notNull().defaultNow(),
  status: text("status").notNull(), // present, absent, teacher_absent
});

export const insertAttendanceSchema = createInsertSchema(attendance).pick({
  studentId: true,
  date: true,
  status: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Class = typeof classes.$inferSelect;
export type InsertClass = z.infer<typeof insertClassSchema>;

export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;

// Extended schemas with additional validations
export const extendedInsertClassSchema = insertClassSchema.extend({
  fee: z.coerce.number().positive().min(1000, "Giá tiền phải lớn hơn 1.000 VND"),
  schedule: z.string().min(1, "Phải chọn ít nhất một ngày học"),
  paymentCycle: z.enum(["1-thang", "8-buoi", "10-buoi", "theo-ngay"], {
    errorMap: () => ({ message: "Chu kỳ thanh toán không hợp lệ" }),
  }),
});

export const extendedInsertStudentSchema = insertStudentSchema.extend({
  phone: z.string().min(10, "Số điện thoại phải có ít nhất 10 ký tự"),
  paymentCycle: z.enum(["1-thang", "8-buoi", "10-buoi"], {
    errorMap: () => ({ message: "Chu kỳ thanh toán không hợp lệ" }),
  }),
  status: z.enum(["active", "inactive"], {
    errorMap: () => ({ message: "Trạng thái không hợp lệ" }),
  }),
});

export const extendedInsertPaymentSchema = insertPaymentSchema.extend({
  amount: z.coerce.number().positive(),
});

export const extendedInsertAttendanceSchema = insertAttendanceSchema.extend({
  // Accept both Date object and string in format yyyy-MM-dd
  date: z.union([
    z.date({
      required_error: "Ngày điểm danh là bắt buộc",
      invalid_type_error: "Ngày điểm danh không đúng định dạng",
    }),
    z.string({
      required_error: "Ngày điểm danh là bắt buộc",
      invalid_type_error: "Ngày điểm danh phải là chuỗi định dạng yyyy-MM-dd",
    }).transform((str) => {
      // Convert string to date
      try {
        const [year, month, day] = str.split('-').map(Number);
        return new Date(year, month - 1, day);
      } catch (e) {
        return new Date(); // Fallback for safety
      }
    })
  ]),
  status: z.enum(["present", "absent", "teacher_absent"], {
    errorMap: () => ({ message: "Trạng thái điểm danh không hợp lệ" }),
  }),
});
