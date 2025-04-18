import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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
  CalendarCheck, 
  UserCheck,
  Users
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { formatDate } from "@/utils/date-utils";
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

    // Sắp xếp lớp học theo thứ tự số (Lớp 1, Lớp 2, Lớp 3, ...)
    return summary.sort((a, b) => {
      // Lấy số từ tên lớp (nếu có)
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
    return filteredAttendance.map(record => {
      const student = students.find(s => s.id === record.studentId);
      return {
        ...record,
        studentName: student?.name || 'Không xác định',
        studentCode: student?.code || 'Không xác định'
      };
    });
  };

  // Hiển thị dialog chi tiết điểm danh
  const showDetails = (classData: ClassAttendanceSummary) => {
    setSelectedClass(classData);
    setShowDetailsDialog(true);
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

  // Xử lý gửi dữ liệu điểm danh
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
      const today = new Date();
      const attendanceRecords = selectedStudents.map(student => ({
        studentId: student.id,
        date: today.toISOString(),
        status: selectedAttendanceStatus,
      }));
      
      // Gửi từng bản ghi điểm danh
      for (const record of attendanceRecords) {
        await createAttendanceMutation.mutateAsync(record);
      }
      
      setShowAttendanceDialog(false);
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

  // Status Badge Component
  const StatusBadge = ({ status }: { status: string }) => {
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

    return (
      <span className={`flex items-center px-2 py-1 text-xs font-medium rounded-full ${color}`}>
        {icon}
        {formatAttendanceStatus(status)}
      </span>
    );
  };

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
        <h2 className="text-2xl font-bold">Điểm danh theo lớp</h2>
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
                  <span className="text-lg font-semibold">{classData.className}</span>
                  <Badge variant={classData.total > 0 ? "default" : "outline"}>
                    {classData.total} điểm danh
                  </Badge>
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
                <Button 
                  variant="default"
                  onClick={() => showAttendance(classData)}
                  className="flex items-center"
                  size="sm"
                >
                  <UserCheck className="h-4 w-4 mr-1" />
                  Điểm danh
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog Chi tiết điểm danh */}
      {selectedClass && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Chi tiết điểm danh: {selectedClass.className}</DialogTitle>
              <DialogDescription>
                Thống kê: {selectedClass.present} có mặt, {selectedClass.absent} vắng mặt, 
                {selectedClass.teacherAbsent} GV nghỉ, {selectedClass.makeup} học bù
              </DialogDescription>
            </DialogHeader>
            
            {/* Chi tiết điểm danh */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ngày</TableHead>
                    <TableHead>Học sinh</TableHead>
                    <TableHead>Mã học sinh</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getClassAttendanceDetails(selectedClass.classId).length > 0 ? (
                    getClassAttendanceDetails(selectedClass.classId).map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatDate(new Date(record.date))}</TableCell>
                        <TableCell className="font-medium">{record.studentName}</TableCell>
                        <TableCell>{record.studentCode}</TableCell>
                        <TableCell>
                          <StatusBadge status={record.status} />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center h-24">
                        <div className="flex flex-col items-center justify-center">
                          <p className="text-muted-foreground">Không có dữ liệu điểm danh</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowDetailsDialog(false)}
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
    </div>
  );
}