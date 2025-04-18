import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Class } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, Pencil, Trash2, Loader2, Users, Clock, MapPin, 
  Calendar, CreditCard, AlertTriangle, Ban
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import ClassForm from "./class-form";
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
import { formatCurrency, formatPaymentCycle } from "@/utils/format";
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function ClassList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | undefined>(undefined);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState<Class | null>(null);

  const { data: classes, isLoading, error } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
  });
  
  const { data: reportData } = useQuery<any>({
    queryKey: ["/api/reports/dashboard"],
  });
  
  // Lấy số học sinh trong mỗi lớp từ dashboard report
  const studentsPerClass = reportData?.studentsPerClass || [];

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/classes/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      toast({
        title: "Thành công",
        description: "Đã xóa lớp học",
      });
      setIsDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      // Check if the error is due to class having students
      if (error.message && error.message.includes("Không thể xóa lớp học có học sinh")) {
        toast({
          title: "Không thể xóa",
          description: "Lớp học đang có học sinh. Vui lòng chuyển học sinh sang lớp khác trước khi xóa.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Lỗi",
          description: error.message || "Không thể xóa lớp học",
          variant: "destructive",
        });
      }
      setIsDeleteDialogOpen(false);
    },
  });

  const handleAddClass = () => {
    setSelectedClass(undefined);
    setIsFormOpen(true);
  };

  const handleEditClass = (classItem: Class) => {
    setSelectedClass(classItem);
    setIsFormOpen(true);
  };

  const handleDeleteClass = (classItem: Class) => {
    setClassToDelete(classItem);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (classToDelete) {
      deleteMutation.mutate(classToDelete.id);
    }
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setSelectedClass(undefined);
  };

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <h2 className="text-lg leading-6 font-medium text-neutral-800">Danh sách lớp học</h2>
        <Button 
          onClick={handleAddClass} 
          className="mt-3 sm:mt-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          Thêm lớp
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4">
          <p>Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại sau.</p>
        </div>
      ) : classes && classes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {classes.map((classItem) => {
            // Tìm thông tin học sinh trong lớp này
            const classStudentInfo = studentsPerClass.find((c: any) => c.name === classItem.name) || { count: 0 };
            
            // Lấy thông tin học sinh trong lớp này
            const classId = classItem.id;
            const { data: students } = useQuery<any[]>({
              queryKey: ["/api/students"],
              enabled: classStudentInfo.count > 0,
            });

            const { data: payments } = useQuery<any[]>({
              queryKey: ["/api/payments"],
              enabled: classStudentInfo.count > 0,
            });
            
            // Chỉ tính cho các lớp có học sinh
            const hasStudents = classStudentInfo.count > 0;
            
            // Tìm học sinh thuộc lớp này
            const studentsInClass = students?.filter(s => s.classId === classId) || [];
            
            // Tính toán học phí cho lớp này dựa trên học sinh thực tế
            const classPayment = studentsInClass.reduce((acc, student) => {
              let pendingAmount = 0;
              
              // Nếu học sinh chưa có bản ghi thanh toán, tính họ chưa đóng tiền
              const studentPayments = payments?.filter(p => p.studentId === student.id) || [];
              if (studentPayments.length === 0) {
                pendingAmount = classItem.fee; // Học sinh chưa đóng tiền
              }
              
              return {
                paid: acc.paid + 0, // Chưa có thanh toán nào được ghi nhận
                pending: acc.pending + pendingAmount,
                overdue: acc.overdue + 0 // Chưa có thanh toán nào quá hạn
              };
            }, { paid: 0, pending: 0, overdue: 0 });
            
            // Sử dụng dữ liệu tính toán
            const paymentStats = {
              paid: classPayment.paid,
              pending: classPayment.pending,
              overdue: classPayment.overdue
            };
            
            // Tính tổng số tiền
            const totalFees = paymentStats.paid + paymentStats.pending + paymentStats.overdue;
            
            // Tính phần trăm
            const paidPercent = totalFees > 0 ? (paymentStats.paid / totalFees) * 100 : 0;
            const pendingPercent = totalFees > 0 ? (paymentStats.pending / totalFees) * 100 : 0;
            const overduePercent = totalFees > 0 ? (paymentStats.overdue / totalFees) * 100 : 0;
            
            return (
              <Card 
                key={classItem.id} 
                className="overflow-hidden transition-all duration-200 hover:shadow-lg"
              >
                <CardHeader className="pb-2 flex justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold text-primary">{classItem.name}</CardTitle>
                    <CardDescription className="text-sm text-gray-500 mt-1">
                      {classItem.location}
                    </CardDescription>
                  </div>
                  <div className="flex space-x-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-gray-500"
                      onClick={() => handleEditClass(classItem)}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Sửa</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-gray-500"
                      onClick={() => handleDeleteClass(classItem)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Xóa</span>
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="pb-3">
                  <div className="flex items-center mb-3">
                    <Users className="h-5 w-5 text-blue-500 mr-2" />
                    <div className="text-sm">
                      <span className="font-medium text-blue-600">{classStudentInfo.count}</span> 
                      <span className="text-gray-500 ml-1">học sinh</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center mb-3">
                    <Calendar className="h-5 w-5 text-indigo-500 mr-2" />
                    <div className="text-sm text-gray-600">{classItem.schedule}</div>
                  </div>
                  
                  <div className="flex items-center mb-4">
                    <MapPin className="h-5 w-5 text-rose-500 mr-2" />
                    <div className="text-sm text-gray-600">{classItem.location}</div>
                  </div>
                  
                  <div className="mb-2">
                    <div className="flex justify-between items-center mb-1">
                      <div className="text-sm font-medium">Học phí</div>
                      <div className="text-sm font-semibold">{formatCurrency(classItem.fee)}</div>
                    </div>
                    <div className="flex items-center">
                      <CreditCard className="h-4 w-4 text-purple-500 mr-2" />
                      <div className="text-xs text-gray-600 flex gap-2">
                        <div className="flex gap-1">
                          <Badge variant="outline" className="px-2 py-0 h-5 text-xs whitespace-nowrap border-purple-200 bg-purple-50 text-purple-700">1 tháng</Badge>
                        </div>
                        <div className="flex gap-1">
                          <Badge variant="outline" className="px-2 py-0 h-5 text-xs whitespace-nowrap border-blue-200 bg-blue-50 text-blue-700">8 buổi</Badge>
                        </div>
                        <div className="flex gap-1">
                          <Badge variant="outline" className="px-2 py-0 h-5 text-xs whitespace-nowrap border-indigo-200 bg-indigo-50 text-indigo-700">10 buổi</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {classStudentInfo.count > 0 ? (
                    <div className="space-y-2 mt-4">
                      <div className="flex justify-between mb-1">
                        <div className="text-sm font-medium">Thanh toán</div>
                        <div className="text-sm font-medium">{formatCurrency(totalFees)}</div>
                      </div>
                      
                      <div className="h-3 relative w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full bg-green-500 transition-all absolute left-0 top-0"
                          style={{ width: `${paidPercent}%` }}
                        />
                        <div
                          className="h-full bg-yellow-500 transition-all absolute top-0"
                          style={{ left: `${paidPercent}%`, width: `${pendingPercent}%` }}
                        />
                        <div
                          className="h-full bg-red-500 transition-all absolute top-0"
                          style={{ left: `${paidPercent + pendingPercent}%`, width: `${overduePercent}%` }}
                        />
                      </div>
                      
                      <div className="flex justify-between text-xs mt-2">
                        <div className="flex items-center">
                          <div className="h-2 w-2 bg-green-500 rounded-full mr-1"></div>
                          <span className="text-gray-600">Đã đóng: {formatCurrency(paymentStats.paid)}</span>
                        </div>
                        <div className="flex items-center">
                          <div className="h-2 w-2 bg-yellow-500 rounded-full mr-1"></div>
                          <span className="text-gray-600">Chưa đóng: {formatCurrency(paymentStats.pending)}</span>
                        </div>
                        <div className="flex items-center">
                          <div className="h-2 w-2 bg-red-500 rounded-full mr-1"></div>
                          <span className="text-gray-600">Quá hạn: {formatCurrency(paymentStats.overdue)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center mt-4 justify-center p-3 bg-gray-50 rounded-md">
                      <span className="text-sm text-gray-500">Lớp chưa có học sinh</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <p className="text-neutral-600">Chưa có lớp học nào. Bắt đầu bằng cách thêm lớp học mới.</p>
          <Button onClick={handleAddClass} className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Thêm lớp học
          </Button>
        </div>
      )}

      {/* Class Form Modal */}
      <ClassForm 
        isOpen={isFormOpen} 
        onClose={closeForm} 
        classToEdit={selectedClass}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa lớp học</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa lớp học "{classToDelete?.name}"? 
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang xóa...
                </>
              ) : (
                "Xóa lớp học"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
