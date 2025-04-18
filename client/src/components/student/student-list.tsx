import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Student, Class } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2, FileText } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import StudentForm from "./student-form";
import Receipt from "@/components/receipt/receipt";
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

  const getClassName = (classId: number): string => {
    if (!classes) return "";
    const foundClass = classes.find((c) => c.id === classId);
    return foundClass ? foundClass.name : "";
  };

  const getPaymentStatus = (studentId: number): string => {
    if (!payments) return "pending";
    
    // Kiểm tra xem payments có phải là một mảng không
    if (!Array.isArray(payments)) return "pending";
    
    const studentPayments = payments.filter((p: any) => p.studentId === studentId);
    
    if (studentPayments.length === 0) return "pending";
    
    // Sort by validTo date descending to get the latest payment
    const latestPayment = studentPayments.sort(
      (a: any, b: any) => new Date(b.validTo).getTime() - new Date(a.validTo).getTime()
    )[0];
    
    // Nếu thanh toán gần nhất vẫn còn hiệu lực, trả về trạng thái từ thanh toán đó
    if (new Date(latestPayment.validTo) >= new Date()) {
      return latestPayment.status;
    }
    
    // Tìm học sinh để kiểm tra chu kỳ thanh toán
    const student = filteredStudents.find(s => s.id === studentId);
    
    // Nếu học sinh thanh toán theo ngày hoặc theo buổi, không đánh dấu là quá hạn
    // vì các chu kỳ này không có khoảng thời gian cố định phải thanh toán
    if (student && (student.paymentCycle === "theo-ngay")) {
      // Chỉ trả về trạng thái theo ngày từ thanh toán gần nhất, không đánh dấu là quá hạn
      return latestPayment.status === "paid" ? "paid" : "pending";
    }
    
    // Đối với các chu kỳ khác (1-thang, 8-buoi, 10-buoi), kiểm tra nếu đã quá hạn
    return "overdue";
  };

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

  // Filter students based on search term and only show active students by default
  const filteredStudents = students?.filter(student => {
    // First filter by status - only show active students in the main list
    const matchesStatus = student.status === 'active';
    
    // Then filter by search term if any
    const matchesSearch = searchTerm ? (
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.phone.includes(searchTerm)
    ) : true;
    
    return matchesStatus && matchesSearch;
  });

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
                  
                  return (
                    <tr key={student.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-800">{student.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">{student.code}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">{student.phone}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">{getClassName(student.classId)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">{formatDate(student.registrationDate)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span 
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            student.status === 'active' 
                              ? 'bg-success bg-opacity-10 text-success' 
                              : 'bg-error bg-opacity-10 text-error'
                          }`}
                        >
                          {student.status === 'active' ? 'Đang học' : 'Nghỉ học'}
                        </span>
                        {student.status === 'active' && (
                          <span 
                            className={`ml-1 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              paymentStatus === 'paid'
                                ? 'bg-success bg-opacity-10 text-success'
                                : paymentStatus === 'pending'
                                ? 'bg-warning bg-opacity-10 text-warning'
                                : 'bg-error bg-opacity-10 text-error'
                            }`}
                          >
                            {paymentStatus === 'paid' 
                              ? 'Đã thanh toán' 
                              : paymentStatus === 'pending' 
                              ? 'Chưa thanh toán'
                              : 'Quá hạn thanh toán'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {/* Nút thanh toán chỉ hiển thị khi học sinh chưa thanh toán hoặc quá hạn */}
                        {paymentStatus === 'pending' || paymentStatus === 'overdue' ? (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className={`mr-1 ${
                              paymentStatus === 'pending' ? 'text-warning border-warning hover:bg-warning/10' : 
                              'text-error border-error hover:bg-error/10'
                            }`}
                            onClick={() => showReceipt(student)}
                          >
                            Thanh toán
                          </Button>
                        ) : null}
                        
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-primary hover:text-primary hover:bg-primary/10 mr-1"
                          onClick={() => showReceipt(student)}
                          title="Biên nhận"
                        >
                          <FileText className="h-4 w-4" />
                          <span className="sr-only">Biên nhận</span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-primary hover:text-primary hover:bg-primary/10 mr-1"
                          onClick={() => handleEditStudent(student)}
                          title="Sửa"
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Sửa</span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteStudent(student)}
                          title="Xóa"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Xóa</span>
                        </Button>
                      </td>
                    </tr>
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
    </div>
  );
}
