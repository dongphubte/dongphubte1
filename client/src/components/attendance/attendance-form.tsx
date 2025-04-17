import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X, AlertTriangle } from "lucide-react";
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
  const today = new Date();
  const formattedDate = formatDate(today);
  
  const { data: attendanceData, isLoading: isLoadingAttendance } = useQuery({
    queryKey: ["/api/attendance/today"],
  });
  
  const { data: classes, isLoading: isLoadingClasses } = useQuery({
    queryKey: ["/api/classes"],
  });

  const createAttendanceMutation = useMutation({
    mutationFn: async (data: { studentId: number; date: Date; status: string }) => {
      const res = await apiRequest("POST", "/api/attendance", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      toast({
        title: "Thành công",
        description: "Đã cập nhật điểm danh",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể cập nhật điểm danh",
        variant: "destructive",
      });
    },
  });

  const markAttendance = (studentId: number, status: string) => {
    createAttendanceMutation.mutate({
      studentId,
      date: new Date(),
      status,
    });
  };

  const getAttendanceStatusIcon = (status: string) => {
    switch (status) {
      case "present":
        return <Check className="h-4 w-4 text-success" />;
      case "absent":
        return <X className="h-4 w-4 text-error" />;
      case "teacher_absent":
        return <AlertTriangle className="h-4 w-4 text-warning" />;
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
  }

  // Filter by selected class if not "all"
  const filteredStudents = selectedClass === "all" 
    ? studentsForToday 
    : studentsForToday.filter(student => student.className === selectedClass);

  const isLoading = isLoadingAttendance || isLoadingClasses || createAttendanceMutation.isPending;

  return (
    <div>
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-neutral-800">
              Điểm danh ngày: <span className="text-primary">{formattedDate}</span>
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-neutral-500">Danh sách học sinh có lịch học hôm nay</p>
          </div>
          <div>
            <Select onValueChange={setSelectedClass} defaultValue="all">
              <SelectTrigger className="w-[180px]">
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
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-100">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Họ và tên</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Mã</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Lớp học</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Thời gian học</th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {filteredStudents.map((student) => (
                  <tr key={student.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-800">{student.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">{student.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">{student.className}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">{student.schedule}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <div className="flex justify-center space-x-2">
                        <Button
                          size="sm"
                          className="bg-success hover:bg-success/90 text-white"
                          onClick={() => markAttendance(student.id, "present")}
                          disabled={isLoading}
                        >
                          Có mặt
                        </Button>
                        <Button
                          size="sm"
                          className="bg-error hover:bg-error/90 text-white"
                          onClick={() => markAttendance(student.id, "absent")}
                          disabled={isLoading}
                        >
                          Vắng mặt
                        </Button>
                        <Button
                          size="sm"
                          className="bg-warning hover:bg-warning/90 text-white"
                          onClick={() => markAttendance(student.id, "teacher_absent")}
                          disabled={isLoading}
                        >
                          GV nghỉ
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-6 text-center">
            <p className="text-neutral-500">Không có học sinh nào cần điểm danh cho hôm nay.</p>
          </div>
        )}
      </div>

      {/* Students who have already been marked for attendance today */}
      {markedAttendance.length > 0 && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-neutral-800">Đã điểm danh hôm nay</h3>
            <p className="mt-1 max-w-2xl text-sm text-neutral-500">Danh sách học sinh đã được điểm danh</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-100">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">STT</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Mã học sinh</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Trạng thái</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Thời gian</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {markedAttendance.map((record, index) => (
                  <tr key={record.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">{record.studentId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="flex items-center">
                        {getAttendanceStatusIcon(record.status)}
                        <span className="ml-2">{getAttendanceStatusText(record.status)}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">{formatDate(record.date, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Attendance History Component */}
      <AttendanceHistory />
    </div>
  );
}
