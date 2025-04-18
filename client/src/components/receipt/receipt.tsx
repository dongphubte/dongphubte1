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
import { formatCurrency, calculateFeeByPaymentCycle, formatPaymentCycle, formatAttendanceStatus, capitalizeFirstLetter, summarizeAttendance } from "@/utils/format";
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
      
      // Lấy tất cả CSS hiện tại của trang để áp dụng vào bản in
      const stylesheets = Array.from(document.styleSheets);
      let cssText = '';
      
      // Lấy CSS từ các stylesheet external 
      stylesheets.forEach(sheet => {
        if (sheet.href) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = sheet.href;
          printWindow.document.head.appendChild(link);
        } else {
          try {
            // Lấy CSS nội bộ
            Array.from(sheet.cssRules || []).forEach(rule => {
              cssText += rule.cssText + '\n';
            });
          } catch (e) {
            console.warn('Không thể truy cập cssRules của stylesheet:', e);
          }
        }
      });

      printWindow.document.write(`
        <html>
          <head>
            <title>Biên nhận - ${student?.name} - ${formatDate(paymentDate)}</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
              
              body { 
                font-family: 'Inter', sans-serif;
                padding: 20px;
                margin: 0;
                background-color: white;
              }
              
              * {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              
              /* Các style cụ thể cho phần biên nhận */
              .border-4 { border-width: 4px; }
              .border-double { border-style: double; }
              .border-gray-300 { border-color: #d1d5db; }
              .rounded-lg { border-radius: 0.5rem; }
              .p-6 { padding: 1.5rem; }
              .bg-white { background-color: white; }
              
              /* Header */
              .text-center { text-align: center; }
              .mb-4 { margin-bottom: 1rem; }
              .pb-2 { padding-bottom: 0.5rem; }
              .border-b-2 { border-bottom-width: 2px; }
              .border-gray-200 { border-color: #e5e7eb; }
              
              /* Gradient backgrounds */
              .bg-gradient-to-r { background-image: linear-gradient(to right, var(--tw-gradient-stops)); }
              .from-blue-500 { --tw-gradient-from: #3b82f6; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(59, 130, 246, 0)); }
              .to-purple-500 { --tw-gradient-to: #8b5cf6; }
              .from-purple-500 { --tw-gradient-from: #8b5cf6; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(139, 92, 246, 0)); }
              .to-blue-500 { --tw-gradient-to: #3b82f6; }
              
              /* Text styles */
              .text-transparent { color: transparent; }
              .bg-clip-text { -webkit-background-clip: text; background-clip: text; }
              .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
              .text-2xl { font-size: 1.5rem; line-height: 2rem; }
              .font-bold { font-weight: 700; }
              .uppercase { text-transform: uppercase; }
              .tracking-wide { letter-spacing: 0.025em; }
              
              /* Content sections */
              .space-y-2 > * + * { margin-top: 0.5rem; }
              .mb-3 { margin-bottom: 0.75rem; }
              .text-right { text-align: right; }
              .italic { font-style: italic; }
              
              /* Grid */
              .grid { display: grid; }
              .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
              .grid-cols-5 { grid-template-columns: repeat(5, minmax(0, 1fr)); }
              .gap-1 { gap: 0.25rem; }
              .gap-2 { gap: 0.5rem; }
              
              /* Colors */
              .bg-gray-50 { background-color: #f9fafb; }
              .bg-blue-50 { background-color: #eff6ff; }
              .bg-green-100 { background-color: #d1fae5; }
              .bg-red-100 { background-color: #fee2e2; }
              .bg-yellow-100 { background-color: #fef3c7; }
              .bg-blue-100 { background-color: #dbeafe; }
              .bg-purple-100 { background-color: #ede9fe; }
              
              .text-green-600, .text-green-700 { color: #059669; }
              .text-red-600, .text-red-700 { color: #dc2626; }
              .text-yellow-600, .text-yellow-700 { color: #d97706; }
              .text-blue-600, .text-blue-700 { color: #2563eb; }
              .text-purple-600, .text-purple-700 { color: #7c3aed; }
              
              /* Additional styles */
              .flex { display: flex; }
              .justify-center { justify-content: center; }
              .justify-between { justify-content: space-between; }
              .items-center { align-items: center; }
              .shadow-sm { box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
              .rounded { border-radius: 0.25rem; }
              .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
              .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
              
              /* Typography */
              .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
              .text-xs { font-size: 0.75rem; line-height: 1rem; }
              .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
              .font-medium { font-weight: 500; }
              .font-semibold { font-weight: 600; }
              
              ${cssText}
            </style>
          </head>
          <body>
            <div class="receipt">
              ${printContent.outerHTML}
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
      // Đảm bảo tất cả phần tử trong receiptRef đều hiển thị
      const receiptElement = receiptRef.current;
      
      // Tạo canvas với cài đặt nâng cao
      const canvas = await html2canvas(receiptElement, {
        scale: 3, // Tăng scale để có chất lượng hình ảnh cao hơn
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true, // Cho phép tải tài nguyên từ các domain khác
        allowTaint: true, // Cho phép vẽ các tài nguyên có thể bị "tainted"
        width: receiptElement.offsetWidth,
        height: receiptElement.offsetHeight,
        
        // Đảm bảo tất cả pseudo-elements (như ::before, ::after) được render
        onclone: (documentClone, element) => {
          // Đảm bảo gradient và các hiệu ứng khác được render
          const styles = document.createElement('style');
          Array.from(document.styleSheets).forEach(stylesheet => {
            try {
              Array.from(stylesheet.cssRules || []).forEach(rule => {
                styles.innerHTML += rule.cssText;
              });
            } catch (e) {
              console.warn('Không thể truy cập cssRules:', e);
            }
          });
          documentClone.head.appendChild(styles);
        }
      });
      
      const image = canvas.toDataURL('image/png', 1.0); // Chất lượng tối đa
      const link = document.createElement('a');
      link.href = image;
      link.download = `HoeEdu-Receipt-${student?.name}-${formatDate(paymentDate)}.png`;
      link.click();
      
      toast({
        title: "Xuất biên nhận thành công",
        description: "Biên nhận đã được lưu dưới dạng hình ảnh với chất lượng cao",
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
            <div ref={receiptRef} className="border-4 border-double border-gray-300 p-6 rounded-lg bg-white">
              {/* Header có hoa văn trang trí */}
              <div className="text-center mb-4 pb-2 border-b-2 border-gray-200">
                <div className="flex justify-center mb-1">
                  <div className="h-1 w-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mb-1"></div>
                </div>
                <p className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">HoeEdu Solution</p>
                <p className="text-sm text-neutral-500">0985970322</p>
                <h3 className="text-2xl font-bold mt-2 uppercase tracking-wide">Biên Nhận</h3>
                <div className="flex justify-center mt-1">
                  <div className="h-1 w-24 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"></div>
                </div>
              </div>
              
              {/* Nội dung biên nhận */}
              <div className="space-y-2 mb-4">
                <p className="text-sm text-right italic mb-3">
                  Ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
                </p>
                
                <div className="bg-gray-50 p-3 rounded-lg mb-3 shadow-sm">
                  <p className="text-sm mb-1">
                    <span className="font-medium">Đã nhận số tiền:</span> <span className="font-bold text-lg">{formatCurrency(customAmount > 0 ? customAmount : getFeeAmount())}</span>
                  </p>
                  <p className="text-sm mb-1">
                    <span className="font-medium">Bằng chữ:</span> <span className="italic">{capitalizeFirstLetter(getAmountInWords())}</span>
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="col-span-2 sm:col-span-1">
                    <p className="text-sm mb-1">
                      <span className="font-medium">Học sinh:</span> <span className="font-semibold">{student?.name}</span>
                    </p>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <p className="text-sm mb-1">
                      <span className="font-medium">Mã học sinh:</span> <span className="font-semibold">{student?.code}</span>
                    </p>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <p className="text-sm mb-1">
                      <span className="font-medium">Lớp:</span> <span>{student?.className}</span>
                    </p>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <p className="text-sm mb-1">
                      <span className="font-medium">Chu kỳ thanh toán:</span> <span>{formatPaymentCycle(student?.paymentCycle || "1-thang")}</span>
                    </p>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-2 bg-blue-50">
                  <p className="text-sm mb-1">
                    <span className="font-medium">Học phí tính từ ngày:</span> <span className="font-semibold">{formatDate(paymentDate)}</span> đến ngày <span className="font-semibold">{getValidUntilDate()}</span>
                  </p>
                  {customSessions > 0 && (
                    <p className="text-sm mb-1">
                      <span className="font-medium">Số buổi:</span> <span className="font-semibold">{customSessions} buổi</span>
                    </p>
                  )}
                </div>
              </div>
              
              {/* Thống kê điểm danh */}
              {attendance && Array.isArray(attendance) && attendance.length > 0 && (
                <div className="border border-gray-200 rounded-lg bg-gray-50 p-3 space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">Thống kê điểm danh</h4>
                    <span className="text-xs text-gray-500">(Chu kỳ hiện tại)</span>
                  </div>
                  
                  {/* Hiển thị thống kê tổng hợp */}
                  {(() => {
                    const stats = summarizeAttendance(attendance);
                    return (
                      <div className="grid grid-cols-5 gap-1 text-center">
                        <div className="bg-green-100 rounded p-1">
                          <p className="text-xs font-medium text-green-700">Có mặt</p>
                          <p className="text-sm font-bold">{stats.present}</p>
                        </div>
                        <div className="bg-red-100 rounded p-1">
                          <p className="text-xs font-medium text-red-700">Vắng mặt</p>
                          <p className="text-sm font-bold">{stats.absent}</p>
                        </div>
                        <div className="bg-yellow-100 rounded p-1">
                          <p className="text-xs font-medium text-yellow-700">GV nghỉ</p>
                          <p className="text-sm font-bold">{stats.teacherAbsent}</p>
                        </div>
                        <div className="bg-blue-100 rounded p-1">
                          <p className="text-xs font-medium text-blue-700">Học bù</p>
                          <p className="text-sm font-bold">{stats.makeup}</p>
                        </div>
                        <div className="bg-purple-100 rounded p-1">
                          <p className="text-xs font-medium text-purple-700">Tổng</p>
                          <p className="text-sm font-bold">{stats.total}</p>
                        </div>
                      </div>
                    );
                  })()}
                  
                  {/* Chi tiết điểm danh gần đây */}
                  <div className="mt-2">
                    <p className="text-xs font-medium mb-1">Chi tiết điểm danh gần đây:</p>
                    <div className="grid grid-cols-2 gap-1 mt-1">
                      {attendance.slice(0, 6).map((a: any, index: number) => (
                        <p key={index} className="text-xs flex justify-between bg-white px-2 py-1 rounded">
                          <span>{formatDate(a.date)}:</span>
                          <span className={
                            a.status === 'present' ? 'text-green-600' : 
                            a.status === 'absent' ? 'text-red-600' : 
                            a.status === 'makeup' ? 'text-blue-600' : 'text-yellow-600'
                          }>
                            {formatAttendanceStatus(a.status)}
                          </span>
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Lịch sử thanh toán */}
              {payments && Array.isArray(payments) && payments.length > 0 && (
                <div className="border border-gray-200 rounded-lg bg-gray-50 p-3 space-y-2 mb-4">
                  <h4 className="font-semibold text-sm">Lịch sử thanh toán</h4>
                  <div className="grid grid-cols-1 gap-1 mt-1">
                    {payments.slice(0, 3).map((p: any, index: number) => (
                      <div key={index} className="text-xs flex justify-between bg-white px-2 py-1 rounded">
                        <span>{formatDate(p.paymentDate)}</span>
                        <span className="font-medium">{formatCurrency(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Footer */}
              <div className="border-t border-gray-200 pt-3 mt-4">
                <p className="text-sm mb-2 text-center italic">Phụ huynh vui lòng kiểm tra kỹ số tiền và ngày học của con</p>
                
                <div className="text-right">
                  <p className="text-sm mb-1">Chân thành cảm ơn</p>
                  <p className="font-medium">Trần Đông Phú</p>
                </div>
                
                <div className="flex justify-center mt-3">
                  <div className="h-1 w-32 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                </div>
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
