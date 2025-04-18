import React, { useState, useRef, useCallback, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, Check, Loader2, Search, History } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatCurrency, calculateFeeByPaymentCycle, formatPaymentCycle, formatAttendanceStatus } from "@/utils/format";
import { formatDate } from "@/utils/date-utils";
import { useReactToPrint } from "react-to-print";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import html2canvas from "html2canvas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

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
  const [customAmount, setCustomAmount] = useState<number>(0);
  const [customSessions, setCustomSessions] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<string>("receipt");
  const [searchCode, setSearchCode] = useState<string>("");
  
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
  
  // Initialize custom amount and sessions after data is loaded
  useEffect(() => {
    if (student && classData) {
      // Initialize custom amount with calculated fee
      const baseAmount = classData?.fee ? Number(classData.fee) : 0;
      const calculatedFee = calculateFeeByPaymentCycle(baseAmount, student?.paymentCycle || "1-thang");
      setCustomAmount(calculatedFee);
      
      // Initialize custom sessions based on payment cycle
      if (student.paymentCycle === "8-buoi") {
        setCustomSessions(8);
      } else if (student.paymentCycle === "10-buoi") {
        setCustomSessions(10);
      } else if (student.paymentCycle === "theo-ngay") {
        setCustomSessions(1);
      } else {
        // Mặc định 1 tháng
        setCustomSessions(0);
      }
    }
  }, [student, classData]);

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
    
    const validFrom = new Date(paymentDate);
    const validTo = new Date(paymentDate);
    
    // Sử dụng số buổi tùy chỉnh nếu có
    let notes = `Thanh toán học phí ${student.name} - ${student.code}`;
    
    // Calculate validTo based on payment cycle
    if (student.paymentCycle === "1-thang") {
      validTo.setMonth(validTo.getMonth() + 1);
      // Trừ đi 1 ngày để lấy chính xác 1 tháng (vd: 15/4 -> 14/5)
      validTo.setDate(validTo.getDate() - 1);
    } else if (student.paymentCycle === "theo-ngay") {
      // Nếu theo ngày: không thay đổi, validTo = validFrom
      if (customSessions > 1) {
        // Nếu đóng nhiều ngày, mỗi ngày thêm 1 ngày vào validTo
        validTo.setDate(validTo.getDate() + (customSessions - 1));
        notes += ` (${customSessions} buổi)`;
      }
    } else if (student.paymentCycle === "8-buoi" || student.paymentCycle === "10-buoi") {
      // Tính dựa trên số buổi tùy chỉnh nếu có, ngược lại sử dụng mặc định
      const numClasses = customSessions > 0 ? customSessions : 
                        student.paymentCycle === "8-buoi" ? 8 : 10;
      
      // Giả sử mỗi tuần học 2 buổi, nên chia số buổi cho 2 để ra số tuần
      const weeksNeeded = numClasses / 2;
      validTo.setDate(validTo.getDate() + (weeksNeeded * 7));
      
      // Cập nhật ghi chú
      if (customSessions > 0 && customSessions !== (student.paymentCycle === "8-buoi" ? 8 : 10)) {
        notes += ` (${customSessions} buổi)`;
      }
    } else {
      // Mặc định thêm 1 tháng
      validTo.setMonth(validTo.getMonth() + 1);
    }
    
    // Format ngày tháng theo định dạng YYYY-MM-DD
    const formatDateForAPI = (date: Date) => {
      return date.toISOString().split('T')[0];
    };
    
    // Sử dụng số tiền tùy chỉnh nếu có, ngược lại sử dụng số tiền mặc định
    const amount = customAmount > 0 ? customAmount : getFeeAmount();
    
    const paymentData = {
      studentId: student.id,
      amount: amount,
      paymentDate: formatDateForAPI(validFrom),
      validFrom: formatDateForAPI(validFrom),
      validTo: formatDateForAPI(validTo),
      status: "paid",
      notes: notes
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
      const validUntil = new Date(today);
      
      // Sử dụng số buổi tùy chỉnh nếu có, ngược lại sử dụng mặc định
      const numClasses = customSessions > 0 ? customSessions : 
                         paymentCycle === "8-buoi" ? 8 : 10;
      
      // Giả sử mỗi tuần học 2 buổi, nên chia số buổi cho 2 để ra số tuần
      const weeksNeeded = numClasses / 2;
      validUntil.setDate(validUntil.getDate() + (weeksNeeded * 7));
      
      return formatDate(validUntil);
    } 
    // Với chu kỳ theo ngày: ngày đến = ngày bắt đầu
    else if (paymentCycle === "theo-ngay") {
      const validUntil = new Date(today);
      
      // Nếu có số buổi tùy chỉnh và lớn hơn 1, tính ngày hết hạn dựa trên số buổi
      if (customSessions > 1) {
        validUntil.setDate(validUntil.getDate() + (customSessions - 1));
        return formatDate(validUntil);
      }
      
      // Mặc định cho chu kỳ theo ngày là cùng ngày
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
    // Use custom amount if set, otherwise use calculated amount
    const amount = customAmount > 0 ? customAmount : getFeeAmount();
    
    if (isNaN(amount) || amount === 0) return "không đồng";
    return numberToWords(amount) + " đồng";
  };

  // Search for student by code
  const handleSearchStudent = () => {
    if (!searchCode) {
      toast({
        title: "Vui lòng nhập mã học sinh",
        description: "Bạn cần nhập mã học sinh để tìm kiếm",
        variant: "destructive",
      });
      return;
    }
    
    // Implement search functionality here
    // This would typically make a query to the server to find student by code
    // For this implementation we'll just show a message
    toast({
      title: "Tìm kiếm học sinh",
      description: `Đang tìm kiếm học sinh với mã: ${searchCode}`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Biên nhận thanh toán</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="receipt" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-2">
            <TabsTrigger value="receipt">Biên nhận</TabsTrigger>
            <TabsTrigger value="settings">Điều chỉnh</TabsTrigger>
            <TabsTrigger value="search">Tìm kiếm</TabsTrigger>
          </TabsList>
          
          {/* Tab biên nhận */}
          <TabsContent value="receipt">
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
                <span className="font-medium">Đã nhận số tiền:</span> {formatCurrency(customAmount > 0 ? customAmount : getFeeAmount())} 
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
              {customSessions > 0 && (
                <p className="text-sm mb-1">
                  <span className="font-medium">Số buổi:</span> {customSessions} buổi
                </p>
              )}
              
              {/* Hiển thị lịch sử thanh toán nếu có */}
              {payments && Array.isArray(payments) && payments.length > 0 && (
                <div className="text-sm mb-4 mt-2 border-t pt-2">
                  <p className="font-medium">Lịch sử thanh toán:</p>
                  <div className="grid grid-cols-1 gap-1 mt-1">
                    {payments.slice(0, 3).map((p: any, index: number) => (
                      <p key={index} className="text-xs">
                        {formatDate(p.paymentDate)}: Đã thanh toán {formatCurrency(p.amount)}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              
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
          </TabsContent>
          
          {/* Tab điều chỉnh */}
          <TabsContent value="settings">
            <div className="space-y-4 p-2">
              <div className="grid gap-2">
                <Label htmlFor="amount">Số tiền (VND)</Label>
                <Input 
                  id="amount" 
                  type="number" 
                  value={customAmount || ""}
                  onChange={(e) => setCustomAmount(Number(e.target.value))} 
                  placeholder="Nhập số tiền thanh toán" 
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {getAmountInWords()}
                </p>
              </div>
              
              {(student?.paymentCycle === '8-buoi' || 
                student?.paymentCycle === '10-buoi' || 
                student?.paymentCycle === 'theo-ngay') && (
                <div className="grid gap-2">
                  <Label htmlFor="sessions">Số buổi</Label>
                  <Input 
                    id="sessions" 
                    type="number" 
                    value={customSessions || ""}
                    onChange={(e) => setCustomSessions(Number(e.target.value))} 
                    placeholder="Nhập số buổi" 
                  />
                </div>
              )}
              
              <div className="grid gap-2">
                <Label htmlFor="paymentDate">Ngày thanh toán</Label>
                <Input 
                  id="paymentDate" 
                  type="date" 
                  value={paymentDate.toISOString().split('T')[0]} 
                  onChange={(e) => setPaymentDate(new Date(e.target.value))} 
                />
              </div>
              
              <div className="border rounded-lg p-3 space-y-2">
                <h3 className="font-medium">Lịch sử thanh toán</h3>
                {payments && Array.isArray(payments) && payments.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ngày</TableHead>
                        <TableHead>Số tiền</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment: any) => (
                        <TableRow key={payment.id}>
                          <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                          <TableCell>{formatCurrency(payment.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">Chưa có lịch sử thanh toán</p>
                )}
              </div>
              
              <div className="border rounded-lg p-3 space-y-2">
                <h3 className="font-medium">Điểm danh gần đây</h3>
                {attendance && Array.isArray(attendance) && attendance.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ngày</TableHead>
                        <TableHead>Trạng thái</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendance.slice(0, 5).map((record: any) => (
                        <TableRow key={record.id}>
                          <TableCell>{formatDate(record.date)}</TableCell>
                          <TableCell>
                            {record.status === 'present' ? 'Có mặt' : 
                             record.status === 'absent' ? 'Vắng mặt' : 'Giáo viên nghỉ'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">Chưa có dữ liệu điểm danh</p>
                )}
              </div>
              
              <Button 
                onClick={() => setActiveTab("receipt")} 
                className="w-full"
              >
                Xem biên nhận
              </Button>
            </div>
          </TabsContent>
          
          {/* Tab tìm kiếm */}
          <TabsContent value="search">
            <div className="space-y-4 p-2">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label htmlFor="searchCode" className="mb-2 block">Mã học sinh</Label>
                  <Input 
                    id="searchCode" 
                    value={searchCode} 
                    onChange={(e) => setSearchCode(e.target.value)}
                    placeholder="Nhập mã học sinh" 
                  />
                </div>
                <Button onClick={handleSearchStudent}>
                  <Search className="h-4 w-4 mr-2" />
                  Tìm kiếm
                </Button>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Tìm kiếm học sinh theo mã để tạo biên nhận thanh toán.
              </p>
            </div>
          </TabsContent>
        </Tabs>
        
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
