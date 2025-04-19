import { useState, useMemo, useCallback, memo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Student, Class } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2, FileText, Calculator, Info } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import StudentForm from "./student-form";
import Receipt from "@/components/receipt/receipt";
import PaymentAdjustmentHelper from "@/components/payment/payment-adjustment-helper";
import StudentDetailModal from "./student-detail-modal";
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
import { formatDate } from "@/utils/date-utils";

// Tối ưu hiệu suất với component riêng và memo
interface StudentRowProps {
  student: Student;
  className: string;
  paymentStatus: string;
  nextPaymentInfo?: {
    date: Date | null;
    cycle: string;
    isDueEstimated: boolean;
  };
  onShowReceipt: (student: Student) => void;
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
  onAdjustPayment: (student: Student) => void;
  onViewDetails: (student: Student) => void;
}

// Sử dụng React.memo để tránh render lại khi props không thay đổi
const StudentRow = memo(({ 
  student, 
  className, 
  paymentStatus, 
  nextPaymentInfo, 
  onShowReceipt, 
  onEdit, 
  onDelete, 
  onAdjustPayment,
  onViewDetails
}: StudentRowProps) => {
  // Tối ưu hóa các tính toán className với useMemo
  const statusClassName = useMemo(() => 
    `px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
      student.status === 'active' 
        ? 'bg-success bg-opacity-10 text-success' 
        : 'bg-error bg-opacity-10 text-error'
    }`, 
    [student.status]
  );

  const paymentStatusClassName = useMemo(() => 
    `ml-1 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
      paymentStatus === 'paid'
        ? 'bg-success bg-opacity-10 text-success'
        : paymentStatus === 'pending'
        ? 'bg-warning bg-opacity-10 text-warning'
        : 'bg-error bg-opacity-10 text-error'
    }`,
    [paymentStatus]
  );

  const paymentButtonClassName = useMemo(() => 
    `mr-1 ${
      paymentStatus === 'pending' 
        ? 'text-warning border-warning hover:bg-warning/10' 
        : 'text-error border-error hover:bg-error/10'
    }`,
    [paymentStatus]
  );

  // Tối ưu hóa các hàm xử lý với useCallback
  const handleShowReceipt = useCallback(() => onShowReceipt(student), [onShowReceipt, student]);
  const handleViewReceipt = useCallback(() => onShowReceipt(student), [onShowReceipt, student]);
  const handleEdit = useCallback(() => onEdit(student), [onEdit, student]);
  const handleDelete = useCallback(() => onDelete(student), [onDelete, student]);
  const handleAdjustPayment = useCallback(() => onAdjustPayment(student), [onAdjustPayment, student]);
  const handleViewDetails = useCallback(() => onViewDetails(student), [onViewDetails, student]);

  return (
    <tr>
      <td 
        className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-800 cursor-pointer hover:text-primary hover:underline"
        onClick={handleViewDetails}
      >
        {student.name}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">{student.code}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">{student.phone}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">{className}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">{formatDate(student.registrationDate)}</td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={statusClassName}>
          {student.status === 'active' ? 'Đang học' : 'Nghỉ học'}
        </span>
        {student.status === 'active' && (
          <span className={paymentStatusClassName}>
            {paymentStatus === 'paid' 
              ? 'Đã thanh toán' 
              : paymentStatus === 'pending' 
              ? 'Chưa thanh toán'
              : 'Quá hạn thanh toán'}
          </span>
        )}
        {/* Hiển thị thông tin chu kỳ thanh toán tiếp theo nếu đã thanh toán */}
        {paymentStatus === 'paid' && nextPaymentInfo?.date && (
          <div className="mt-1 text-xs text-blue-600">
            Đến hạn: {formatDate(nextPaymentInfo.date)}
            {nextPaymentInfo.isDueEstimated && <span className="text-amber-500 ml-1">(dự kiến)</span>}
          </div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        {/* Nút thanh toán chỉ hiển thị khi học sinh chưa thanh toán hoặc quá hạn */}
        {paymentStatus === 'pending' || paymentStatus === 'overdue' ? (
          <Button 
            variant="outline" 
            size="sm" 
            className={paymentButtonClassName}
            onClick={handleShowReceipt}
          >
            Thanh toán
          </Button>
        ) : null}
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-primary hover:text-primary hover:bg-primary/10 mr-1"
          onClick={handleViewReceipt}
          title="Biên nhận"
        >
          <FileText className="h-4 w-4" />
          <span className="sr-only">Biên nhận</span>
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-primary hover:text-primary hover:bg-primary/10 mr-1"
          onClick={handleEdit}
          title="Sửa"
        >
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Sửa</span>
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-amber-600 hover:text-amber-600 hover:bg-amber-50 mr-1"
          onClick={handleAdjustPayment}
          title="Điều chỉnh học phí"
        >
          <Calculator className="h-4 w-4" />
          <span className="sr-only">Điều chỉnh học phí</span>
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-red-600 hover:text-red-600 hover:bg-red-50"
          onClick={handleDelete}
          title="Xóa"
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Xóa</span>
        </Button>
      </td>
    </tr>
  );
});

interface StudentWithClass extends Omit<Student, 'paymentStatus'> {
  className?: string;
  paymentStatus?: string;
}

export default function StudentList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | undefined>(undefined);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptStudent, setReceiptStudent] = useState<StudentWithClass | null>(null);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [adjustmentStudent, setAdjustmentStudent] = useState<Student | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [studentDetail, setStudentDetail] = useState<Student | null>(null);

  const { data: students, isLoading: isLoadingStudents } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });

  const { data: classes, isLoading: isLoadingClasses } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
  });

  const { data: payments, isLoading: isLoadingPayments } = useQuery({
    queryKey: ["/api/payments"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/students/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      toast({
        title: "Thành công",
        description: "Đã xóa học sinh",
      });
      setIsDeleteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể xóa học sinh",
        variant: "destructive",
      });
      setIsDeleteDialogOpen(false);
    },
  });

  const handleAddStudent = () => {
    setSelectedStudent(undefined);
    setIsFormOpen(true);
  };

  const handleEditStudent = (student: Student) => {
    setSelectedStudent(student);
    setIsFormOpen(true);
  };

  const handleDeleteStudent = (student: Student) => {
    setStudentToDelete(student);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (studentToDelete) {
      deleteMutation.mutate(studentToDelete.id);
    }
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setSelectedStudent(undefined);
  };

  // Tối ưu với memoized class map
  const classMap = useMemo(() => {
    if (!classes) return new Map<number, string>();
    return new Map(classes.map(c => [c.id, c.name]));
  }, [classes]);

  // Hàm này sử dụng class map đã lưu trong bộ nhớ cache để tìm kiếm nhanh hơn
  const getClassName = useCallback((classId: number): string => {
    return classMap.get(classId) || "";
  }, [classMap]);

  // Tạo một map cho các thanh toán theo sinh viên để tìm kiếm nhanh hơn
  const paymentsByStudent = useMemo(() => {
    if (!payments || !Array.isArray(payments)) return new Map<number, any[]>();
    
    const result = new Map<number, any[]>();
    payments.forEach((payment: any) => {
      const studentId = payment.studentId;
      if (!result.has(studentId)) {
        result.set(studentId, []);
      }
      result.get(studentId)!.push(payment);
    });
    
    // Sắp xếp các thanh toán của từng học sinh theo ngày giảm dần
    result.forEach((studentPayments, studentId) => {
      studentPayments.sort((a, b) => new Date(b.validTo).getTime() - new Date(a.validTo).getTime());
    });
    
    return result;
  }, [payments]);

  // Tối ưu lấy trạng thái thanh toán với tìm kiếm nhanh hơn
  const getPaymentStatus = useCallback((studentId: number): string => {
    // Kiểm tra xem có thanh toán cho học sinh này không
    if (!paymentsByStudent.has(studentId) || paymentsByStudent.get(studentId)!.length === 0) {
      return "pending";
    }
    
    // Lấy thanh toán gần nhất (đã sắp xếp trong map)
    const latestPayment = paymentsByStudent.get(studentId)![0];
    
    // Nếu thanh toán gần nhất vẫn còn hiệu lực, trả về trạng thái đó
    if (new Date(latestPayment.validTo) >= new Date()) {
      return latestPayment.status;
    }
    
    // Tìm học sinh để kiểm tra chu kỳ thanh toán
    const student = students?.find(s => s.id === studentId);
    
    // Nếu học sinh thanh toán theo ngày, không đánh dấu là quá hạn
    if (student && (student.paymentCycle === "theo-ngay")) {
      return latestPayment.status === "paid" ? "paid" : "pending";
    }
    
    // Đối với các chu kỳ khác, đánh dấu là quá hạn
    return "overdue";
  }, [paymentsByStudent, students]);
  
  // Lấy thông tin về ngày thanh toán tiếp theo
  const getNextPaymentInfo = useCallback((studentId: number): { date: Date | null, cycle: string, isDueEstimated: boolean } => {
    // Giá trị mặc định
    const defaultResult = { date: null, cycle: "", isDueEstimated: false };
    
    // Kiểm tra xem có thanh toán cho học sinh này không
    if (!paymentsByStudent.has(studentId) || paymentsByStudent.get(studentId)!.length === 0) {
      return defaultResult;
    }
    
    // Lấy học sinh và thanh toán gần nhất
    const student = students?.find(s => s.id === studentId);
    if (!student) return defaultResult;
    
    const latestPayment = paymentsByStudent.get(studentId)![0];
    const validTo = new Date(latestPayment.validTo);
    
    // Kiểm tra nếu thanh toán còn hiệu lực
    if (validTo >= new Date()) {
      // Xác định nếu chu kỳ thanh toán là ước tính (theo buổi)
      const isDueEstimated = student.paymentCycle.includes("buoi");
      
      return {
        date: validTo,
        cycle: student.paymentCycle,
        isDueEstimated
      };
    }
    
    return defaultResult;
  }, [paymentsByStudent, students]);

  const showReceipt = (student: Student, forPayment: boolean = false) => {
    const studentWithClass: StudentWithClass = {
      ...student,
      className: getClassName(student.classId),
      paymentStatus: getPaymentStatus(student.id)
    };
    setReceiptStudent(studentWithClass);
    setIsReceiptOpen(true);
  };

  const closeReceipt = () => {
    setIsReceiptOpen(false);
    setReceiptStudent(null);
  };
  
  // Xử lý mở dialog điều chỉnh học phí
  const handleAdjustPayment = (student: Student) => {
    setAdjustmentStudent(student);
    setIsAdjustmentOpen(true);
  };
  
  // Đóng dialog điều chỉnh học phí
  const closeAdjustment = () => {
    setIsAdjustmentOpen(false);
    setAdjustmentStudent(null);
  };
  
  // Hiển thị modal thông tin chi tiết học sinh
  const handleViewStudentDetails = (student: Student) => {
    setStudentDetail(student);
    setIsDetailOpen(true);
  };
  
  // Đóng modal thông tin chi tiết học sinh
  const closeStudentDetail = () => {
    setIsDetailOpen(false);
    setStudentDetail(null);
  };

  // Tối ưu danh sách học sinh với useMemo để tránh tính toán lại mỗi khi render
  const filteredStudents = useMemo(() => {
    if (!students) return [];
    
    // Cache lại searchTerm đã chuyển thành lowercase để tránh chuyển đổi nhiều lần
    const searchTermLower = searchTerm.toLowerCase();
    
    return students.filter(student => {
      // First filter by status - only show active students in the main list
      const matchesStatus = student.status === 'active';
      
      // Tối ưu: Nếu không có searchTerm, không cần kiểm tra
      if (!searchTerm) {
        return matchesStatus;
      }
      
      // Tối ưu: Kiểm tra các điều kiện từ dễ nhất (ít tốn kém nhất) đến phức tạp
      // Dừng ngay khi tìm thấy kết quả khớp
      if (student.phone.includes(searchTerm)) {
        return matchesStatus;
      }
      
      if (student.code.toLowerCase().includes(searchTermLower)) {
        return matchesStatus;
      }
      
      if (student.name.toLowerCase().includes(searchTermLower)) {
        return matchesStatus;
      }
      
      return false; // Không khớp với bất kỳ điều kiện nào
    });
  }, [students, searchTerm]);

  const isLoading = isLoadingStudents || isLoadingClasses || isLoadingPayments;

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <h2 className="text-lg leading-6 font-medium text-neutral-800">Danh sách học sinh</h2>
        <div className="flex flex-col sm:flex-row gap-3 mt-3 sm:mt-0">
          <div className="relative">
            <Input
              placeholder="Tìm kiếm học sinh..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 pl-10"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <Button onClick={handleAddStudent}>
            <Plus className="h-4 w-4 mr-2" />
            Thêm học sinh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredStudents && filteredStudents.length > 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-100">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Họ và tên</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Mã</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Số điện thoại</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Lớp học</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Ngày đăng ký</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Tình trạng</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {filteredStudents.map((student) => {
                  const paymentStatus = getPaymentStatus(student.id);
                  const nextPaymentInfo = getNextPaymentInfo(student.id);
                  
                  return (
                    <StudentRow 
                      key={student.id}
                      student={student}
                      className={getClassName(student.classId)}
                      paymentStatus={paymentStatus}
                      nextPaymentInfo={nextPaymentInfo}
                      onShowReceipt={showReceipt}
                      onEdit={handleEditStudent}
                      onDelete={handleDeleteStudent}
                      onAdjustPayment={handleAdjustPayment}
                      onViewDetails={handleViewStudentDetails}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <p className="text-neutral-600">
            {searchTerm 
              ? "Không tìm thấy học sinh phù hợp với tìm kiếm." 
              : "Chưa có học sinh nào. Bắt đầu bằng cách thêm học sinh mới."}
          </p>
          {!searchTerm && (
            <Button onClick={handleAddStudent} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Thêm học sinh
            </Button>
          )}
        </div>
      )}

      {/* Student Form */}
      <StudentForm 
        isOpen={isFormOpen} 
        onClose={closeForm} 
        studentToEdit={selectedStudent}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa học sinh</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa học sinh "{studentToDelete?.name}"? 
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
                "Xóa học sinh"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Receipt Dialog */}
      {receiptStudent && (
        <Receipt 
          isOpen={isReceiptOpen} 
          onClose={closeReceipt} 
          student={receiptStudent}
        />
      )}
      
      {/* Payment Adjustment Dialog */}
      {adjustmentStudent && (
        <PaymentAdjustmentHelper
          isOpen={isAdjustmentOpen}
          onClose={closeAdjustment}
          student={adjustmentStudent}
          classId={adjustmentStudent.classId}
          className={getClassName(adjustmentStudent.classId)}
        />
      )}
      
      {/* Student Detail Modal */}
      {studentDetail && (
        <StudentDetailModal
          isOpen={isDetailOpen}
          onClose={closeStudentDetail}
          student={studentDetail}
          className={getClassName(studentDetail.classId)}
        />
      )}
    </div>
  );
}
