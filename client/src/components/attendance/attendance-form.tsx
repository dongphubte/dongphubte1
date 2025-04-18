import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X, AlertTriangle, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDate } from "@/utils/date-utils";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import AttendanceHistory from "./attendance-history";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface StudentForAttendance {
  id: number;
  name: string;
  code: string;
  className: string;
  schedule: string;
  attendanceStatus?: string;
}

interface AttendanceRecord {
  id: number;
  studentId: number;
  date: string;
  status: string;
}

export default function AttendanceForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedStudent, setSelectedStudent] = useState<StudentForAttendance | null>(null);
  const [showAttendanceDialog, setShowAttendanceDialog] = useState(false);
  
  const today = new Date();
  const formattedDate = formatDate(today);
  
  const { data: attendanceData, isLoading: isLoadingAttendance, refetch: refetchAttendance } = useQuery<{
    studentsForToday: StudentForAttendance[];
    markedAttendance: AttendanceRecord[];
  }>({
    queryKey: ["/api/attendance/today"],
  });
  
  const { data: classes, isLoading: isLoadingClasses } = useQuery<any[]>({
    queryKey: ["/api/classes"],
  });
  
  // Force refetch when the component mounts
  useEffect(() => {
    refetchAttendance();
  }, [refetchAttendance]);

  const createAttendanceMutation = useMutation({
    mutationFn: async (data: { studentId: number; date: string; status: string }) => {
      // Format the date to yyyy-MM-dd format
      const res = await apiRequest("POST", "/api/attendance", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      toast({
        title: "Thành công",
        description: "Đã cập nhật điểm danh",
      });
      setShowAttendanceDialog(false);
    },
    onError: (error: Error) => {
      console.error('Error in attendance mutation:', error);
      toast({
        title: "Lỗi",
        description: error.message || "Không thể cập nhật điểm danh",
        variant: "destructive",
      });
    },
  });

  const markAttendance = (studentId: number, status: string) => {
    // Định dạng ngày để phù hợp với yêu cầu của API (yyyy-MM-dd)
    const today = new Date();
    const formattedDate = today.getFullYear() + '-' + 
      String(today.getMonth() + 1).padStart(2, '0') + '-' + 
      String(today.getDate()).padStart(2, '0');
    
    console.log('Sending attendance with date:', formattedDate);
    
    createAttendanceMutation.mutate({
      studentId,
      date: formattedDate,
      status,
    });
  };

  const openAttendanceDialog = (student: StudentForAttendance) => {
    setSelectedStudent(student);
    setShowAttendanceDialog(true);
  };

  const getAttendanceStatusIcon = (status: string) => {
    switch (status) {
      case "present":
        return <Check className="h-5 w-5 text-green-500" />;
      case "absent":
        return <X className="h-5 w-5 text-red-500" />;
      case "teacher_absent":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      default:
        return null;
    }
  };

  const getAttendanceStatusText = (status: string) => {
    switch (status) {
      case "present":
        return "Có mặt";
      case "absent":
        return "Vắng mặt";
      case "teacher_absent":
        return "GV nghỉ";
      default:
        return "";
    }
  };

  // Combine data for display
  let studentsForToday: StudentForAttendance[] = [];
  let markedAttendance: AttendanceRecord[] = [];
  
  if (attendanceData) {
    // Students who need to be marked
    studentsForToday = attendanceData.studentsForToday || [];
    
    // Students who have already been marked
    markedAttendance = attendanceData.markedAttendance || [];
    
    // Debug - log the data for troubleshooting
    console.log('Attendance data:', attendanceData);
    console.log('Students for today:', studentsForToday);
    console.log('Marked attendance:', markedAttendance);
  }

  // Filter by selected class if not "all"
  const filteredStudents = selectedClass === "all" 
    ? studentsForToday 
    : studentsForToday.filter(student => student.className === selectedClass);
    
  // Debug - log the filtered students
  console.log('Filtered students:', filteredStudents);

  const isLoading = isLoadingAttendance || isLoadingClasses || createAttendanceMutation.isPending;

  return (
    <div>
      <div className="bg-white shadow-md rounded-xl mb-6 overflow-hidden border border-gray-100">
        <div className="px-6 py-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100">
          <div>
            <h3 className="text-xl font-semibold text-gray-800 flex items-center">
              <UserCheck className="mr-2 h-5 w-5 text-primary" />
              Điểm danh ngày: <span className="text-primary ml-2">{formattedDate}</span>
            </h3>
            <p className="mt-1 text-sm text-gray-500">Danh sách học sinh có lịch học hôm nay</p>
          </div>
          <div>
            <Select onValueChange={setSelectedClass} defaultValue="all">
              <SelectTrigger className="w-[180px] border-gray-300">
                <SelectValue placeholder="Tất cả lớp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả lớp</SelectItem>
                {classes?.map((classItem: any) => (
                  <SelectItem key={classItem.id} value={classItem.name}>
                    {classItem.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Họ và tên</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lớp học</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian học</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openAttendanceDialog(student)}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-800">{student.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{student.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{student.className}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{student.schedule}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Chưa điểm danh
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-gray-500">Không có học sinh nào cần điểm danh cho hôm nay.</p>
          </div>
        )}
      </div>

      {/* Students who have already been marked for attendance today */}
      {markedAttendance.length > 0 && (
        <div className="bg-white shadow-md rounded-xl mb-6 overflow-hidden border border-gray-100">
          <div className="px-6 py-5 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800">Đã điểm danh hôm nay</h3>
            <p className="mt-1 text-sm text-gray-500">Danh sách học sinh đã được điểm danh</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã học sinh</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {markedAttendance.map((record, index) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{record.studentId}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        record.status === 'present' 
                          ? 'bg-green-100 text-green-800' 
                          : record.status === 'absent' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-amber-100 text-amber-800'
                      }`}>
                        {getAttendanceStatusIcon(record.status)}
                        <span className="ml-1.5">{getAttendanceStatusText(record.status)}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(record.date, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Attendance Dialog */}
      <Dialog open={showAttendanceDialog} onOpenChange={setShowAttendanceDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Điểm danh học sinh</DialogTitle>
            <DialogDescription>
              Chọn trạng thái điểm danh cho học sinh {selectedStudent?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 gap-4 py-4">
            <div className="flex flex-col space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-500">Học sinh:</span>
                <span className="text-sm font-semibold">{selectedStudent?.name}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-500">Mã học sinh:</span>
                <span className="text-sm">{selectedStudent?.code}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-500">Lớp:</span>
                <span className="text-sm">{selectedStudent?.className}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-500">Ngày điểm danh:</span>
                <span className="text-sm font-medium text-primary">{formattedDate}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3 mt-4">
              <Card 
                className="cursor-pointer hover:border-green-500 transition-colors"
                onClick={() => selectedStudent && markAttendance(selectedStudent.id, "present")}
              >
                <CardHeader className="p-4 pb-2">
                  <div className="mx-auto bg-green-100 p-2 rounded-full">
                    <Check className="h-6 w-6 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2 text-center">
                  <p className="font-medium text-gray-700">Có mặt</p>
                </CardContent>
              </Card>
              
              <Card 
                className="cursor-pointer hover:border-red-500 transition-colors"
                onClick={() => selectedStudent && markAttendance(selectedStudent.id, "absent")}
              >
                <CardHeader className="p-4 pb-2">
                  <div className="mx-auto bg-red-100 p-2 rounded-full">
                    <X className="h-6 w-6 text-red-600" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2 text-center">
                  <p className="font-medium text-gray-700">Vắng mặt</p>
                </CardContent>
              </Card>
              
              <Card 
                className="cursor-pointer hover:border-amber-500 transition-colors"
                onClick={() => selectedStudent && markAttendance(selectedStudent.id, "teacher_absent")}
              >
                <CardHeader className="p-4 pb-2">
                  <div className="mx-auto bg-amber-100 p-2 rounded-full">
                    <AlertTriangle className="h-6 w-6 text-amber-600" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2 text-center">
                  <p className="font-medium text-gray-700">GV nghỉ</p>
                </CardContent>
              </Card>
            </div>
          </div>
          
          <DialogFooter className="sm:justify-end">
            <Button 
              variant="outline" 
              onClick={() => setShowAttendanceDialog(false)}
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attendance History Component */}
      <AttendanceHistory />
    </div>
  );
}
