import React, { useState, useRef, useCallback } from "react";
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
import { formatCurrency, calculateFeeByPaymentCycle } from "@/utils/format";
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
  const { data: classData } = useQuery<any>({
    queryKey: ["/api/classes"],
    enabled: !!student?.classId,
    select: (data) => {
      const foundClass = data?.find((c: any) => c.id === student?.classId);
      console.log("Class data found:", foundClass); 
      return foundClass;
    }
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

  const handlePrint = useCallback(() => {
    if (receiptRef.current) {
      const printContent = receiptRef.current;
      const printWindow = window.open('', '_blank');
      
      if (!printWindow) {
        toast({
          title: "Lỗi",
          description: "Không thể mở cửa sổ in. Vui lòng kiểm tra trình duyệt của bạn.",
          variant: "destructive",
        });
        return;
      }
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt-${student?.name}-${formatDate(paymentDate)}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .receipt { border: 1px solid #ddd; padding: 20px; max-width: 600px; margin: 0 auto; }
              .receipt-header { text-align: center; margin-bottom: 20px; }
              .receipt-title { font-size: 18px; font-weight: bold; margin-top: 10px; }
              .receipt-item { margin-bottom: 8px; }
              .receipt-label { font-weight: bold; }
              .receipt-footer { text-align: right; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="receipt">
              ${printContent.innerHTML}
            </div>
            <script>
              window.onload = function() { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `);
      
      printWindow.document.close();
    } else {
      toast({
        title: "Lỗi",
        description: "Không tìm thấy nội dung biên nhận để in",
        variant: "destructive",
      });
    }
  }, [receiptRef, student, paymentDate]);
  
  // Mutation for saving payment
  const paymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      try {
        const res = await apiRequest("POST", "/api/payments", paymentData);
        if (!res.ok) {
          const errorData = await res.json();
          console.error("Payment API error:", errorData);
          throw new Error(errorData.message || "Lỗi khi tạo thanh toán");
        }
        return res.json();
      } catch (error) {
        console.error("Payment mutation error:", error);
        throw error;
      }
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
    if (!student || !classData || !classData.fee) return;
    
    const validFrom = new Date();
    const validTo = new Date();
    
    // Calculate validTo based on payment cycle
    if (student.paymentCycle === "1-thang") {
      validTo.setMonth(validTo.getMonth() + 1);
      // Trừ đi 1 ngày để lấy chính xác 1 tháng (vd: 15/4 -> 14/5)
      validTo.setDate(validTo.getDate() - 1);
    } else if (student.paymentCycle === "theo-ngay") {
      // Nếu theo ngày: không thay đổi, validTo = validFrom
    } else if (student.paymentCycle === "8-buoi" || student.paymentCycle === "10-buoi") {
      // Tính dựa trên số buổi
      const numClasses = student.paymentCycle === "8-buoi" ? 8 : 10;
      // Giả sử mỗi tuần học 2 buổi, nên chia số buổi cho 2 để ra số tuần
      const weeksNeeded = numClasses / 2;
      validTo.setDate(validTo.getDate() + (weeksNeeded * 7));
    } else {
      // Mặc định thêm 1 tháng
      validTo.setMonth(validTo.getMonth() + 1);
    }
    
    // Format ngày tháng theo định dạng YYYY-MM-DD
    const formatDateForAPI = (date: Date) => {
      return date.toISOString().split('T')[0];
    };
    
    const paymentData = {
      studentId: student.id,
      amount: getFeeAmount(), // Sử dụng số tiền đã tính dựa trên chu kỳ
      paymentDate: formatDateForAPI(validFrom),
      validFrom: formatDateForAPI(validFrom),
      validTo: formatDateForAPI(validTo),
      status: "paid",
      notes: `Thanh toán học phí ${student.name} - ${student.code}`
    };
    
    console.log("Sending payment data:", paymentData);
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
    
    // Với chu kỳ theo tháng: cộng thêm 1 tháng
    if (paymentCycle === "1-thang") {
      const validUntil = new Date(today);
      validUntil.setMonth(validUntil.getMonth() + 1);
      // Trừ đi 1 ngày để lấy chính xác 1 tháng (vd: 15/4 -> 14/5)
      validUntil.setDate(validUntil.getDate() - 1);
      return formatDate(validUntil);
    } 
    // Với chu kỳ theo buổi: học đủ số buổi mới tính hết chu kỳ
    else if (paymentCycle === "8-buoi" || paymentCycle === "10-buoi") {
      // Hiện tại thì cứ tạm cộng thêm 30 ngày
      // Trong thực tế, nên tính toán dựa trên lịch học
      const validUntil = new Date(today);
      const numClasses = paymentCycle === "8-buoi" ? 8 : 10;
      
      // Giả sử mỗi tuần học 2 buổi, nên chia số buổi cho 2 để ra số tuần
      const weeksNeeded = numClasses / 2;
      validUntil.setDate(validUntil.getDate() + (weeksNeeded * 7));
      
      return formatDate(validUntil);
    } 
    // Với chu kỳ theo ngày: ngày đến = ngày bắt đầu
    else if (paymentCycle === "theo-ngay") {
      return formatDate(today);
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

  // Calculate fee amount based on payment cycle
  const getFeeAmount = () => {
    console.log("getFeeAmount called with classData:", classData);
    console.log("student:", student);
    
    if (!classData || !classData.fee) {
      console.log("Missing class data or fee");
      return 0;
    }
    
    // Ensure the base amount is a number
    let baseAmount = 0;
    if (typeof classData.fee === 'number') {
      baseAmount = classData.fee;
    } else if (typeof classData.fee === 'string') {
      baseAmount = parseInt(String(classData.fee), 10);
    }
    
    console.log("Base amount after parsing:", baseAmount);
    console.log("Payment cycle:", student?.paymentCycle);
    
    // Sử dụng hàm tiện ích để tính học phí dựa theo chu kỳ thanh toán
    const calculatedFee = calculateFeeByPaymentCycle(baseAmount, student?.paymentCycle || "1-thang");
    console.log("Calculated fee:", calculatedFee);
    
    return calculatedFee;
  };

  // Create a formatted amount with Vietnamese words
  const getAmountInWords = () => {
    // Get the calculated amount
    const amount = getFeeAmount();
    
    if (isNaN(amount) || amount === 0) return "không đồng";
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
            <span className="font-medium">Đã nhận số tiền:</span> {formatCurrency(getFeeAmount())} 
          </p>
          <p className="text-sm mb-1">
            <span className="font-medium">Bằng chữ:</span> <span className="italic">{getAmountInWords()}</span>
          </p>
          <p className="text-sm mb-1">
            <span className="font-medium">Học sinh:</span> {student?.name}
          </p>
          <p className="text-sm mb-1">
            <span className="font-medium">Lớp:</span> {student?.className}
          </p>
          <p className="text-sm mb-1">
            <span className="font-medium">Chu kỳ thanh toán:</span> {student?.paymentCycle === '1-thang' ? 'Theo tháng' : 
              student?.paymentCycle === '8-buoi' ? '8 buổi' : 
              student?.paymentCycle === '10-buoi' ? '10 buổi' :
              student?.paymentCycle === 'theo-ngay' ? 'Theo ngày' : 'Chưa xác định'}
          </p>
          <p className="text-sm mb-1">
            <span className="font-medium">Học phí tính từ ngày:</span> {formatDate(paymentDate)} đến ngày {getValidUntilDate()}
          </p>
          
          {/* Hiển thị thông tin điểm danh nếu có */}
          {attendance && Array.isArray(attendance) && attendance.length > 0 && (
            <div className="text-sm mb-4 mt-2 border-t pt-2">
              <p className="font-medium">Điểm danh:</p>
              <div className="grid grid-cols-2 gap-1 mt-1">
                {attendance.slice(0, 8).map((a: any, index: number) => (
                  <p key={index} className="text-xs">
                    {formatDate(a.date)}: {a.status === 'present' ? 'Có mặt' : 
                                           a.status === 'absent' ? 'Vắng mặt' : 'Giáo viên nghỉ'}
                  </p>
                ))}
              </div>
            </div>
          )}
          
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
          <div className="flex flex-wrap sm:flex-nowrap space-x-0 sm:space-x-2 space-y-2 sm:space-y-0">
            {/* Nút thanh toán */}
            <Button 
              onClick={handlePayment}
              disabled={paymentMutation.isPending || isPaymentComplete}
              className={`w-full sm:w-auto ${isPaymentComplete ? "bg-success hover:bg-success" : ""}`}
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
            
            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Đóng
            </Button>
            
            <Button 
              onClick={handlePrint} 
              type="button" 
              className="w-full sm:w-auto"
            >
              <Printer className="h-4 w-4 mr-2" />
              In biên nhận
            </Button>
            
            <Button 
              variant="secondary" 
              onClick={captureAndDownloadReceipt} 
              disabled={isProcessing}
              className="w-full sm:w-auto"
            >
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
