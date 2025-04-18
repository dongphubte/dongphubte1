import { useState, useRef } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, Check, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatCurrency } from "@/utils/format";
import { formatDate } from "@/utils/date-utils";
import { useReactToPrint } from "react-to-print";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import html2canvas from "html2canvas";

interface ReceiptProps {
  isOpen: boolean;
  onClose: () => void;
  student: any;
}

export default function Receipt({ isOpen, onClose, student }: ReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [paymentDate, setPaymentDate] = useState(new Date());
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaymentComplete, setIsPaymentComplete] = useState(false);
  
  // Get class info
  const { data: classData } = useQuery({
    queryKey: ["/api/classes", student?.classId],
    enabled: !!student?.classId,
  });
  
  // Get payment info
  const { data: payments } = useQuery({
    queryKey: ["/api/payments/student", student?.id],
    enabled: !!student?.id,
  });
  
  // Get attendance info
  const { data: attendance } = useQuery({
    queryKey: ["/api/attendance/student", student?.id],
    enabled: !!student?.id,
  });

  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
    documentTitle: `Receipt-${student?.name}-${formatDate(paymentDate)}`,
  });
  
  // Mutation for saving payment
  const paymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      const res = await apiRequest("POST", "/api/payments", paymentData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments/student", student?.id] });
      setIsPaymentComplete(true);
      toast({
        title: "Thanh toán thành công",
        description: "Đã cập nhật trạng thái thanh toán cho học sinh",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi thanh toán",
        description: error.message || "Không thể cập nhật trạng thái thanh toán",
        variant: "destructive",
      });
    },
  });
  
  // Handle payment confirmation
  const handlePayment = () => {
    if (!student || !classData) return;
    
    const validFrom = new Date();
    const validTo = new Date();
    
    // Calculate validTo based on payment cycle
    if (student.paymentCycle === "1-thang") {
      validTo.setMonth(validTo.getMonth() + 1);
    } else {
      // Assuming 8-buoi or 10-buoi corresponds to roughly a month
      validTo.setDate(validTo.getDate() + 30);
    }
    
    const paymentData = {
      studentId: student.id,
      amount: classData.fee,
      paymentDate: validFrom.toISOString().split('T')[0], // Format as YYYY-MM-DD
      validFrom: validFrom.toISOString().split('T')[0],
      validTo: validTo.toISOString().split('T')[0],
      status: "paid",
      notes: `Thanh toán học phí ${student.name} - ${student.code}`
    };
    
    paymentMutation.mutate(paymentData);
  };
  
  // Function to capture and download receipt as image
  const captureAndDownloadReceipt = async () => {
    if (!receiptRef.current) return;
    
    setIsProcessing(true);
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2, // Higher scale for better quality
        backgroundColor: '#ffffff',
        logging: false
      });
      
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `HoeEdu-Receipt-${student?.name}-${formatDate(paymentDate)}.png`;
      link.click();
      
      toast({
        title: "Xuất biên nhận thành công",
        description: "Biên nhận đã được lưu dưới dạng hình ảnh",
      });
    } catch (error) {
      console.error("Error generating receipt image:", error);
      toast({
        title: "Lỗi",
        description: "Không thể xuất biên nhận. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculate valid until date based on payment cycle
  const getValidUntilDate = () => {
    if (!student) return "";
    
    const paymentCycle = student.paymentCycle;
    const today = new Date(paymentDate);
    
    if (paymentCycle === "1-thang") {
      const validUntil = new Date(today);
      validUntil.setDate(validUntil.getDate() + 30);
      return formatDate(validUntil);
    } else if (paymentCycle === "8-buoi" || paymentCycle === "10-buoi") {
      // In a real implementation, this would be calculated based on attendance
      // For now, we'll just add 30 days as a placeholder
      const validUntil = new Date(today);
      validUntil.setDate(validUntil.getDate() + 30);
      return formatDate(validUntil);
    }
    
    return "";
  };

  // Convert number to Vietnamese words
  const numberToWords = (num: number): string => {
    const units = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
    const teens = ['mười', 'mười một', 'mười hai', 'mười ba', 'mười bốn', 'mười lăm', 'mười sáu', 'mười bảy', 'mười tám', 'mười chín'];
    const tens = ['', '', 'hai mươi', 'ba mươi', 'bốn mươi', 'năm mươi', 'sáu mươi', 'bảy mươi', 'tám mươi', 'chín mươi'];
    
    // Handle small numbers
    if (num < 10) return units[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) {
      return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + units[num % 10] : '');
    }
    
    // Handle hundreds
    if (num < 1000) {
      return units[Math.floor(num / 100)] + ' trăm' + 
             (num % 100 !== 0 ? ' ' + numberToWords(num % 100) : '');
    }
    
    // Handle thousands
    if (num < 1000000) {
      return numberToWords(Math.floor(num / 1000)) + ' nghìn' + 
             (num % 1000 !== 0 ? ' ' + numberToWords(num % 1000) : '');
    }
    
    // Handle millions
    return numberToWords(Math.floor(num / 1000000)) + ' triệu' + 
           (num % 1000000 !== 0 ? ' ' + numberToWords(num % 1000000) : '');
  };

  // Create a formatted amount with Vietnamese words
  const getAmountInWords = () => {
    if (!classData) return "";
    const amount = classData.fee;
    return numberToWords(amount) + " đồng";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Biên nhận thanh toán</DialogTitle>
        </DialogHeader>
        
        <div ref={receiptRef} className="border p-4 rounded-lg bg-white">
          <div className="text-center mb-4">
            <p className="font-medium">HoeEdu Solution</p>
            <p className="text-sm text-neutral-500">0985970322</p>
            <h3 className="text-lg font-bold mt-2">BIÊN NHẬN</h3>
          </div>
          
          <p className="text-sm mb-4">
            Ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
          </p>
          
          <p className="text-sm mb-1">
            <span className="font-medium">Đã nhận số tiền:</span> {classData && classData.fee ? formatCurrency(classData.fee) : ""} ({getAmountInWords()})
          </p>
          <p className="text-sm mb-1">
            <span className="font-medium">Học sinh:</span> {student?.name}
          </p>
          <p className="text-sm mb-1">
            <span className="font-medium">Lớp:</span> {student?.className}
          </p>
          <p className="text-sm mb-4">
            <span className="font-medium">Học phí tính từ ngày:</span> {formatDate(paymentDate)} đến ngày {getValidUntilDate()}
          </p>
          
          <p className="text-sm mb-4">Phụ huynh vui lòng kiểm tra kỹ số tiền và ngày học của con.</p>
          
          <div className="text-right">
            <p className="text-sm mb-1">Chân thành cảm ơn</p>
            <p className="font-medium">Trần Đông Phú</p>
          </div>
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-3">
          <p className="text-sm text-neutral-500">
            Mã học sinh: {student?.code}
          </p>
          <div className="flex space-x-2">
            {/* Hiển thị nút thanh toán nếu trạng thái thanh toán là pending hoặc overdue */}
            {student?.paymentStatus === 'pending' || student?.paymentStatus === 'overdue' ? (
              <Button 
                onClick={handlePayment}
                disabled={paymentMutation.isPending || isPaymentComplete}
                className={isPaymentComplete ? "bg-success hover:bg-success" : ""}
              >
                {paymentMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Đang xử lý...
                  </>
                ) : isPaymentComplete ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Đã thanh toán
                  </>
                ) : (
                  "Xác nhận thanh toán"
                )}
              </Button>
            ) : null}
            
            <Button variant="outline" onClick={onClose}>
              Đóng
            </Button>
            
            <Button onClick={() => handlePrint()} type="button">
              <Printer className="h-4 w-4 mr-2" />
              In biên nhận
            </Button>
            
            <Button variant="secondary" onClick={captureAndDownloadReceipt} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Tải hình ảnh
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
