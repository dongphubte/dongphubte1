import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Check, 
  X, 
  AlertTriangle, 
  RefreshCw, 
  Info, 
  BarChart, 
  Calendar,
  CalendarCheck, 
  UserCheck,
  Users,
  Users2,
  Trash,
  Trash2,
  Square,
  CheckSquare
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { formatDate, isClassScheduledToday } from "@/utils/date-utils";
import { formatAttendanceStatus, summarizeAttendance } from "@/utils/format";
import { apiRequest } from "@/lib/queryClient";

// Interface cho thống kê điểm danh của một lớp
interface ClassAttendanceSummary {
  classId: number;
  className: string;
  present: number;
  absent: number;
  teacherAbsent: number;
  makeup: number;
  total: number;
}

// Interface cho chi tiết điểm danh
interface AttendanceDetail {
  id: number;
  studentId: number;
  studentName: string;
  studentCode: string;
  date: string;
  status: string;
}

// Interface cho học sinh trong lớp
interface ClassStudent {
  id: number;
  name: string;
  code: string;
  classId: number;
  isChecked?: boolean;
  attendanceStatus?: string;
}

export default function AttendanceByClass() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState<ClassAttendanceSummary | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showAttendanceDialog, setShowAttendanceDialog] = useState(false);
  const [timeRange, setTimeRange] = useState<"all" | "month" | "week">("all");
  const [classStudents, setClassStudents] = useState<ClassStudent[]>([]);
  const [selectedAttendanceStatus, setSelectedAttendanceStatus] = useState<string>("present");
  const [selectAll, setSelectAll] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Lấy danh sách lớp
  const { data: classes, isLoading: isLoadingClasses } = useQuery<any[]>({
    queryKey: ["/api/classes"],
  });

  // Lấy danh sách học sinh
  const { data: students, isLoading: isLoadingStudents } = useQuery<any[]>({
    queryKey: ["/api/students"],
  });

  // Lấy dữ liệu điểm danh
  const { data: attendance, isLoading: isLoadingAttendance } = useQuery<any[]>({
    queryKey: ["/api/attendance"],
  });

  // Mutation để tạo điểm danh mới
  const createAttendanceMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/attendance", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      toast({
        title: "Thành công",
        description: "Đã điểm danh cho các học sinh",
      });
      setShowAttendanceDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi",
        description: `Không thể điểm danh: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Mutation để cập nhật điểm danh
  const updateAttendanceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const res = await apiRequest("PATCH", `/api/attendance/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      toast({
        title: "Thành công",
        description: "Đã cập nhật điểm danh thành công",
      });
      setShowEditDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi",
        description: `Không thể cập nhật điểm danh: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Mutation để xóa điểm danh
  const deleteAttendanceMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/attendance/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      toast({
        title: "Thành công",
        description: "Đã xóa điểm danh thành công",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi",
        description: `Không thể xóa điểm danh: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Mutation để xóa hàng loạt điểm danh - cải thiện hiệu suất bằng cách gửi song song các yêu cầu xóa
  const bulkDeleteAttendanceMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      // Sử dụng Promise.all để thực hiện song song các yêu cầu xóa thay vì tuần tự
      const deletePromises = ids.map(id => 
        apiRequest("DELETE", `/api/attendance/${id}`)
          .then(res => res.json())
      );
      
      return Promise.all(deletePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      toast({
        title: "Thành công",
        description: `Đã xóa ${selectedAttendances.length} bản ghi điểm danh thành công`,
      });
      setShowBulkDeleteConfirm(false);
      setBulkDeleteMode(false);
      setSelectedAttendances([]);
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi",
        description: `Không thể xóa điểm danh hàng loạt: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Kiểm tra xem lớp đã được điểm danh ngày hôm nay chưa
  const isClassAttendedToday = React.useCallback((classId: number): boolean => {
    if (!students || !attendance) return false;
    
    // Lấy ngày hôm nay ở dạng chuỗi YYYY-MM-DD
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // Lấy danh sách học sinh đang học (active) trong lớp
    const studentsInClass = students.filter(s => s.classId === classId && s.status === 'active');
    
    // Nếu không có học sinh nào đang học, coi như đã điểm danh đủ
    if (studentsInClass.length === 0) return true;
    
    // Lấy ID của tất cả học sinh đang học trong lớp
    const studentIds = studentsInClass.map(s => s.id);
    
    // Đếm số học sinh đã được điểm danh hôm nay (dù với bất kỳ trạng thái nào)
    const attendedStudents = new Set();
    
    attendance.forEach(a => {
      // Chỉ xét điểm danh hôm nay
      const attendanceDate = a.date.split('T')[0]; // Chỉ lấy phần ngày YYYY-MM-DD
      if (attendanceDate === todayStr && studentIds.includes(a.studentId)) {
        attendedStudents.add(a.studentId);
      }
    });
    
    // Nếu tất cả học sinh đã được điểm danh, coi như lớp đã điểm danh đủ
    return attendedStudents.size >= studentIds.length;
  }, [students, attendance]);

  // Tạo thống kê điểm danh theo lớp
  const classAttendanceSummary = React.useMemo(() => {
    if (!classes || !students || !attendance) return [];

    const summary: ClassAttendanceSummary[] = [];

    // Tạo bản đồ học sinh -> lớp
    const studentClassMap = students.reduce((map: Record<number, number>, student) => {
      map[student.id] = student.classId;
      return map;
    }, {});

    // Khởi tạo thống kê cho mỗi lớp
    classes.forEach(classItem => {
      summary.push({
        classId: classItem.id,
        className: classItem.name,
        present: 0,
        absent: 0,
        teacherAbsent: 0,
        makeup: 0,
        total: 0
      });
    });

    // Lọc dữ liệu điểm danh theo khoảng thời gian
    let filteredAttendance = [...attendance];
    const now = new Date();
    
    if (timeRange === "month") {
      const oneMonthAgo = new Date(now);
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      filteredAttendance = attendance.filter(record => 
        new Date(record.date) >= oneMonthAgo
      );
    } else if (timeRange === "week") {
      const oneWeekAgo = new Date(now);
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      filteredAttendance = attendance.filter(record => 
        new Date(record.date) >= oneWeekAgo
      );
    }

    // Tính toán thống kê cho mỗi lớp
    filteredAttendance.forEach(record => {
      const classId = studentClassMap[record.studentId];
      if (!classId) return;

      const classStats = summary.find(item => item.classId === classId);
      if (!classStats) return;

      if (record.status === 'present') classStats.present++;
      else if (record.status === 'absent') classStats.absent++;
      else if (record.status === 'teacher_absent') classStats.teacherAbsent++;
      else if (record.status === 'makeup') classStats.makeup++;
      
      classStats.total++;
    });

    // Tìm và đánh dấu các lớp có lịch học hôm nay
    const classesWithSchedule = classes.reduce((map: Record<number, boolean>, classItem) => {
      map[classItem.id] = isClassScheduledToday(classItem.schedule);
      return map;
    }, {});
    
    // Map để lưu trữ trạng thái điểm danh hôm nay của mỗi lớp
    const classAttendedMap = classes.reduce((map: Record<number, boolean>, classItem) => {
      map[classItem.id] = isClassAttendedToday(classItem.id);
      return map;
    }, {});
    
    // Sắp xếp lớp học: ưu tiên lớp có lịch học hôm nay nhưng chưa điểm danh, sau đó đến lớp đang học đã điểm danh, cuối cùng là các lớp khác
    return summary.sort((a, b) => {
      const aHasScheduleToday = classesWithSchedule[a.classId] || false;
      const bHasScheduleToday = classesWithSchedule[b.classId] || false;
      
      const aIsAttendedToday = classAttendedMap[a.classId] || false;
      const bIsAttendedToday = classAttendedMap[b.classId] || false;
      
      // Ưu tiên lớp có lịch học hôm nay nhưng chưa điểm danh
      if (aHasScheduleToday && !aIsAttendedToday && !(bHasScheduleToday && !bIsAttendedToday)) return -1;
      if (bHasScheduleToday && !bIsAttendedToday && !(aHasScheduleToday && !aIsAttendedToday)) return 1;
      
      // Ưu tiên lớp có lịch học hôm nay đã điểm danh
      if (aHasScheduleToday && aIsAttendedToday && !(bHasScheduleToday && bIsAttendedToday)) return -1;
      if (bHasScheduleToday && bIsAttendedToday && !(aHasScheduleToday && aIsAttendedToday)) return 1;
      
      // Nếu cả hai lớp đều có cùng trạng thái điểm danh, sắp xếp theo số thứ tự
      const numA = a.className.match(/\d+/);
      const numB = b.className.match(/\d+/);
      
      if (numA && numB) {
        return parseInt(numA[0]) - parseInt(numB[0]);
      } else if (numA) {
        return -1; // Lớp có số đứng trước
      } else if (numB) {
        return 1; // Lớp có số đứng trước
      }
      
      // So sánh tên lớp thông thường nếu không có số
      return a.className.localeCompare(b.className, 'vi');
    });
  }, [classes, students, attendance, timeRange]);

  // Lấy chi tiết điểm danh cho một lớp cụ thể
  const getClassAttendanceDetails = (classId: number): AttendanceDetail[] => {
    if (!attendance || !students) return [];

    // Lọc học sinh theo lớp
    const classStudents = students.filter(student => student.classId === classId);
    const classStudentIds = classStudents.map(student => student.id);

    // Lọc điểm danh theo học sinh của lớp
    let filteredAttendance = attendance.filter(record => 
      classStudentIds.includes(record.studentId)
    );

    // Lọc theo khoảng thời gian
    const now = new Date();
    if (timeRange === "month") {
      const oneMonthAgo = new Date(now);
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      filteredAttendance = filteredAttendance.filter(record => 
        new Date(record.date) >= oneMonthAgo
      );
    } else if (timeRange === "week") {
      const oneWeekAgo = new Date(now);
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      filteredAttendance = filteredAttendance.filter(record => 
        new Date(record.date) >= oneWeekAgo
      );
    }

    // Thêm thông tin học sinh vào điểm danh
    const detailedAttendance = filteredAttendance.map(record => {
      const student = students.find(s => s.id === record.studentId);
      return {
        ...record,
        studentName: student?.name || 'Không xác định',
        studentCode: student?.code || 'Không xác định'
      };
    });
    
    // Sắp xếp theo ngày mới nhất trước
    return detailedAttendance.sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  };
  
  // Lấy các ngày có điểm danh và phân nhóm theo ngày
  const getAttendanceDays = (classId: number) => {
    const details = getClassAttendanceDetails(classId);
    
    // Map để lưu trữ điểm danh theo ngày
    const attendanceByDay = new Map<string, AttendanceDetail[]>();
    
    // Nhóm điểm danh theo ngày
    details.forEach(record => {
      const dateStr = record.date.split('T')[0]; // YYYY-MM-DD
      
      if (!attendanceByDay.has(dateStr)) {
        attendanceByDay.set(dateStr, []);
      }
      
      attendanceByDay.get(dateStr)?.push(record);
    });
    
    // Chuyển Map thành mảng đã sắp xếp theo ngày
    return Array.from(attendanceByDay.entries())
      .sort(([dateA], [dateB]) => {
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
  };

  // Hiển thị dialog chi tiết điểm danh
  const showDetails = (classData: ClassAttendanceSummary) => {
    setSelectedClass(classData);
    setShowDetailsDialog(true);
  };
  
  // Hiển thị dialog sửa điểm danh
  const handleEditAttendance = (attendance: AttendanceDetail) => {
    setSelectedAttendance(attendance);
    setEditAttendanceStatus(attendance.status);
    setShowEditDialog(true);
  };
  
  // Xử lý cập nhật điểm danh
  const handleUpdateAttendance = async () => {
    if (!selectedAttendance) return;
    
    try {
      await updateAttendanceMutation.mutateAsync({
        id: selectedAttendance.id,
        data: {
          status: editAttendanceStatus,
          date: selectedAttendance.date.split('T')[0], // Chỉ lấy phần ngày yyyy-MM-dd
          studentId: selectedAttendance.studentId
        }
      });
    } catch (error) {
      console.error("Lỗi khi cập nhật điểm danh:", error);
    }
  };
  
  // Hiển thị xác nhận xóa điểm danh
  const handleDeleteConfirm = (attendance: AttendanceDetail) => {
    setSelectedAttendance(attendance);
    setShowDeleteConfirm(true);
  };
  
  // Xử lý xóa điểm danh
  const handleDeleteAttendance = async () => {
    if (!selectedAttendance) return;
    
    try {
      await deleteAttendanceMutation.mutateAsync(selectedAttendance.id);
      setShowDeleteConfirm(false);
      // Không đóng dialog chi tiết, chỉ đóng dialog xác nhận xóa
    } catch (error) {
      console.error("Lỗi khi xóa điểm danh:", error);
    }
  };

  // Hiển thị dialog điểm danh cho lớp học
  const showAttendance = (classData: ClassAttendanceSummary) => {
    if (!students) return;
    
    // Lọc học sinh thuộc lớp được chọn
    const studentsInClass = students
      .filter(student => student.classId === classData.classId && student.status === "active")
      .map(student => ({
        ...student,
        isChecked: false,
        attendanceStatus: "present" // Mặc định là có mặt
      }));
    
    setClassStudents(studentsInClass);
    setSelectedClass(classData);
    setShowAttendanceDialog(true);
    setSelectAll(false);
  };

  // Xử lý thay đổi checkbox cho từng học sinh
  const handleStudentChecked = (studentId: number, checked: boolean) => {
    setClassStudents(prev => 
      prev.map(student => 
        student.id === studentId ? { ...student, isChecked: checked } : student
      )
    );
  };

  // Xử lý chọn/bỏ chọn tất cả
  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    setClassStudents(prev => 
      prev.map(student => ({ ...student, isChecked: checked }))
    );
  };

  // Xử lý gửi dữ liệu điểm danh - cải thiện hiệu suất với song song
  const handleSubmitAttendance = async () => {
    try {
      setIsSubmitting(true);
      
      // Lọc những học sinh đã được chọn
      const selectedStudents = classStudents.filter(student => student.isChecked);
      
      if (selectedStudents.length === 0) {
        toast({
          title: "Chưa chọn học sinh",
          description: "Vui lòng chọn ít nhất một học sinh để điểm danh",
          variant: "destructive",
        });
        return;
      }
      
      // Xây dựng các bản ghi điểm danh
      let dateToUse = new Date();
      
      // Nếu đang điểm danh bù và có ngày được chọn, sử dụng ngày đó
      if (selectedAttendanceStatus === 'makeup' && makeupDate) {
        dateToUse = makeupDate;
      }
      
      // Định dạng ngày theo YYYY-MM-DD
      const formattedDate = `${dateToUse.getFullYear()}-${String(dateToUse.getMonth() + 1).padStart(2, '0')}-${String(dateToUse.getDate()).padStart(2, '0')}`;
      
      const attendanceRecords = selectedStudents.map(student => ({
        studentId: student.id,
        date: formattedDate,
        status: selectedAttendanceStatus,
      }));
      
      // Gửi các bản ghi điểm danh song song thay vì tuần tự
      const createPromises = attendanceRecords.map(record => 
        createAttendanceMutation.mutateAsync(record).catch(err => {
          console.error(`Lỗi khi điểm danh cho học sinh ID ${record.studentId}:`, err);
          return null; // Trả về null để Promise.all vẫn tiếp tục thực hiện ngay cả khi có lỗi
        })
      );
      
      // Đợi tất cả các yêu cầu hoàn thành
      await Promise.all(createPromises);
      
      // Chỉ đóng dialog nếu không có lỗi xảy ra
      setShowAttendanceDialog(false);
      
      // Thông báo thành công
      toast({
        title: "Thành công",
        description: `Đã điểm danh cho ${selectedStudents.length} học sinh`,
      });
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: `Không thể điểm danh: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // State để lưu trữ thông tin dialog học bù
  const [showMakeupDialog, setShowMakeupDialog] = useState(false);
  const [selectedMakeupClass, setSelectedMakeupClass] = useState<ClassAttendanceSummary | null>(null);
  const [makeupDate, setMakeupDate] = useState<Date | undefined>(new Date());
  
  // States cho việc sửa điểm danh
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState<AttendanceDetail | null>(null);
  const [editAttendanceStatus, setEditAttendanceStatus] = useState<string>("present");
  
  // States cho việc xóa hàng loạt
  const [selectedAttendances, setSelectedAttendances] = useState<AttendanceDetail[]>([]);
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  
  // Hiển thị dialog chọn lớp cho học bù
  const showMakeupAttendance = () => {
    setShowMakeupDialog(true);
  };
  
  // Xử lý bật/tắt chế độ xóa hàng loạt
  const toggleBulkDeleteMode = () => {
    setBulkDeleteMode(!bulkDeleteMode);
    if (bulkDeleteMode) {
      // Nếu đang tắt chế độ xóa hàng loạt, xóa tất cả các bản ghi đã chọn
      setSelectedAttendances([]);
    }
  };
  
  // Xử lý chọn/bỏ chọn một bản ghi điểm danh trong chế độ xóa hàng loạt
  const toggleAttendanceSelection = (record: AttendanceDetail) => {
    if (selectedAttendances.some(a => a.id === record.id)) {
      // Nếu đã chọn, bỏ chọn
      setSelectedAttendances(selectedAttendances.filter(a => a.id !== record.id));
    } else {
      // Nếu chưa chọn, thêm vào danh sách đã chọn
      setSelectedAttendances([...selectedAttendances, record]);
    }
  };
  
  // Xử lý chọn tất cả bản ghi điểm danh trong một lớp
  const selectAllAttendances = (classId: number) => {
    const allRecords = getClassAttendanceDetails(classId);
    setSelectedAttendances(allRecords);
  };
  
  // Xử lý hủy chọn tất cả bản ghi điểm danh
  const deselectAllAttendances = () => {
    setSelectedAttendances([]);
  };
  
  // Xử lý xóa hàng loạt các bản ghi điểm danh đã chọn
  const handleBulkDelete = async () => {
    if (selectedAttendances.length === 0) {
      toast({
        title: "Chưa chọn bản ghi nào",
        description: "Vui lòng chọn ít nhất một bản ghi để xóa",
        variant: "destructive",
      });
      return;
    }
    
    setShowBulkDeleteConfirm(true);
  };
  
  // Xử lý xác nhận xóa hàng loạt
  const confirmBulkDelete = async () => {
    try {
      await bulkDeleteAttendanceMutation.mutateAsync(selectedAttendances.map(a => a.id));
    } catch (error) {
      console.error("Lỗi khi xóa điểm danh hàng loạt:", error);
    }
  };
  
  // Xử lý khi chọn lớp để điểm danh học bù
  const handleMakeupClassSelect = (classData: ClassAttendanceSummary) => {
    if (!students) return;
    
    // Lọc học sinh thuộc lớp được chọn
    const studentsInClass = students
      .filter(student => student.classId === classData.classId && student.status === "active")
      .map(student => ({
        ...student,
        isChecked: false,
        attendanceStatus: "makeup" // Mặc định là học bù
      }));
    
    setClassStudents(studentsInClass);
    setSelectedClass(classData);
    setSelectedAttendanceStatus("makeup");
    setShowAttendanceDialog(true);
    setSelectAll(false);
    setShowMakeupDialog(false);
    
    // Lưu lại ngày đã chọn để sử dụng khi submit điểm danh
    // Sẽ được sử dụng trong hàm handleSubmitAttendance
  };

  // Status Badge Component tối ưu với React.memo
  const StatusBadge = React.memo(({ status }: { status: string }) => {
    // Sử dụng useMemo để tránh tạo lại thành phần UI khi render lại
    const { color, icon } = React.useMemo(() => {
      let color;
      let icon;
  
      switch (status) {
        case "present":
          color = "bg-green-100 text-green-800";
          icon = <Check className="h-3 w-3 mr-1" />;
          break;
        case "absent":
          color = "bg-red-100 text-red-800";
          icon = <X className="h-3 w-3 mr-1" />;
          break;
        case "teacher_absent":
          color = "bg-yellow-100 text-yellow-800";
          icon = <AlertTriangle className="h-3 w-3 mr-1" />;
          break;
        case "makeup":
          color = "bg-blue-100 text-blue-800";
          icon = <RefreshCw className="h-3 w-3 mr-1" />;
          break;
        default:
          color = "bg-gray-100 text-gray-800";
          icon = <Info className="h-3 w-3 mr-1" />;
      }
  
      return { color, icon };
    }, [status]);

    return (
      <span className={`flex items-center px-2 py-1 text-xs font-medium rounded-full ${color}`}>
        {icon}
        {formatAttendanceStatus(status)}
      </span>
    );
  });

  if (isLoadingClasses || isLoadingStudents || isLoadingAttendance) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Điểm danh theo lớp</h2>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">Điểm danh theo lớp</h2>
          <Button 
            variant="outline"
            size="sm"
            onClick={showMakeupAttendance}
            className="flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Học bù
          </Button>
        </div>
        <Tabs 
          defaultValue="all" 
          value={timeRange} 
          onValueChange={(value) => setTimeRange(value as "all" | "month" | "week")}
          className="w-full sm:w-auto"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">Tất cả</TabsTrigger>
            <TabsTrigger value="month">Tháng này</TabsTrigger>
            <TabsTrigger value="week">Tuần này</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {classAttendanceSummary.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-500">Chưa có dữ liệu điểm danh nào.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classAttendanceSummary.map((classData) => (
            <Card key={classData.classId} className="overflow-hidden">
              <CardHeader className="bg-white border-b pb-3">
                <CardTitle className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold">{classData.className}</span>
                    {classes && isClassScheduledToday(classes.find(c => c.id === classData.classId)?.schedule || "") && (
                      <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 border-0 text-white px-2 py-0.5 text-xs font-medium animate-pulse shadow-sm">
                        Đang học
                      </Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-green-50 rounded-lg p-3 flex flex-col items-center justify-center">
                    <div className="flex items-center text-green-700 mb-1">
                      <Check className="h-4 w-4 mr-1" />
                      <span className="text-sm font-medium">Có mặt</span>
                    </div>
                    <span className="text-xl font-bold">{classData.present}</span>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 flex flex-col items-center justify-center">
                    <div className="flex items-center text-red-700 mb-1">
                      <X className="h-4 w-4 mr-1" />
                      <span className="text-sm font-medium">Vắng mặt</span>
                    </div>
                    <span className="text-xl font-bold">{classData.absent}</span>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-3 flex flex-col items-center justify-center">
                    <div className="flex items-center text-yellow-700 mb-1">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      <span className="text-sm font-medium">GV nghỉ</span>
                    </div>
                    <span className="text-xl font-bold">{classData.teacherAbsent}</span>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 flex flex-col items-center justify-center">
                    <div className="flex items-center text-blue-700 mb-1">
                      <RefreshCw className="h-4 w-4 mr-1" />
                      <span className="text-sm font-medium">Học bù</span>
                    </div>
                    <span className="text-xl font-bold">{classData.makeup}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-gray-50 border-t p-3 flex justify-between items-center">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => showDetails(classData)}
                  className="flex items-center"
                >
                  <BarChart className="h-4 w-4 mr-1" />
                  Chi tiết
                </Button>
                {/* Button điểm danh với style tùy thuộc vào trạng thái */}
                {(() => {
                  // Kiểm tra xem lớp có lịch học hôm nay không
                  const hasScheduleToday = classes && isClassScheduledToday(classes.find(c => c.id === classData.classId)?.schedule || "");
                  // Kiểm tra xem đã điểm danh hết học sinh chưa
                  const isAttended = isClassAttendedToday(classData.classId);

                  // Lớp đã điểm danh đủ
                  if (isAttended) {
                    return (
                      <Button 
                        variant="outline"
                        disabled
                        className="flex items-center bg-green-50 text-green-700 hover:bg-green-50"
                        size="sm"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Đã điểm danh
                      </Button>
                    );
                  }
                  
                  // Lớp có lịch học hôm nay nhưng chưa điểm danh đủ
                  if (hasScheduleToday) {
                    return (
                      <Button 
                        variant="default"
                        onClick={() => showAttendance(classData)}
                        className="flex items-center bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white animate-pulse border-0"
                        size="sm"
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        Điểm danh
                      </Button>
                    );
                  }
                  
                  // Lớp không có lịch học hôm nay
                  return (
                    <Button 
                      variant="default"
                      onClick={() => showAttendance(classData)}
                      className="flex items-center"
                      size="sm"
                    >
                      <UserCheck className="h-4 w-4 mr-1" />
                      Điểm danh
                    </Button>
                  );
                })()}
                
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog Chi tiết điểm danh */}
      {selectedClass && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <span>Chi tiết điểm danh: {selectedClass.className}</span>
                {classes && isClassScheduledToday(classes.find(c => c.id === selectedClass.classId)?.schedule || "") && (
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 border-0 text-white px-2 py-0.5 text-xs font-medium animate-pulse shadow-sm">
                    Đang học
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="flex flex-wrap gap-3 mt-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 py-1 px-3 flex items-center">
                  <Check className="h-3.5 w-3.5 mr-1 text-green-600" />
                  <span className="font-medium">Có mặt:</span> <span className="ml-1 font-semibold">{selectedClass.present}</span>
                </Badge>
                <Badge variant="outline" className="bg-red-50 text-red-700 py-1 px-3 flex items-center">
                  <X className="h-3.5 w-3.5 mr-1 text-red-600" />
                  <span className="font-medium">Vắng mặt:</span> <span className="ml-1 font-semibold">{selectedClass.absent}</span>
                </Badge>
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 py-1 px-3 flex items-center">
                  <AlertTriangle className="h-3.5 w-3.5 mr-1 text-yellow-600" />
                  <span className="font-medium">GV nghỉ:</span> <span className="ml-1 font-semibold">{selectedClass.teacherAbsent}</span>
                </Badge>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 py-1 px-3 flex items-center">
                  <RefreshCw className="h-3.5 w-3.5 mr-1 text-blue-600" />
                  <span className="font-medium">Học bù:</span> <span className="ml-1 font-semibold">{selectedClass.makeup}</span>
                </Badge>
              </DialogDescription>
            </DialogHeader>
            
            {/* Thanh công cụ tìm kiếm và lọc */}
            <div className="flex flex-col sm:flex-row justify-between gap-3 mb-4">
              <div className="relative w-full sm:w-auto flex-1">
                <input
                  type="text"
                  placeholder="Tìm kiếm tên học sinh..."
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-muted-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                </div>
              </div>
              
              <div className="flex gap-2">
                <select 
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="present">Có mặt</option>
                  <option value="absent">Vắng mặt</option>
                  <option value="teacher_absent">GV nghỉ</option>
                  <option value="makeup">Học bù</option>
                </select>
                
                <Button 
                  variant={bulkDeleteMode ? "secondary" : "outline"} 
                  size="sm" 
                  onClick={toggleBulkDeleteMode}
                  className="flex items-center"
                >
                  {bulkDeleteMode ? (
                    <>
                      <X className="h-4 w-4 mr-1" />
                      Hủy xóa hàng loạt
                    </>
                  ) : (
                    <>
                      <Trash className="h-4 w-4 mr-1" />
                      Xóa hàng loạt
                    </>
                  )}
                </Button>
                
                {bulkDeleteMode && (
                  <>
                    <Badge variant="secondary">
                      Đã chọn {selectedAttendances.length} bản ghi
                    </Badge>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => selectAllAttendances(selectedClass.classId)}
                      className="flex items-center"
                    >
                      <CheckSquare className="h-3.5 w-3.5 mr-1" />
                      Chọn tất cả
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={deselectAllAttendances}
                      className="flex items-center"
                      disabled={selectedAttendances.length === 0}
                    >
                      <Square className="h-3.5 w-3.5 mr-1" />
                      Bỏ chọn tất cả
                    </Button>
                    
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={handleBulkDelete}
                      className="flex items-center"
                      disabled={selectedAttendances.length === 0}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Xóa đã chọn
                    </Button>
                  </>
                )}
              </div>
            </div>
            
            {/* Hiển thị điểm danh theo ngày */}
            <div className="space-y-6">
              {getAttendanceDays(selectedClass.classId).length > 0 ? (
                getAttendanceDays(selectedClass.classId)
                  .map(([date, records]) => {
                    // Lọc bản ghi theo tìm kiếm và trạng thái
                    const filteredRecords = records.filter(record => {
                      const matchesSearch = searchTerm === "" || 
                        record.studentName.toLowerCase().includes(searchTerm.toLowerCase());
                      const matchesStatus = filterStatus === "all" || record.status === filterStatus;
                      return matchesSearch && matchesStatus;
                    });
                    
                    if (filteredRecords.length === 0) return null;
                    
                    // Phân loại các bản ghi theo trạng thái
                    const presentRecords = filteredRecords.filter(r => r.status === 'present');
                    const absentRecords = filteredRecords.filter(r => r.status === 'absent');
                    const teacherAbsentRecords = filteredRecords.filter(r => r.status === 'teacher_absent');
                    const makeupRecords = filteredRecords.filter(r => r.status === 'makeup');
                    
                    return (
                      <div key={date} className="border rounded-lg overflow-hidden">
                        <div className="bg-muted/30 p-3 flex justify-between items-center border-b">
                          <h3 className="font-medium flex items-center">
                            <CalendarCheck className="h-4 w-4 mr-2 text-primary" />
                            <span>Ngày {formatDate(new Date(date))}</span>
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="bg-white flex items-center gap-1">
                              <span className="font-medium">Tổng:</span> <span className="font-semibold">{filteredRecords.length}</span>
                            </Badge>
                            <Badge variant="outline" className="bg-green-50 text-green-700 flex items-center gap-1">
                              <Check className="h-3 w-3 text-green-600" />
                              <span className="font-medium">Có mặt:</span> <span className="font-semibold">{presentRecords.length}</span>
                            </Badge>
                            <Badge variant="outline" className="bg-red-50 text-red-700 flex items-center gap-1">
                              <X className="h-3 w-3 text-red-600" />
                              <span className="font-medium">Vắng:</span> <span className="font-semibold">{absentRecords.length}</span>
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {/* Card Có mặt */}
                          <div className="border rounded-md overflow-hidden">
                            <div className="bg-green-50 p-2 flex items-center border-b">
                              <Check className="h-4 w-4 mr-1 text-green-600" />
                              <span className="text-sm font-medium text-green-700">Có mặt ({presentRecords.length})</span>
                            </div>
                            <div className="p-3 max-h-48 overflow-y-auto">
                              {presentRecords.length > 0 ? (
                                <ul className="space-y-2">
                                  {presentRecords.map(record => (
                                    <li key={record.id} className="flex justify-between items-center text-sm">
                                      <span className="font-medium">{record.studentName}</span>
                                      <div className="flex items-center gap-1">
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={() => handleEditAttendance(record)}
                                          className="h-6 w-6 p-0"
                                        >
                                          <span className="sr-only">Sửa</span>
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={() => handleDeleteConfirm(record)}
                                          className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                                        >
                                          <span className="sr-only">Xóa</span>
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                                        </Button>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <div className="text-center text-muted-foreground text-sm py-3">
                                  Không có học sinh
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Card Vắng mặt */}
                          <div className="border rounded-md overflow-hidden">
                            <div className="bg-red-50 p-2 flex items-center border-b">
                              <X className="h-4 w-4 mr-1 text-red-600" />
                              <span className="text-sm font-medium text-red-700">Vắng mặt ({absentRecords.length})</span>
                            </div>
                            <div className="p-3 max-h-48 overflow-y-auto">
                              {absentRecords.length > 0 ? (
                                <ul className="space-y-2">
                                  {absentRecords.map(record => (
                                    <li key={record.id} className="flex justify-between items-center text-sm">
                                      <span className="font-medium">{record.studentName}</span>
                                      <div className="flex items-center gap-1">
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={() => handleEditAttendance(record)}
                                          className="h-6 w-6 p-0"
                                        >
                                          <span className="sr-only">Sửa</span>
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={() => handleDeleteConfirm(record)}
                                          className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                                        >
                                          <span className="sr-only">Xóa</span>
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                                        </Button>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <div className="text-center text-muted-foreground text-sm py-3">
                                  Không có học sinh
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Card GV nghỉ */}
                          <div className="border rounded-md overflow-hidden">
                            <div className="bg-yellow-50 p-2 flex items-center border-b">
                              <AlertTriangle className="h-4 w-4 mr-1 text-yellow-600" />
                              <span className="text-sm font-medium text-yellow-700">GV nghỉ ({teacherAbsentRecords.length})</span>
                            </div>
                            <div className="p-3 max-h-48 overflow-y-auto">
                              {teacherAbsentRecords.length > 0 ? (
                                <ul className="space-y-2">
                                  {teacherAbsentRecords.map(record => (
                                    <li key={record.id} className="flex justify-between items-center text-sm">
                                      <span className="font-medium">{record.studentName}</span>
                                      <div className="flex items-center gap-1">
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={() => handleEditAttendance(record)}
                                          className="h-6 w-6 p-0"
                                        >
                                          <span className="sr-only">Sửa</span>
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={() => handleDeleteConfirm(record)}
                                          className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                                        >
                                          <span className="sr-only">Xóa</span>
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                                        </Button>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <div className="text-center text-muted-foreground text-sm py-3">
                                  Không có học sinh
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Card Học bù */}
                          <div className="border rounded-md overflow-hidden">
                            <div className="bg-blue-50 p-2 flex items-center border-b">
                              <RefreshCw className="h-4 w-4 mr-1 text-blue-600" />
                              <span className="text-sm font-medium text-blue-700">Học bù ({makeupRecords.length})</span>
                            </div>
                            <div className="p-3 max-h-48 overflow-y-auto">
                              {makeupRecords.length > 0 ? (
                                <ul className="space-y-2">
                                  {makeupRecords.map(record => (
                                    <li key={record.id} className="flex justify-between items-center text-sm">
                                      <span className="font-medium">{record.studentName}</span>
                                      <div className="flex items-center gap-1">
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={() => handleEditAttendance(record)}
                                          className="h-6 w-6 p-0"
                                        >
                                          <span className="sr-only">Sửa</span>
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={() => handleDeleteConfirm(record)}
                                          className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                                        >
                                          <span className="sr-only">Xóa</span>
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                                        </Button>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <div className="text-center text-muted-foreground text-sm py-3">
                                  Không có học sinh
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }).filter(Boolean)
              ) : (
                <div className="text-center p-8 border rounded-md">
                  <p className="text-muted-foreground">Không có dữ liệu điểm danh</p>
                </div>
              )}
              
              {getAttendanceDays(selectedClass.classId).length > 0 && 
               getAttendanceDays(selectedClass.classId).filter(([_, records]) => 
                 records.some(record => 
                   (searchTerm === "" || record.studentName.toLowerCase().includes(searchTerm.toLowerCase())) &&
                   (filterStatus === "all" || record.status === filterStatus)
                 )
               ).length === 0 && (
                <div className="text-center p-4 border rounded-md">
                  <p className="text-muted-foreground">Không tìm thấy kết quả phù hợp</p>
                </div>
              )}
            </div>
            
            <DialogFooter className="mt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowDetailsDialog(false);
                  setBulkDeleteMode(false);
                  setSelectedAttendances([]);
                  setSearchTerm("");
                  setFilterStatus("all");
                }}
              >
                Đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog Điểm danh cho lớp */}
      {selectedClass && (
        <Dialog open={showAttendanceDialog} onOpenChange={setShowAttendanceDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Điểm danh: {selectedClass.className}</DialogTitle>
              <DialogDescription>
                Chọn trạng thái và danh sách học sinh cần điểm danh hôm nay
              </DialogDescription>
            </DialogHeader>
            
            {/* Lựa chọn trạng thái điểm danh */}
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2">Trạng thái điểm danh:</h3>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedAttendanceStatus === "present" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedAttendanceStatus("present")}
                  className="flex items-center"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Có mặt
                </Button>
                <Button
                  variant={selectedAttendanceStatus === "absent" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedAttendanceStatus("absent")}
                  className="flex items-center"
                >
                  <X className="h-4 w-4 mr-1" />
                  Vắng mặt
                </Button>
                <Button
                  variant={selectedAttendanceStatus === "teacher_absent" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedAttendanceStatus("teacher_absent")}
                  className="flex items-center"
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  GV nghỉ
                </Button>
                <Button
                  variant={selectedAttendanceStatus === "makeup" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedAttendanceStatus("makeup")}
                  className="flex items-center"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Học bù
                </Button>
              </div>
            </div>
            
            {/* Danh sách học sinh */}
            <div className="border rounded-md">
              <div className="p-4 border-b bg-muted/50 flex items-center">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="select-all"
                    checked={selectAll}
                    onCheckedChange={handleSelectAll}
                  />
                  <label htmlFor="select-all" className="text-sm font-medium flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    Chọn tất cả ({classStudents.length} học sinh)
                  </label>
                </div>
              </div>
              
              <div className="divide-y max-h-[300px] overflow-y-auto">
                {classStudents.length > 0 ? (
                  classStudents.map(student => (
                    <div key={student.id} className="flex items-center p-3 gap-3 hover:bg-muted/20">
                      <Checkbox 
                        id={`student-${student.id}`}
                        checked={student.isChecked}
                        onCheckedChange={(checked) => handleStudentChecked(student.id, checked === true)}
                      />
                      <div>
                        <label htmlFor={`student-${student.id}`} className="font-medium">
                          {student.name}
                        </label>
                        <p className="text-sm text-muted-foreground">{student.code}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-muted-foreground">Không có học sinh nào trong lớp này</p>
                  </div>
                )}
              </div>
            </div>
            
            <DialogFooter className="flex items-center justify-between sm:justify-between">
              <Button 
                variant="outline" 
                onClick={() => setShowAttendanceDialog(false)}
                disabled={isSubmitting}
              >
                Hủy
              </Button>
              <Button 
                onClick={handleSubmitAttendance}
                disabled={isSubmitting}
                className="flex items-center"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                {isSubmitting ? "Đang xử lý..." : "Lưu điểm danh"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Dialog Chọn lớp học bù */}
      <Dialog open={showMakeupDialog} onOpenChange={setShowMakeupDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Điểm danh học bù</DialogTitle>
            <DialogDescription>
              Chọn ngày và lớp học cần điểm danh học bù. Trạng thái điểm danh sẽ tự động đặt là "Học bù".
            </DialogDescription>
          </DialogHeader>
          
          <div className="mb-4 border rounded-lg p-4 bg-blue-50 border-blue-100">
            <h4 className="text-sm font-medium mb-2 text-blue-700 flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Chọn ngày điểm danh bù
            </h4>
            <div className="grid gap-2">
              <Label htmlFor="makeup-date">Ngày điểm danh</Label>
              <Input
                id="makeup-date"
                type="date"
                value={makeupDate ? makeupDate.toISOString().split('T')[0] : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    setMakeupDate(new Date(e.target.value));
                  }
                }}
                className="bg-white"
              />
              <p className="text-xs text-blue-600">
                Ngày điểm danh bù sẽ được ghi nhận chính xác theo ngày bạn chọn.
              </p>
            </div>
          </div>
          
          <div className="border-t pt-4 mb-2">
            <h4 className="text-sm font-medium mb-3 flex items-center">
              <Users2 className="h-4 w-4 mr-2" />
              Chọn lớp học để điểm danh bù
            </h4>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2 max-h-[300px] overflow-y-auto">
            {classAttendanceSummary.map((classData) => (
              <div 
                key={classData.classId}
                onClick={() => handleMakeupClassSelect(classData)}
                className="cursor-pointer bg-card border rounded-lg p-4 hover:bg-muted/50 transition-colors flex flex-col"
              >
                <div className="font-medium text-lg">{classData.className}</div>
                <div className="mt-2 text-sm text-muted-foreground">
                  <div>Tổng điểm danh: {classData.total}</div>
                  <div className="flex items-center mt-1">
                    <RefreshCw className="h-3 w-3 mr-1 text-blue-500" />
                    <span>Học bù: {classData.makeup}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMakeupDialog(false)}>
              Hủy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog Sửa điểm danh */}
      {selectedAttendance && (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Sửa điểm danh</DialogTitle>
              <DialogDescription>
                Thay đổi trạng thái điểm danh cho {selectedAttendance.studentName} vào ngày {formatDate(new Date(selectedAttendance.date))}
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <h3 className="text-sm font-medium mb-2">Trạng thái điểm danh:</h3>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={editAttendanceStatus === "present" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEditAttendanceStatus("present")}
                  className="flex items-center"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Có mặt
                </Button>
                <Button
                  variant={editAttendanceStatus === "absent" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEditAttendanceStatus("absent")}
                  className="flex items-center"
                >
                  <X className="h-4 w-4 mr-1" />
                  Vắng mặt
                </Button>
                <Button
                  variant={editAttendanceStatus === "teacher_absent" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEditAttendanceStatus("teacher_absent")}
                  className="flex items-center"
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  GV nghỉ
                </Button>
                <Button
                  variant={editAttendanceStatus === "makeup" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEditAttendanceStatus("makeup")}
                  className="flex items-center"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Học bù
                </Button>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowEditDialog(false)}>
                Hủy
              </Button>
              <Button onClick={handleUpdateAttendance}>
                Lưu thay đổi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Dialog Xác nhận xóa */}
      {selectedAttendance && (
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Xác nhận xóa</DialogTitle>
              <DialogDescription>
                Bạn có chắc chắn muốn xóa bản ghi điểm danh của <span className="font-medium">{selectedAttendance.studentName}</span> vào ngày <span className="font-medium">{formatDate(new Date(selectedAttendance.date))}</span>?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                Hủy
              </Button>
              <Button variant="destructive" onClick={handleDeleteAttendance}>
                Xóa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Dialog Xác nhận xóa hàng loạt */}
      <Dialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Xác nhận xóa hàng loạt</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa <span className="font-medium">{selectedAttendances.length}</span> bản ghi điểm danh đã chọn?
              <br />
              <span className="text-red-500">Hành động này không thể hoàn tác.</span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <div className="max-h-36 overflow-y-auto rounded border p-2 text-sm bg-muted/50">
              {selectedAttendances.map(att => (
                <div key={att.id} className="flex justify-between py-1">
                  <span>{att.studentName}</span>
                  <span>{formatDate(new Date(att.date))}</span>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDeleteConfirm(false)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={confirmBulkDelete}>
              Xóa {selectedAttendances.length} bản ghi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}