import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Student, Class, Attendance } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { 
  UserCheck, UserX, UserPlus, Trash2, Loader2, User, CheckCircle, XCircle, Calendar
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatDate } from "@/utils/date-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ClassStudentsModalProps {
  classId: number;
  className: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ClassStudentsModal({ 
  classId, 
  className, 
  isOpen, 
  onClose 
}: ClassStudentsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [studentToRemove, setStudentToRemove] = useState<Student | null>(null);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [isAddStudentMode, setIsAddStudentMode] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  // Lấy danh sách học sinh của lớp
  const { data: classStudents, isLoading: isLoadingStudents } = useQuery<Student[]>({
    queryKey: ["/api/students/class", classId],
    queryFn: async () => {
      const res = await fetch(`/api/students/class/${classId}`);
      return res.json();
    },
    enabled: isOpen && classId > 0,
  });

  // Lấy tất cả học sinh để hiển thị trong dropdown thêm học sinh
  const { data: allStudents } = useQuery<Student[]>({
    queryKey: ["/api/students"],
    enabled: isOpen && isAddStudentMode,
  });

  // Lấy dữ liệu điểm danh cho lớp học
  const { data: attendanceData } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance/class", classId],
    queryFn: async () => {
      const res = await fetch(`/api/attendance/class/${classId}`);
      return res.json();
    },
    enabled: isOpen && classId > 0,
  });

  // Mutation để cập nhật lớp học cho một học sinh
  const updateStudentClassMutation = useMutation({
    mutationFn: async (data: { studentId: number, classId: number }) => {
      // Lấy thông tin học sinh
      const studentRes = await apiRequest("GET", `/api/students/${data.studentId}`);
      const student = await studentRes.json();
      
      // Cập nhật lớp học của học sinh
      const updateRes = await apiRequest("PUT", `/api/students/${data.studentId}`, {
        ...student,
        classId: data.classId,
      });
      
      return updateRes.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/students/class", classId] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      
      setIsAddStudentMode(false);
      setSelectedStudentId(null);
      
      toast({
        title: "Thành công",
        description: "Đã thêm học sinh vào lớp học",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể thêm học sinh vào lớp",
        variant: "destructive",
      });
    },
  });

  // Hàm tính toán số buổi điểm danh (có mặt, vắng, nghỉ) cho mỗi học sinh
  const getAttendanceStats = (studentId: number) => {
    if (!attendanceData) return { present: 0, absent: 0, canceled: 0 };
    
    const studentAttendance = attendanceData.filter(a => a.studentId === studentId);
    
    const present = studentAttendance.filter(a => a.status === "present").length;
    const absent = studentAttendance.filter(a => a.status === "absent").length;
    const canceled = studentAttendance.filter(a => a.status === "canceled").length;
    
    return { present, absent, canceled };
  };

  // Lọc học sinh theo tìm kiếm
  const filteredStudents = classStudents?.filter(student => {
    if (!searchTerm) return true;
    
    const searchTermLower = searchTerm.toLowerCase();
    
    return (
      student.name.toLowerCase().includes(searchTermLower) ||
      student.code.toLowerCase().includes(searchTermLower) ||
      student.phone.includes(searchTerm)
    );
  });

  // Lọc học sinh chưa có trong lớp
  const availableStudents = allStudents?.filter(student => 
    !classStudents?.some(cs => cs.id === student.id) && student.status === "active"
  );

  // Xử lý thêm học sinh vào lớp
  const handleAddStudent = () => {
    if (!selectedStudentId) {
      toast({
        title: "Cảnh báo",
        description: "Vui lòng chọn học sinh để thêm vào lớp",
        variant: "destructive",
      });
      return;
    }
    
    updateStudentClassMutation.mutate({
      studentId: selectedStudentId,
      classId: classId,
    });
  };

  // Xử lý xóa học sinh khỏi lớp (chuyển sang lớp mặc định)
  const handleRemoveStudent = (student: Student) => {
    setStudentToRemove(student);
    setIsRemoveDialogOpen(true);
  };

  // Xác nhận xóa học sinh khỏi lớp
  const confirmRemoveStudent = () => {
    if (!studentToRemove) return;
    
    updateStudentClassMutation.mutate({
      studentId: studentToRemove.id,
      classId: 0, // 0 là ID đại diện cho "Không có lớp"
    });
    
    setIsRemoveDialogOpen(false);
    setStudentToRemove(null);
  };

  // Reset form khi đóng modal
  const handleClose = () => {
    setSearchTerm("");
    setIsAddStudentMode(false);
    setSelectedStudentId(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chi tiết học sinh lớp {className}</DialogTitle>
          <DialogDescription>
            Quản lý danh sách học sinh và xem thông tin điểm danh trong lớp học
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Thanh tìm kiếm và nút thêm học sinh */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Input
                placeholder="Tìm kiếm học sinh..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            
            {isAddStudentMode ? (
              <div className="flex flex-1 space-x-2">
                <Select 
                  onValueChange={(value) => setSelectedStudentId(Number(value))}
                  value={selectedStudentId?.toString()}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn học sinh" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Học sinh</SelectLabel>
                      {availableStudents && availableStudents.length > 0 ? (
                        availableStudents.map(student => (
                          <SelectItem key={student.id} value={student.id.toString()}>
                            {student.name} ({student.code})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-students" disabled>
                          Không có học sinh khả dụng
                        </SelectItem>
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                
                <Button 
                  onClick={handleAddStudent}
                  disabled={!selectedStudentId || updateStudentClassMutation.isPending}
                >
                  {updateStudentClassMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Thêm
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsAddStudentMode(false);
                    setSelectedStudentId(null);
                  }}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Hủy
                </Button>
              </div>
            ) : (
              <Button 
                onClick={() => setIsAddStudentMode(true)}
                disabled={isAddStudentMode}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Thêm học sinh
              </Button>
            )}
          </div>

          {/* Bảng danh sách học sinh */}
          {isLoadingStudents ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredStudents && filteredStudents.length > 0 ? (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableCaption>Danh sách học sinh lớp {className}</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Học sinh</TableHead>
                    <TableHead>Mã</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                        <span>Có mặt</span>
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center">
                        <XCircle className="h-4 w-4 mr-1 text-red-500" />
                        <span>Vắng mặt</span>
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1 text-yellow-500" />
                        <span>GV nghỉ</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => {
                    const stats = getAttendanceStats(student.id);
                    
                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>{student.code}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={student.status === "active" 
                            ? "bg-green-50 border-green-200 text-green-700" 
                            : "bg-red-50 border-red-200 text-red-700"
                          }>
                            {student.status === "active" ? "Đang học" : "Nghỉ học"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-green-600">{stats.present}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-red-600">{stats.absent}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-yellow-600">{stats.canceled}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveStudent(student)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Xóa khỏi lớp</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center p-6 border rounded-md bg-gray-50">
              <User className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              {searchTerm ? (
                <p className="text-gray-600">Không tìm thấy học sinh nào phù hợp với "{searchTerm}"</p>
              ) : (
                <p className="text-gray-600">Lớp học chưa có học sinh nào</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <div className="text-sm text-gray-500">
            Tổng: {classStudents?.length || 0} học sinh (Đang học: {classStudents?.filter(s => s.status === "active").length || 0})
          </div>
          <DialogClose asChild>
            <Button variant="outline">Đóng</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>

      {/* Dialog xác nhận xóa học sinh khỏi lớp */}
      <AlertDialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa học sinh khỏi lớp</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa học sinh "{studentToRemove?.name}" khỏi lớp {className}?
              <br />
              Học sinh sẽ được chuyển về trạng thái "Không có lớp".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmRemoveStudent}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {updateStudentClassMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang xóa...
                </>
              ) : (
                "Xóa khỏi lớp"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}