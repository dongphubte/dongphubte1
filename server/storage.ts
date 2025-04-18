import { 
  User, InsertUser, Class, InsertClass, Student, InsertStudent,
  Payment, InsertPayment, Attendance, InsertAttendance
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private classes: Map<number, Class>;
  private students: Map<number, Student>;
  private payments: Map<number, Payment>;
  private attendance: Map<number, Attendance>;
  
  sessionStore: any;
  
  private currentUserId: number;
  private currentClassId: number;
  private currentStudentId: number;
  private currentPaymentId: number;
  private currentAttendanceId: number;

  constructor() {
    this.users = new Map();
    this.classes = new Map();
    this.students = new Map();
    this.payments = new Map();
    this.attendance = new Map();
    
    this.currentUserId = 1;
    this.currentClassId = 1;
    this.currentStudentId = 1;
    this.currentPaymentId = 1;
    this.currentAttendanceId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
    
    // Seed initial data
    this.seedData();
  }

  private seedData() {
    // Seed classes
    const classNames = ["Lớp 1", "Lớp 2", "Lớp 3", "Lớp 4", "Lớp 5", "Lớp 6", "Lớp 7", "Lớp 8", "Lớp 9", "Lớp 10", "Lớp 11", "Lớp 12", "Luyện thi", "Giao tiếp"];
    
    classNames.forEach((name, index) => {
      this.createClass({
        name,
        fee: 1000000 + (index * 50000),
        schedule: index % 2 === 0 ? "Thứ 2, Thứ 4, Thứ 6" : "Thứ 3, Thứ 5, Thứ 7",
        location: `Phòng ${101 + index}`
      });
    });
    
    // We don't seed students, payments or attendance here
    // They will be created via the API
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id,
      resetToken: null,
      resetTokenExpiry: null
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserResetToken(id: number, token: string, expiry: Date): Promise<boolean> {
    const user = await this.getUser(id);
    if (!user) return false;
    
    user.resetToken = token;
    user.resetTokenExpiry = expiry;
    this.users.set(id, user);
    
    return true;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.resetToken === token,
    );
  }

  async updateUserPassword(id: number, password: string): Promise<boolean> {
    const user = await this.getUser(id);
    if (!user) return false;
    
    user.password = password;
    this.users.set(id, user);
    
    return true;
  }

  async clearUserResetToken(id: number): Promise<boolean> {
    const user = await this.getUser(id);
    if (!user) return false;
    
    user.resetToken = null;
    user.resetTokenExpiry = null;
    this.users.set(id, user);
    
    return true;
  }

  // Class methods
  async getAllClasses(): Promise<Class[]> {
    return Array.from(this.classes.values());
  }

  async getClass(id: number): Promise<Class | undefined> {
    return this.classes.get(id);
  }

  async createClass(classData: InsertClass): Promise<Class> {
    const id = this.currentClassId++;
    const newClass: Class = { 
      ...classData, 
      id,
      paymentCycle: classData.paymentCycle || null 
    };
    this.classes.set(id, newClass);
    return newClass;
  }

  async updateClass(id: number, classData: InsertClass): Promise<Class | undefined> {
    const existingClass = await this.getClass(id);
    if (!existingClass) return undefined;
    
    const updatedClass: Class = { 
      ...existingClass,
      ...classData,
      id
    };
    this.classes.set(id, updatedClass);
    
    return updatedClass;
  }

  async deleteClass(id: number): Promise<boolean> {
    const exists = await this.getClass(id);
    if (!exists) return false;
    
    return this.classes.delete(id);
  }

  // Student methods
  async getAllStudents(): Promise<Student[]> {
    return Array.from(this.students.values());
  }

  async getStudent(id: number): Promise<Student | undefined> {
    return this.students.get(id);
  }

  async getStudentByCode(code: string): Promise<Student | undefined> {
    return Array.from(this.students.values()).find(
      (student) => student.code === code,
    );
  }

  async getStudentsByClassId(classId: number): Promise<Student[]> {
    console.log(`[DEBUG] getStudentsByClassId: Finding students in class ${classId}`);
    console.log(`[DEBUG] All students:`, Array.from(this.students.values()));
    
    const students = Array.from(this.students.values()).filter(
      (student) => {
        console.log(`[DEBUG] Checking student ${student.name}, classId: ${student.classId}, comparing with ${classId}, equals: ${student.classId === classId}`);
        return student.classId === classId;
      }
    );
    
    console.log(`[DEBUG] Found ${students.length} students in class ${classId}`);
    return students;
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    const id = this.currentStudentId++;
    const newStudent: Student = { 
      ...student, 
      id,
      status: student.status || "active",
      registrationDate: new Date() 
    };
    this.students.set(id, newStudent);
    return newStudent;
  }

  async updateStudent(id: number, student: InsertStudent): Promise<Student | undefined> {
    const existingStudent = await this.getStudent(id);
    if (!existingStudent) return undefined;
    
    const updatedStudent: Student = { 
      ...student, 
      id,
      status: student.status || existingStudent.status,
      registrationDate: existingStudent.registrationDate
    };
    this.students.set(id, updatedStudent);
    
    return updatedStudent;
  }

  async deleteStudent(id: number): Promise<boolean> {
    const exists = await this.getStudent(id);
    if (!exists) return false;
    
    return this.students.delete(id);
  }

  // Payment methods
  async getAllPayments(): Promise<Payment[]> {
    return Array.from(this.payments.values());
  }

  async getPayment(id: number): Promise<Payment | undefined> {
    return this.payments.get(id);
  }

  async getPaymentsByStudentId(studentId: number): Promise<Payment[]> {
    return Array.from(this.payments.values()).filter(
      (payment) => payment.studentId === studentId,
    );
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const id = this.currentPaymentId++;
    const newPayment: Payment = { 
      ...payment, 
      id,
      status: payment.status || "paid",
      paymentDate: new Date() 
    };
    this.payments.set(id, newPayment);
    return newPayment;
  }

  async updatePayment(id: number, payment: InsertPayment): Promise<Payment | undefined> {
    const existingPayment = await this.getPayment(id);
    if (!existingPayment) return undefined;
    
    const updatedPayment: Payment = { 
      ...payment, 
      id,
      status: payment.status || existingPayment.status,
      paymentDate: existingPayment.paymentDate
    };
    this.payments.set(id, updatedPayment);
    
    return updatedPayment;
  }

  async deletePayment(id: number): Promise<boolean> {
    const exists = await this.getPayment(id);
    if (!exists) return false;
    
    return this.payments.delete(id);
  }

  // Attendance methods
  async getAllAttendance(): Promise<Attendance[]> {
    return Array.from(this.attendance.values());
  }

  async getAttendance(id: number): Promise<Attendance | undefined> {
    return this.attendance.get(id);
  }

  async getAttendanceByStudentId(studentId: number): Promise<Attendance[]> {
    return Array.from(this.attendance.values()).filter(
      (attendance) => attendance.studentId === studentId,
    );
  }

  async getAttendanceByDate(date: Date): Promise<Attendance[]> {
    // Set time to start of day for comparison
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return Array.from(this.attendance.values()).filter(attendance => {
      const attendanceDate = new Date(attendance.date);
      return attendanceDate >= startOfDay && attendanceDate <= endOfDay;
    });
  }

  async getAttendanceByDateRange(startDate: Date, endDate: Date): Promise<Attendance[]> {
    return Array.from(this.attendance.values()).filter(attendance => {
      const attendanceDate = new Date(attendance.date);
      return attendanceDate >= startDate && attendanceDate < endDate;
    });
  }

  async createAttendance(attendance: InsertAttendance): Promise<Attendance> {
    const id = this.currentAttendanceId++;
    const newAttendance: Attendance = { 
      ...attendance, 
      id,
      date: attendance.date || new Date() 
    };
    this.attendance.set(id, newAttendance);
    return newAttendance;
  }

  async updateAttendance(id: number, attendance: InsertAttendance): Promise<Attendance | undefined> {
    const existingAttendance = await this.getAttendance(id);
    if (!existingAttendance) return undefined;
    
    const updatedAttendance: Attendance = { 
      ...attendance, 
      id,
      date: attendance.date || existingAttendance.date
    };
    this.attendance.set(id, updatedAttendance);
    
    return updatedAttendance;
  }

  async deleteAttendance(id: number): Promise<boolean> {
    const exists = await this.getAttendance(id);
    if (!exists) return false;
    
    return this.attendance.delete(id);
  }
}

// Use in-memory storage for now
export const storage = new MemStorage();

// When ready to switch to database:
// import { DatabaseStorage } from "./database-storage";
// export const storage = new DatabaseStorage();
