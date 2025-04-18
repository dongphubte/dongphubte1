import { 
  User, InsertUser, Class, InsertClass, Student, InsertStudent,
  Payment, InsertPayment, Attendance, InsertAttendance
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { users, classes, students, payments, attendance } from "@shared/schema";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserResetToken(id: number, token: string, expiry: Date): Promise<boolean>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  updateUserPassword(id: number, password: string): Promise<boolean>;
  clearUserResetToken(id: number): Promise<boolean>;
  
  // Class methods
  getAllClasses(): Promise<Class[]>;
  getClass(id: number): Promise<Class | undefined>;
  createClass(classData: InsertClass): Promise<Class>;
  updateClass(id: number, classData: InsertClass): Promise<Class | undefined>;
  deleteClass(id: number): Promise<boolean>;
  
  // Student methods
  getAllStudents(): Promise<Student[]>;
  getStudent(id: number): Promise<Student | undefined>;
  getStudentByCode(code: string): Promise<Student | undefined>;
  getStudentsByClassId(classId: number): Promise<Student[]>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: number, student: InsertStudent): Promise<Student | undefined>;
  deleteStudent(id: number): Promise<boolean>;
  
  // Payment methods
  getAllPayments(): Promise<Payment[]>;
  getPayment(id: number): Promise<Payment | undefined>;
  getPaymentsByStudentId(studentId: number): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: number, payment: InsertPayment): Promise<Payment | undefined>;
  deletePayment(id: number): Promise<boolean>;
  
  // Attendance methods
  getAllAttendance(): Promise<Attendance[]>;
  getAttendance(id: number): Promise<Attendance | undefined>;
  getAttendanceByStudentId(studentId: number): Promise<Attendance[]>;
  getAttendanceByDate(date: Date): Promise<Attendance[]>;
  getAttendanceByDateRange(startDate: Date, endDate: Date): Promise<Attendance[]>;
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  updateAttendance(id: number, attendance: InsertAttendance): Promise<Attendance | undefined>;
  deleteAttendance(id: number): Promise<boolean>;
  
  // Session store
  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        resetToken: null,
        resetTokenExpiry: null
      })
      .returning();
    return user;
  }

  async updateUserResetToken(id: number, token: string, expiry: Date): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ resetToken: token, resetTokenExpiry: expiry })
      .where(eq(users.id, id))
      .returning();
    return result.length > 0;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.resetToken, token));
    return user;
  }

  async updateUserPassword(id: number, password: string): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ password })
      .where(eq(users.id, id))
      .returning();
    return result.length > 0;
  }

  async clearUserResetToken(id: number): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ resetToken: null, resetTokenExpiry: null })
      .where(eq(users.id, id))
      .returning();
    return result.length > 0;
  }

  // Class methods
  async getAllClasses(): Promise<Class[]> {
    return db.select().from(classes);
  }

  async getClass(id: number): Promise<Class | undefined> {
    const [classItem] = await db.select().from(classes).where(eq(classes.id, id));
    return classItem;
  }

  async createClass(classData: InsertClass): Promise<Class> {
    const [newClass] = await db
      .insert(classes)
      .values({
        ...classData,
        paymentCycle: classData.paymentCycle || null
      })
      .returning();
    return newClass;
  }

  async updateClass(id: number, classData: InsertClass): Promise<Class | undefined> {
    const [updatedClass] = await db
      .update(classes)
      .set(classData)
      .where(eq(classes.id, id))
      .returning();
    return updatedClass;
  }

  async deleteClass(id: number): Promise<boolean> {
    const result = await db
      .delete(classes)
      .where(eq(classes.id, id))
      .returning();
    return result.length > 0;
  }

  // Student methods
  async getAllStudents(): Promise<Student[]> {
    return db.select().from(students);
  }

  async getStudent(id: number): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    return student;
  }

  async getStudentByCode(code: string): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.code, code));
    return student;
  }

  async getStudentsByClassId(classId: number): Promise<Student[]> {
    return db.select().from(students).where(eq(students.classId, classId));
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    const [newStudent] = await db
      .insert(students)
      .values({
        ...student,
        status: student.status || "active"
      })
      .returning();
    return newStudent;
  }

  async updateStudent(id: number, student: InsertStudent): Promise<Student | undefined> {
    const [updatedStudent] = await db
      .update(students)
      .set(student)
      .where(eq(students.id, id))
      .returning();
    return updatedStudent;
  }

  async deleteStudent(id: number): Promise<boolean> {
    const result = await db
      .delete(students)
      .where(eq(students.id, id))
      .returning();
    return result.length > 0;
  }

  // Payment methods
  async getAllPayments(): Promise<Payment[]> {
    return db.select().from(payments);
  }

  async getPayment(id: number): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment;
  }

  async getPaymentsByStudentId(studentId: number): Promise<Payment[]> {
    return db.select().from(payments).where(eq(payments.studentId, studentId));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db
      .insert(payments)
      .values({
        ...payment,
        status: payment.status || "paid"
      })
      .returning();
    return newPayment;
  }

  async updatePayment(id: number, payment: InsertPayment): Promise<Payment | undefined> {
    const [updatedPayment] = await db
      .update(payments)
      .set(payment)
      .where(eq(payments.id, id))
      .returning();
    return updatedPayment;
  }

  async deletePayment(id: number): Promise<boolean> {
    const result = await db
      .delete(payments)
      .where(eq(payments.id, id))
      .returning();
    return result.length > 0;
  }

  // Attendance methods
  async getAllAttendance(): Promise<Attendance[]> {
    return db.select().from(attendance);
  }

  async getAttendance(id: number): Promise<Attendance | undefined> {
    const [attendanceItem] = await db.select().from(attendance).where(eq(attendance.id, id));
    return attendanceItem;
  }

  async getAttendanceByStudentId(studentId: number): Promise<Attendance[]> {
    return db.select().from(attendance).where(eq(attendance.studentId, studentId));
  }

  async getAttendanceByDate(date: Date): Promise<Attendance[]> {
    // Set time to start of day for comparison
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return db.select().from(attendance).where(
      eq(attendance.date, date) // This is simplified, would need more complex filtering in a real DB
    );
  }

  async getAttendanceByDateRange(startDate: Date, endDate: Date): Promise<Attendance[]> {
    return db.select().from(attendance).where(
      eq(attendance.date, startDate) // This is simplified, would need more complex filtering in a real DB
    );
  }

  async createAttendance(attendanceData: InsertAttendance): Promise<Attendance> {
    const [newAttendance] = await db
      .insert(attendance)
      .values(attendanceData)
      .returning();
    return newAttendance;
  }

  async updateAttendance(id: number, attendanceData: InsertAttendance): Promise<Attendance | undefined> {
    const [updatedAttendance] = await db
      .update(attendance)
      .set(attendanceData)
      .where(eq(attendance.id, id))
      .returning();
    return updatedAttendance;
  }

  async deleteAttendance(id: number): Promise<boolean> {
    const result = await db
      .delete(attendance)
      .where(eq(attendance.id, id))
      .returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();