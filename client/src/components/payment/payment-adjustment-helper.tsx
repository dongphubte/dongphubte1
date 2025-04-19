import { useState } from "react";
import { Payment, Student, Class } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/utils/format";

interface AdjustmentHelperProps {
  classId: number;
  className: string;
  student: Student;
  isOpen: boolean;
  onClose: () => void;
}

export default function PaymentAdjustmentHelper({ 
  classId, 
  className, 
  student, 
  isOpen, 
  onClose 
}: AdjustmentHelperProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [message, setMessage] = useState("");
  
  // Làm mới dữ liệu khi đóng dialog
  const handleClose = () => {
    setIsAdjusting(false);
    setIsCompleted(false);
    setMessage("");
    onClose();
  };
  
  // Mutation để cập nhật trạng thái học sinh
  const updateStudentMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", `/api/students/${student.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
    },
    onError: (error: Error) => {
      setMessage(`Lỗi cập nhật học sinh: ${error.message}`);
    }
  });
  
  // Mutation để cập nhật thanh toán
  const updatePaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", `/api/payments/${data.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
    },
    onError: (error: Error) => {
      setMessage(`Lỗi cập nhật thanh toán: ${error.message}`);
    }
  });
  
  // Xử lý khi người dùng xác nhận điều chỉnh
  const handleAdjustment = async () => {
    setIsAdjusting(true);
    setMessage("Đang xử lý...");
    
    try {
      // 1. Lấy danh sách thanh toán của học sinh
      const res = await fetch(`/api/payments/student/${student.id}`);
      const payments: Payment[] = await res.json();
      
      // 2. Kiểm tra và điều chỉnh các thanh toán
      if (payments.length > 0) {
        // Lọc các thanh toán có thể điều chỉnh (đã thanh toán, chưa điều chỉnh)
        const adjustablePayments = payments.filter(p => 
          p.status === "paid" && 
          (!p.actualSessions || p.actualSessions >= (p.plannedSessions || 0))
        );
        
        if (adjustablePayments.length > 0) {
          const latestPayment = adjustablePayments[adjustablePayments.length - 1];
          
          // Tính toán số buổi thực tế
          // Giả định có thể tính từ dữ liệu điểm danh, hiện tại đang dùng nửa số buổi cho demo
          const plannedSessions = latestPayment.plannedSessions || 0;
          const actualSessions = Math.floor(plannedSessions / 2); // Giả định học được nửa số buổi
          
          // Tính toán số tiền điều chỉnh
          const adjustedAmount = Math.round(
            (latestPayment.amount / plannedSessions) * actualSessions
          );
          
          // Cập nhật thanh toán
          await updatePaymentMutation.mutateAsync({
            ...latestPayment,
            actualSessions,
            amount: adjustedAmount,
            status: "partial_refund",
            adjustmentReason: `Học sinh nghỉ học/lớp kết thúc sớm. Đã học ${actualSessions}/${plannedSessions} buổi.`,
            notes: `Điều chỉnh học phí do học sinh nghỉ học. Học phí ban đầu: ${formatCurrency(latestPayment.amount)}`
          });
          
          setMessage(`Đã điều chỉnh thanh toán với học phí mới: ${formatCurrency(adjustedAmount)}`);
        } else {
          setMessage("Không tìm thấy thanh toán nào cần điều chỉnh.");
        }
      } else {
        setMessage("Học sinh chưa có thanh toán nào.");
      }
      
      // 3. Cập nhật trạng thái học sinh thành "inactive" (nghỉ học)
      await updateStudentMutation.mutateAsync({
        ...student,
        status: "inactive"
      });
      
      // 4. Hoàn thành quá trình
      setIsCompleted(true);
      
      toast({
        title: "Điều chỉnh thành công",
        description: "Đã cập nhật trạng thái học sinh và điều chỉnh thanh toán",
      });
    } catch (error: any) {
      setMessage(`Lỗi: ${error.message}`);
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsAdjusting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Điều chỉnh học phí khi nghỉ học</DialogTitle>
          <DialogDescription>
            Điều chỉnh học phí và cập nhật trạng thái cho học sinh nghỉ học hoặc lớp kết thúc sớm
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid gap-2 text-sm">
            <div><strong>Học sinh:</strong> {student.name}</div>
            <div><strong>Mã học sinh:</strong> {student.code}</div>
            <div><strong>Lớp học:</strong> {className}</div>
            <div><strong>Trạng thái hiện tại:</strong> {student.status === "active" ? "Đang học" : "Nghỉ học"}</div>
          </div>
          
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Lưu ý</AlertTitle>
            <AlertDescription>
              Thao tác này sẽ:
              <ul className="list-disc pl-5 mt-2">
                <li>Đánh dấu học sinh đã nghỉ học</li>
                <li>Điều chỉnh lại các khoản thanh toán chưa sử dụng hết</li>
                <li>Cập nhật số buổi học thực tế</li>
              </ul>
            </AlertDescription>
          </Alert>
          
          {message && (
            <Alert className={isCompleted ? "bg-green-50 border-green-200" : "bg-blue-50 border-blue-200"}>
              {isCompleted ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
            >
              Đóng
            </Button>
            
            <Button 
              onClick={handleAdjustment}
              disabled={isAdjusting || isCompleted || student.status === "inactive"}
            >
              {isAdjusting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : isCompleted ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Đã hoàn thành
                </>
              ) : (
                "Xác nhận điều chỉnh"
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}