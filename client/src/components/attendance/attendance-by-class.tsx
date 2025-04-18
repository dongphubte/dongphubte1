import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Check, X, AlertTriangle, RefreshCw, Info, BarChart, CalendarCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { formatDate } from "@/utils/date-utils";
import { formatAttendanceStatus, summarizeAttendance } from "@/utils/format";

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

export default function AttendanceByClass() {
  const [selectedClass, setSelectedClass] = useState<ClassAttendanceSummary | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [timeRange, setTimeRange] = useState<"all" | "month" | "week">("all");

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

    return summary;
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
                <span className="text-sm text-gray-500 flex items-center">
                  <CalendarCheck className="h-4 w-4 mr-1" />
                  {timeRange === "all" ? "Tất cả thời gian" : 
                   timeRange === "month" ? "30 ngày qua" : "7 ngày qua"}
                </span>
                <Button 
                  variant="outline"
                  onClick={() => showDetails(classData)}
                  className="flex items-center"
                  size="sm"
                >
                  <BarChart className="h-4 w-4 mr-1" />
                  Chi tiết
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

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
    </div>
  );
}