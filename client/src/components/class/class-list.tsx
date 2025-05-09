import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Class } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, Pencil, Trash2, Loader2, Users, Clock, MapPin, 
  Calendar, CreditCard, AlertTriangle, Ban, Eye, X, CheckCircle,
  UserCheck, UserX, ExternalLink
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import ClassForm from "./class-form";
import ClassStudentsModal from "./class-students-modal";
import { formatCurrency, formatPaymentCycle, calculateFeeByPaymentCycle, formatFeeDisplay } from "@/utils/format";
import { useSettings, FeeCalculationMethod } from "@/hooks/use-settings";
import { formatDate, isClassScheduledToday } from "@/utils/date-utils";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  const { getFeeCalculationMethod } = useSettings();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | undefined>(undefined);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState<Class | null>(null);
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [classToClose, setClassToClose] = useState<Class | null>(null);
  const [closeReason, setCloseReason] = useState("");

  const { data: classesRaw, isLoading, error } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
  });
  
  // State để theo dõi lớp nào đang hiển thị chi tiết
  const [classDetailsOpen, setClassDetailsOpen] = useState<number | null>(null);
  
  // Sắp xếp lớp để Lớp 1 hiển thị đầu tiên
  const classes = useMemo(() => {
    if (!classesRaw) return undefined;
    
    return [...classesRaw].sort((a, b) => {
      // Sắp xếp Lớp 1 lên đầu
      if (a.name === 'Lớp 1') return -1;
      if (b.name === 'Lớp 1') return 1;
      // Sắp xếp các lớp còn lại theo ID
      return a.id - b.id;
    });
  }, [classesRaw]);
  
  const { data: reportData } = useQuery<any>({
    queryKey: ["/api/reports/dashboard"],
  });
  
  const { data: students } = useQuery<any[]>({
    queryKey: ["/api/students"],
  });

  const { data: payments } = useQuery<any[]>({
    queryKey: ["/api/payments"],
  });
  
  // Lấy số học sinh trong mỗi lớp từ dashboard report
  const studentsPerClass = reportData?.studentsPerClass || [];

  // Mutation để đóng lớp học
  const closeClassMutation = useMutation({
    mutationFn: async ({ id, closeData }: { id: number, closeData: { closedDate: Date, closedReason: string } }) => {
      const res = await apiRequest("PATCH", `/api/classes/${id}/close`, closeData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/dashboard"] });
      toast({
        title: "Thành công",
        description: "Đã đóng lớp học. Lớp học này sẽ không tính học phí mới.",
      });
      setIsCloseDialogOpen(false);
      setClassToClose(null);
      setCloseReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể đóng lớp học",
        variant: "destructive",
      });
      setIsCloseDialogOpen(false);
    },
  });
  
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
  
  const handleCloseClass = (classItem: Class) => {
    setClassToClose(classItem);
    setCloseReason(""); // Reset reason when opening dialog
    setIsCloseDialogOpen(true);
  };

  const confirmDelete = () => {
    if (classToDelete) {
      deleteMutation.mutate(classToDelete.id);
    }
  };
  
  const confirmCloseClass = () => {
    if (classToClose) {
      closeClassMutation.mutate({
        id: classToClose.id,
        closeData: {
          closedDate: new Date(),
          closedReason: closeReason
        }
      });
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
            
            // Chỉ tính cho các lớp có học sinh
            const hasStudents = classStudentInfo.count > 0;
            
            // Tìm học sinh thuộc lớp này
            const studentsInClass = students?.filter(s => s.classId === classId) || [];
            
            // Tính toán học phí cho lớp này dựa trên học sinh thực tế và chỉ tính cho học sinh đang học
            const classPayment = studentsInClass.reduce((acc, student) => {
              // Nếu học sinh đã nghỉ, không tính phí
              if (student.status === 'inactive') {
                return acc;
              }
              
              // Lấy tất cả thanh toán của học sinh
              const studentPayments = payments?.filter(p => p.studentId === student.id) || [];
              
              // Tính tổng số tiền đã thanh toán
              const paidAmount = studentPayments
                .filter(p => p.status === 'paid')
                .reduce((sum, p) => sum + p.amount, 0);
                
              // Tính tổng số tiền đang chờ
              const pendingAmount = studentPayments
                .filter(p => p.status === 'pending')
                .reduce((sum, p) => sum + p.amount, 0);
                
              // Tính tổng số tiền quá hạn
              const overdueAmount = studentPayments
                .filter(p => p.status === 'overdue')
                .reduce((sum, p) => sum + p.amount, 0);
              
              // Nếu học sinh chưa có thanh toán nào, tính là đang chờ
              let defaultPendingAmount = 0;
              if (studentPayments.length === 0) {
                // Đối với chu kỳ 1 tháng, sử dụng giá trị học phí trực tiếp mà không nhân với bất kỳ số nào
                defaultPendingAmount = classItem.fee;
              }
              
              return {
                paid: acc.paid + paidAmount,
                pending: acc.pending + pendingAmount + (studentPayments.length === 0 ? defaultPendingAmount : 0),
                overdue: acc.overdue + overdueAmount
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
                  <div className="flex items-center gap-2">
                    <div>
                      <CardTitle className="text-xl font-bold text-primary">
                        {classItem.name}
                      </CardTitle>
                    </div>
                    {isClassScheduledToday(classItem.schedule) && (
                      <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 border-0 text-white px-2 py-0.5 text-xs font-medium animate-pulse shadow-sm">
                        Đang học
                      </Badge>
                    )}
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
                    {classItem.status === 'active' && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-amber-500"
                        onClick={() => handleCloseClass(classItem)}
                        title="Đóng lớp"
                      >
                        <Ban className="h-4 w-4" />
                        <span className="sr-only">Đóng lớp</span>
                      </Button>
                    )}
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
                    <div className="text-sm text-gray-600">
                      {classItem.schedule.split(',')
                        .map(item => item.split('(')[0].trim())
                        .join(', ')}
                    </div>
                  </div>
                  
                  <div className="flex items-center mb-4">
                    <MapPin className="h-5 w-5 text-rose-500 mr-2" />
                    <div className="text-sm text-gray-600">{classItem.location}</div>
                  </div>
                  
                  <div className="mb-2">
                    <div className="flex justify-between items-center mb-1">
                      <div className="text-sm font-medium">Học phí</div>
                      <div className="text-sm font-semibold">
                        {formatFeeDisplay(
                          classItem.fee, 
                          classItem.paymentCycle || '1-thang', 
                          getFeeCalculationMethod() || FeeCalculationMethod.PER_SESSION
                        )}
                      </div>
                    </div>
                    <div className="flex items-center">
                      <CreditCard className="h-4 w-4 text-purple-500 mr-2" />
                      <div className="text-xs text-gray-600">
                        {classItem.paymentCycle ? (
                          // Hiển thị chu kỳ thanh toán của lớp nếu có
                          <Badge variant="outline" className="px-2 py-0 h-5 text-xs whitespace-nowrap border-purple-200 bg-purple-50 text-purple-700">
                            {formatPaymentCycle(classItem.paymentCycle)}
                          </Badge>
                        ) : studentsInClass.length > 0 ? (
                          // Hoặc chu kỳ của học sinh đầu tiên trong lớp
                          <Badge variant="outline" className="px-2 py-0 h-5 text-xs whitespace-nowrap border-purple-200 bg-purple-50 text-purple-700">
                            {formatPaymentCycle(studentsInClass[0]?.paymentCycle || "1-thang")}
                          </Badge>
                        ) : (
                          // Hiển thị mặc định nếu không có học sinh
                          <Badge variant="outline" className="px-2 py-0 h-5 text-xs whitespace-nowrap border-purple-200 bg-purple-50 text-purple-700">
                            1 tháng
                          </Badge>
                        )}
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
                
                {/* Footer với nút Chi tiết */}
                <CardFooter className="pt-0 pb-3">
                  {classStudentInfo.count > 0 ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full text-sm"
                      onClick={() => setClassDetailsOpen(classDetailsOpen === classItem.id ? null : classItem.id)}
                    >
                      {classDetailsOpen === classItem.id ? (
                        <>
                          <X className="h-4 w-4 mr-2" />
                          Đóng chi tiết
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          Xem chi tiết học sinh
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full text-sm opacity-50 cursor-not-allowed"
                      disabled
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Chưa có học sinh
                    </Button>
                  )}
                </CardFooter>
                
                {/* Chi tiết học sinh trong lớp học */}
                {classDetailsOpen === classItem.id && (
                  <ClassStudentsModal 
                    classId={classItem.id}
                    className={classItem.name}
                    isOpen={true}
                    onClose={() => setClassDetailsOpen(null)}
                  />
                )}
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
      
      {/* Close Class Dialog */}
      <AlertDialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Đóng lớp học</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn đang đóng lớp học "{classToClose?.name}". Sau khi đóng:
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Lớp học sẽ không tính học phí mới</li>
                <li>Học sinh vẫn có thể xem lịch sử điểm danh và học phí</li>
                <li>Dữ liệu về lớp học vẫn được lưu trữ, nhưng sẽ không hiển thị trong danh sách lớp học đang hoạt động</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-3">
            <div className="grid gap-2">
              <Label htmlFor="closeReason">Lý do đóng lớp</Label>
              <Textarea 
                id="closeReason"
                placeholder="Ví dụ: Kết thúc khóa học, hợp nhất lớp,..."
                value={closeReason}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCloseReason(e.target.value)}
                className="min-h-24"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmCloseClass}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {closeClassMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang đóng lớp...
                </>
              ) : (
                "Đóng lớp học"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
