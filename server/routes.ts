import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  extendedInsertClassSchema, 
  extendedInsertStudentSchema, 
  extendedInsertPaymentSchema,
  extendedInsertAttendanceSchema
} from "@shared/schema";
import { ZodError } from "zod";

function formatZodError(error: ZodError) {
  return error.errors.map(err => ({
    path: err.path.join('.'),
    message: err.message
  }));
}

function ensureAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Không có quyền truy cập" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

  // Classes API Routes
  app.get("/api/classes", ensureAuthenticated, async (req, res) => {
    try {
      const classes = await storage.getAllClasses();
      res.json(classes);
    } catch (error) {
      res.status(500).json({ message: "Lỗi khi lấy danh sách lớp học" });
    }
  });

  app.get("/api/classes/:id", ensureAuthenticated, async (req, res) => {
    try {
      const classItem = await storage.getClass(parseInt(req.params.id));
      if (!classItem) {
        return res.status(404).json({ message: "Không tìm thấy lớp học" });
      }
      res.json(classItem);
    } catch (error) {
      res.status(500).json({ message: "Lỗi khi lấy thông tin lớp học" });
    }
  });

  app.post("/api/classes", ensureAuthenticated, async (req, res) => {
    try {
      const validatedData = extendedInsertClassSchema.parse(req.body);
      const newClass = await storage.createClass(validatedData);
      res.status(201).json(newClass);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ errors: formatZodError(error) });
      }
      res.status(500).json({ message: "Lỗi khi tạo lớp học mới" });
    }
  });

  app.put("/api/classes/:id", ensureAuthenticated, async (req, res) => {
    try {
      const validatedData = extendedInsertClassSchema.parse(req.body);
      const updatedClass = await storage.updateClass(parseInt(req.params.id), validatedData);
      if (!updatedClass) {
        return res.status(404).json({ message: "Không tìm thấy lớp học" });
      }
      res.json(updatedClass);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ errors: formatZodError(error) });
      }
      res.status(500).json({ message: "Lỗi khi cập nhật lớp học" });
    }
  });

  app.delete("/api/classes/:id", ensureAuthenticated, async (req, res) => {
    try {
      const classId = parseInt(req.params.id);
      
      // Check if class has students
      const studentsInClass = await storage.getStudentsByClassId(classId);
      if (studentsInClass.length > 0) {
        return res.status(400).json({ 
          message: "Không thể xóa lớp học có học sinh",
          studentCount: studentsInClass.length
        });
      }
      
      const deleted = await storage.deleteClass(classId);
      if (!deleted) {
        return res.status(404).json({ message: "Không tìm thấy lớp học" });
      }
      res.json({ message: "Xóa lớp học thành công" });
    } catch (error) {
      res.status(500).json({ message: "Lỗi khi xóa lớp học" });
    }
  });

  // Students API Routes
  app.get("/api/students", ensureAuthenticated, async (req, res) => {
    try {
      const students = await storage.getAllStudents();
      res.json(students);
    } catch (error) {
      res.status(500).json({ message: "Lỗi khi lấy danh sách học sinh" });
    }
  });

  app.get("/api/students/:id", ensureAuthenticated, async (req, res) => {
    try {
      const student = await storage.getStudent(parseInt(req.params.id));
      if (!student) {
        return res.status(404).json({ message: "Không tìm thấy học sinh" });
      }
      res.json(student);
    } catch (error) {
      res.status(500).json({ message: "Lỗi khi lấy thông tin học sinh" });
    }
  });

  app.get("/api/students/code/:code", async (req, res) => {
    try {
      const student = await storage.getStudentByCode(req.params.code);
      if (!student) {
        return res.status(404).json({ message: "Không tìm thấy học sinh" });
      }
      
      // Get student related data
      const classInfo = await storage.getClass(student.classId);
      const payments = await storage.getPaymentsByStudentId(student.id);
      const attendance = await storage.getAttendanceByStudentId(student.id);
      
      res.json({
        student,
        class: classInfo,
        payments,
        attendance
      });
    } catch (error) {
      res.status(500).json({ message: "Lỗi khi lấy thông tin học sinh" });
    }
  });

  app.post("/api/students", ensureAuthenticated, async (req, res) => {
    try {
      const validatedData = extendedInsertStudentSchema.parse(req.body);
      const newStudent = await storage.createStudent(validatedData);
      res.status(201).json(newStudent);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ errors: formatZodError(error) });
      }
      res.status(500).json({ message: "Lỗi khi tạo học sinh mới" });
    }
  });

  app.put("/api/students/:id", ensureAuthenticated, async (req, res) => {
    try {
      const validatedData = extendedInsertStudentSchema.parse(req.body);
      const updatedStudent = await storage.updateStudent(parseInt(req.params.id), validatedData);
      if (!updatedStudent) {
        return res.status(404).json({ message: "Không tìm thấy học sinh" });
      }
      res.json(updatedStudent);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ errors: formatZodError(error) });
      }
      res.status(500).json({ message: "Lỗi khi cập nhật học sinh" });
    }
  });

  app.delete("/api/students/:id", ensureAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteStudent(parseInt(req.params.id));
      if (!deleted) {
        return res.status(404).json({ message: "Không tìm thấy học sinh" });
      }
      res.json({ message: "Xóa học sinh thành công" });
    } catch (error) {
      res.status(500).json({ message: "Lỗi khi xóa học sinh" });
    }
  });

  // Payments API Routes
  app.get("/api/payments", ensureAuthenticated, async (req, res) => {
    try {
      const payments = await storage.getAllPayments();
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Lỗi khi lấy danh sách thanh toán" });
    }
  });

  app.get("/api/payments/student/:studentId", ensureAuthenticated, async (req, res) => {
    try {
      const payments = await storage.getPaymentsByStudentId(parseInt(req.params.studentId));
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Lỗi khi lấy danh sách thanh toán" });
    }
  });

  app.post("/api/payments", ensureAuthenticated, async (req, res) => {
    try {
      const validatedData = extendedInsertPaymentSchema.parse(req.body);
      const newPayment = await storage.createPayment(validatedData);
      res.status(201).json(newPayment);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ errors: formatZodError(error) });
      }
      res.status(500).json({ message: "Lỗi khi tạo thanh toán mới" });
    }
  });

  // Attendance API Routes
  app.get("/api/attendance", ensureAuthenticated, async (req, res) => {
    try {
      const { date } = req.query;
      let attendanceRecords;
      
      if (date) {
        attendanceRecords = await storage.getAttendanceByDate(new Date(date as string));
      } else {
        attendanceRecords = await storage.getAllAttendance();
      }
      
      res.json(attendanceRecords);
    } catch (error) {
      res.status(500).json({ message: "Lỗi khi lấy dữ liệu điểm danh" });
    }
  });

  app.get("/api/attendance/student/:studentId", ensureAuthenticated, async (req, res) => {
    try {
      const attendance = await storage.getAttendanceByStudentId(parseInt(req.params.studentId));
      res.json(attendance);
    } catch (error) {
      res.status(500).json({ message: "Lỗi khi lấy dữ liệu điểm danh" });
    }
  });

  app.get("/api/attendance/today", ensureAuthenticated, async (req, res) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const attendanceToday = await storage.getAttendanceByDateRange(today, tomorrow);
      
      // Get day of week
      const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
      const dayOfWeek = days[today.getDay()];
      
      console.log('Current day of week:', dayOfWeek);
      
      // Get all students who have class today based on schedule
      const classes = await storage.getAllClasses();
      const studentsForToday = [];
      
      for (const classItem of classes) {
        console.log(`Checking class ${classItem.name} with schedule: ${classItem.schedule}`);
        
        // Kiểm tra lịch học bằng phương pháp linh hoạt hơn để khớp với các định dạng khác nhau
        // Ví dụ: "Thứ 2, 4, 6" hoặc "Thứ 2,4,6" hoặc "Thứ 2-4-6" đều có thể được xác định
        let hasClassToday = false;
        
        // Phân tích thứ trong tuần một cách tốt hơn
        if (dayOfWeek === 'Chủ nhật') {
          hasClassToday = classItem.schedule.includes('CN') || classItem.schedule.includes('Chủ nhật');
        } else {
          // Trích xuất số của thứ từ dayOfWeek (Thứ 2 -> 2, Thứ 6 -> 6)
          const dayNumberStr = dayOfWeek.replace('Thứ ', '').trim();
          
          // Kiểm tra xem lịch học có chứa thứ này không
          hasClassToday = classItem.schedule.includes(dayOfWeek) || 
                        classItem.schedule.includes(`Thứ ${dayNumberStr}`) ||
                        classItem.schedule.includes(`thứ ${dayNumberStr}`) ||
                        classItem.schedule.includes(` ${dayNumberStr}`) || 
                        classItem.schedule.includes(`,${dayNumberStr}`) || 
                        classItem.schedule.includes(`-${dayNumberStr}`) ||
                        classItem.schedule.includes(`${dayNumberStr},`) ||
                        classItem.schedule.includes(`${dayNumberStr}-`) ||
                        classItem.schedule.includes(`${dayNumberStr} `);
                        
          console.log(`Checking if ${classItem.name} has class on ${dayOfWeek} (${dayNumberStr}): ${hasClassToday}`);
        }
        
        if (hasClassToday) {
          console.log(`Class ${classItem.name} has class today (${dayOfWeek})`);
          
          const students = await storage.getStudentsByClassId(classItem.id);
          console.log(`Found ${students.length} students in class ${classItem.name}`);
          
          for (const student of students) {
            // Check if student has already been marked for attendance today
            const alreadyMarked = attendanceToday.some(
              a => a.studentId === student.id
            );
            
            if (!alreadyMarked) {
              console.log(`Adding student ${student.name} to attendance list for today`);
              studentsForToday.push({
                ...student,
                className: classItem.name,
                schedule: classItem.schedule
              });
            }
          }
        }
      }
      
      console.log(`Total students for today: ${studentsForToday.length}`);
      console.log(`Already marked attendance: ${attendanceToday.length}`);
      
      res.json({
        markedAttendance: attendanceToday,
        studentsForToday
      });
    } catch (error) {
      console.error('Error in /api/attendance/today:', error);
      res.status(500).json({ message: "Lỗi khi lấy dữ liệu điểm danh hôm nay" });
    }
  });

  app.post("/api/attendance", ensureAuthenticated, async (req, res) => {
    try {
      console.log("Received attendance data:", req.body);
      
      // Parse the date string into a Date object if it's a string
      const data = { ...req.body };
      if (typeof data.date === 'string') {
        // Create date from the string in format YYYY-MM-DD
        const [year, month, day] = data.date.split('-').map(Number);
        data.date = new Date(year, month - 1, day);
      }
      
      console.log("Transformed attendance data:", data);
      
      const validatedData = extendedInsertAttendanceSchema.parse(data);
      console.log("Validated attendance data:", validatedData);
      
      const newAttendance = await storage.createAttendance(validatedData);
      res.status(201).json(newAttendance);
    } catch (error) {
      console.error("Error creating attendance:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ errors: formatZodError(error) });
      }
      res.status(500).json({ message: "Lỗi khi tạo điểm danh mới" });
    }
  });

  // Reports API Routes
  app.get("/api/reports/dashboard", ensureAuthenticated, async (req, res) => {
    try {
      const students = await storage.getAllStudents();
      const payments = await storage.getAllPayments();
      const attendance = await storage.getAllAttendance();
      const classes = await storage.getAllClasses();
      
      // Calculate total students
      const totalStudents = students.length;
      const activeStudents = students.filter(s => s.status === 'active').length;
      
      // Calculate financial data
      const paidAmount = payments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0);
      
      const pendingAmount = payments
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + p.amount, 0);
      
      const overdueAmount = payments
        .filter(p => p.status === 'overdue')
        .reduce((sum, p) => sum + p.amount, 0);
      
      // Calculate attendance data
      const presentCount = attendance.filter(a => a.status === 'present').length;
      const absentCount = attendance.filter(a => a.status === 'absent').length;
      const teacherAbsentCount = attendance.filter(a => a.status === 'teacher_absent').length;
      
      // Get student count per class
      const studentsPerClass = classes.map(c => {
        return {
          name: c.name,
          count: students.filter(s => s.classId === c.id).length
        };
      });
      
      // Get monthly revenue (last 6 months)
      const now = new Date();
      const monthlyRevenue = [];
      
      for (let i = 5; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        
        const monthPayments = payments.filter(p => {
          const paymentDate = new Date(p.paymentDate);
          return paymentDate >= month && paymentDate <= nextMonth && p.status === 'paid';
        });
        
        const total = monthPayments.reduce((sum, p) => sum + p.amount, 0);
        
        monthlyRevenue.push({
          month: `${month.getMonth() + 1}/${month.getFullYear()}`,
          amount: total
        });
      }
      
      res.json({
        students: {
          total: totalStudents,
          active: activeStudents,
          inactive: totalStudents - activeStudents
        },
        finances: {
          paidAmount,
          pendingAmount,
          overdueAmount,
          totalAmount: paidAmount + pendingAmount + overdueAmount
        },
        attendance: {
          present: presentCount,
          absent: absentCount,
          teacherAbsent: teacherAbsentCount
        },
        studentsPerClass,
        monthlyRevenue
      });
    } catch (error) {
      res.status(500).json({ message: "Lỗi khi lấy dữ liệu báo cáo" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
