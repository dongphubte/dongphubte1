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
  const { data: payments, isLoading: isLoadingPayments } = useQuery({
    queryKey: ["/api/payments/student", student?.id],
    queryFn: async () => {
      console.log("Fetching payments for student ID:", student?.id);
      const response = await fetch(`/api/payments/student/${student?.id}`);
      if (!response.ok) throw new Error("Failed to fetch payment data");
      const data = await response.json();
      console.log("Received payment data:", data);
      return data;
    },
    enabled: !!student?.id,
  });
  
  // Hàm tạo mã biên nhận: <Năm hiện tại><Lớp><Số thứ tự>
  const generateReceiptNumber = () => {
    const currentYear = new Date().getFullYear();
    
    // Lấy số lớp từ tên lớp (ví dụ: Lớp 8CT -> 08CT, Lớp 12G -> 12G)
    let classNumber = "00";
    if (classData?.name) {
      // Loại bỏ từ "Lớp" (nếu có) và chỉ lấy số/chữ còn lại
      const match = classData.name.match(/Lớp\s+(\w+)/i);
      if (match && match[1]) {
        // Kiểm tra nếu số lớp là số nguyên < 10 thì thêm số 0 phía trước
        const classValue = match[1];
        // Nếu chuỗi bắt đầu bằng một số từ 1-9
        if (/^[1-9]/.test(classValue)) {
          const numberPart = parseInt(classValue.match(/^\d+/)[0], 10);
          if (numberPart < 10) {
            // Thay thế số lớp bằng phiên bản có thêm số 0 ở đầu
            classNumber = classValue.replace(/^\d+/, "0" + numberPart);
          } else {
            classNumber = classValue;
          }
        } else {
          classNumber = classValue;
        }
      } else {
        // Nếu không có từ "Lớp", sử dụng toàn bộ tên lớp
        classNumber = classData.name;
      }
    }
    
    // Lấy số thứ tự dựa trên số lượng thanh toán hiện có + 1
    const paymentCount = payments?.length || 0;
    const sequenceNumber = String(paymentCount + 1).padStart(3, '0'); // Định dạng 001, 002, v.v.
    
    return `${currentYear}${classNumber}${sequenceNumber}`;
  };
  
  // Get attendance info
  const { data: attendance, isLoading: isLoadingAttendance } = useQuery({
    queryKey: ["/api/attendance/student", student?.id],
    queryFn: async () => {
      console.log("Fetching attendance for student ID:", student?.id);
      const response = await fetch(`/api/attendance/student/${student?.id}`);
      if (!response.ok) throw new Error("Failed to fetch attendance data");
      const data = await response.json();
      console.log("Received attendance data:", data);
      return data;
    },
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
              
              /* Các style cho mẫu biên nhận mới */
              .border { border-width: 1px; }
              .border-gray-300 { border-color: #d1d5db; }
              .rounded-lg { border-radius: 0.5rem; }
              .p-6 { padding: 1.5rem; }
              .bg-white { background-color: white; }
              
              /* Header */
              .text-center { text-align: center; }
              .mb-4 { margin-bottom: 1rem; }
              .mb-2 { margin-bottom: 0.5rem; }
              .pb-1 { padding-bottom: 0.25rem; }
              .relative { position: relative; }
              .inline-block { display: inline-block; }
              .absolute { position: absolute; }
              .bottom-0 { bottom: 0; }
              .left-0 { left: 0; }
              .right-0 { right: 0; }
              .h-1 { height: 0.25rem; }
              .bg-indigo-500 { background-color: #6366f1; }
              
              /* Styles for payment period section */
              .blue-box { 
                background-color: #eff6ff; 
                padding: 1rem; 
                border-radius: 0.5rem; 
                margin-bottom: 1rem;
              }
              .blue-title {
                display: flex;
                align-items: center;
                margin-bottom: 0.5rem;
                font-weight: bold;
                color: #1e40af;
              }
              .blue-icon {
                width: 2rem;
                height: 2rem;
                border-radius: 9999px;
                background-color: #2563eb;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                margin-right: 0.5rem;
              }
              .next-payment {
                color: #1e40af;
                font-weight: bold;
              }
              .next-payment-date {
                color: #1e40af;
                font-weight: bold;
              }
              .warning-text {
                margin-top: 0.5rem;
                color: #d97706;
                font-weight: 500;
              }
              
              /* Text styles */
              .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
              .text-2xl { font-size: 1.5rem; line-height: 2rem; }
              .text-indigo-600 { color: #4f46e5; }
              .text-gray-500 { color: #6b7280; }
              .font-bold { font-weight: 700; }
              .uppercase { text-transform: uppercase; }
              
              /* Content sections */
              .text-right { text-align: right; }
              .italic { font-style: italic; }
              
              /* Grid */
              .grid { display: grid; }
              .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
              .grid-cols-5 { grid-template-columns: repeat(5, minmax(0, 1fr)); }
              .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
              .gap-1 { gap: 0.25rem; }
              .gap-4 { gap: 1rem; }
              
              /* Colors */
              .bg-green-50 { background-color: #f0fdf4; }
              .bg-blue-50 { background-color: #eff6ff; }
              .bg-green-100 { background-color: #dcfce7; }
              .bg-red-100 { background-color: #fee2e2; }
              .bg-yellow-100 { background-color: #fef9c3; }
              .bg-blue-100 { background-color: #dbeafe; }
              .bg-purple-100 { background-color: #f3e8ff; }
              
              .text-green-600, .text-green-700 { color: #16a34a; }
              .text-red-600, .text-red-700 { color: #dc2626; }
              .text-yellow-600, .text-yellow-700 { color: #ca8a04; }
              .text-blue-600, .text-blue-700 { color: #2563eb; }
              .text-purple-600, .text-purple-700 { color: #9333ea; }
              
              /* Additional styles */
              .flex { display: flex; }
              .justify-center { justify-content: center; }
              .justify-between { justify-content: space-between; }
              .items-center { align-items: center; }
              .items-start { align-items: flex-start; }
              .text-left { text-align: left; }
              .flex-1 { flex: 1 1 0%; }
              .rounded { border-radius: 0.25rem; }
              .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
              .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
              .p-4 { padding: 1rem; }
              .mt-6 { margin-top: 1.5rem; }
              .mt-2 { margin-top: 0.5rem; }
              .mt-1 { margin-top: 0.25rem; }
              .mb-1 { margin-bottom: 0.25rem; }
              
              /* Typography */
              .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
              .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
              .font-medium { font-weight: 500; }
              .font-semibold { font-weight: 600; }
              .mt-3 { margin-top: 0.75rem; }
              
              /* Borders */
              .border-gray-100 { border-color: #f3f4f6; }
              
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
    
    // Kiểm tra xem có thanh toán trước hay không (nếu paymentDate lớn hơn ngày hiện tại)
    const currentDate = new Date();
    const isPrepayment = paymentDate > currentDate;
    
    // Calculate validTo based on payment cycle
    if (student.paymentCycle === "1-thang") {
      validTo.setMonth(validTo.getMonth() + 1);
      // Trừ đi 1 ngày để lấy chính xác 1 tháng (vd: 15/4 -> 14/5)
      validTo.setDate(validTo.getDate() - 1);
    } else if (student.paymentCycle === "theo-ngay") {
      // Nếu theo ngày: Thiết lập ngày hết hạn là 30 ngày sau ngày bắt đầu
      // Đây là để tránh hiển thị "Quá hạn thanh toán" ngay sau khi thanh toán
      validTo.setDate(validTo.getDate() + 30);
      
      if (customSessions > 1) {
        // Nếu đóng nhiều ngày, ghi lại số buổi trong ghi chú
        notes += ` (${customSessions} buổi)`;
      }
    } else if (student.paymentCycle === "8-buoi" || student.paymentCycle === "10-buoi") {
      // Tính dựa trên số buổi tùy chỉnh nếu có, ngược lại sử dụng mặc định
      const numClasses = customSessions > 0 ? customSessions : 
                        student.paymentCycle === "8-buoi" ? 8 : 10;
      
      // Theo yêu cầu, với 8 buổi và mỗi tuần học 7 ngày, thì đủ 8 buổi mất khoảng 2 ngày
      // Vì mỗi ngày có thể học 1 buổi, nên tổng cộng cần numClasses ngày
      validTo.setDate(validTo.getDate() + (numClasses - 1)); // -1 vì ngày đầu tiên cũng tính là 1 buổi
      
      // Cập nhật ghi chú
      if (customSessions > 0 && customSessions !== (student.paymentCycle === "8-buoi" ? 8 : 10)) {
        notes += ` (${customSessions} buổi)`;
      }
    } else {
      // Mặc định thêm 1 tháng
      validTo.setMonth(validTo.getMonth() + 1);
    }
    
    // Nếu thanh toán trước, thêm ghi chú "dự kiến"
    if (isPrepayment) {
      notes += " (dự kiến)";
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
        
        // Cải thiện chất lượng render cho thiết kế mới
        onclone: (documentClone, element) => {
          // Đảm bảo tất cả CSS được áp dụng đúng cách
          const styles = document.createElement('style');
          
          // Thêm CSS cần thiết cho thiết kế mới
          styles.innerHTML = `
            .text-indigo-600 { color: #4f46e5 !important; }
            .bg-indigo-500 { background-color: #6366f1 !important; }
            .bg-green-50 { background-color: #f0fdf4 !important; }
            .bg-blue-50 { background-color: #eff6ff !important; }
            .bg-green-100 { background-color: #dcfce7 !important; }
            .bg-red-100 { background-color: #fee2e2 !important; }
            .bg-yellow-100 { background-color: #fef9c3 !important; }
            .bg-blue-100 { background-color: #dbeafe !important; }
            .bg-purple-100 { background-color: #f3e8ff !important; }
            
            .text-green-600, .text-green-700 { color: #16a34a !important; }
            .text-red-600, .text-red-700 { color: #dc2626 !important; }
            .text-yellow-600, .text-yellow-700 { color: #ca8a04 !important; }
            .text-blue-600, .text-blue-700 { color: #2563eb !important; }
            .text-purple-600, .text-purple-700 { color: #9333ea !important; }
            
            .border { border-width: 1px; border-style: solid; }
            .border-gray-300 { border-color: #d1d5db; }
            .border-gray-100 { border-color: #f3f4f6; }
            
            .rounded-lg { border-radius: 0.5rem; }
            .rounded { border-radius: 0.25rem; }
            
            /* Đảm bảo vị trí absolute hoạt động đúng */
            .relative { position: relative; }
            .absolute { position: absolute; }
            .bottom-0 { bottom: 0; }
            .left-0 { left: 0; }
            .right-0 { right: 0; }
          `;
          
          // Thêm tất cả CSS từ stylesheet hiện tại
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
          
          // Đảm bảo tất cả phần tử hiển thị đúng
          const allElements = element.querySelectorAll('*');
          allElements.forEach(el => {
            if (el instanceof HTMLElement) {
              // Đảm bảo tất cả phần tử đều hiển thị
              if (window.getComputedStyle(el).display === 'none') {
                el.style.display = 'block';
              }
            }
          });
          
          // Đảm bảo số biên nhận được hiển thị đúng
          const receiptNumberElements = element.querySelectorAll('.receipt-number');
          receiptNumberElements.forEach(el => {
            if (el instanceof HTMLElement && !el.textContent) {
              el.textContent = generateReceiptNumber();
            }
          });
        }
      });
      
      const image = canvas.toDataURL('image/png', 1.0); // Chất lượng tối đa
      const link = document.createElement('a');
      link.href = image;
      link.download = `HoeEdu-Receipt-${student?.name}-${formatDate(paymentDate)}.png`;
      link.click();
      
      toast({
        title: "Xuất biên nhận thành công",
        description: "Biên nhận đã được lưu dưới dạng hình ảnh với định dạng mới",
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
    
    // Kiểm tra xem có thanh toán trước hay không (nếu paymentDate lớn hơn ngày hiện tại)
    const currentDate = new Date();
    const isPrepayment = paymentDate > currentDate;
    let validUntilText = "";
    
    // Với chu kỳ theo tháng: cộng thêm 1 tháng
    if (paymentCycle === "1-thang") {
      const validUntil = new Date(today);
      validUntil.setMonth(validUntil.getMonth() + 1);
      // Trừ đi 1 ngày để lấy chính xác 1 tháng (vd: 15/4 -> 14/5)
      validUntil.setDate(validUntil.getDate() - 1);
      validUntilText = formatDate(validUntil);
    } 
    // Với chu kỳ theo buổi: học đủ số buổi mới tính hết chu kỳ
    else if (paymentCycle === "8-buoi" || paymentCycle === "10-buoi") {
      const validUntil = new Date(today);
      
      // Sử dụng số buổi tùy chỉnh nếu có, ngược lại sử dụng mặc định
      const numClasses = customSessions > 0 ? customSessions : 
                         paymentCycle === "8-buoi" ? 8 : 10;
      
      // Theo yêu cầu, với 8 buổi hoặc 10 buổi, mỗi ngày có thể học 1 buổi
      // Nên tổng cộng cần numClasses ngày để hoàn thành
      validUntil.setDate(validUntil.getDate() + (numClasses - 1)); // -1 vì ngày đầu tiên đã tính 1 buổi
      
      validUntilText = formatDate(validUntil);
    } 
    // Với chu kỳ theo ngày: ngày đến = ngày bắt đầu
    else if (paymentCycle === "theo-ngay") {
      const validUntil = new Date(today);
      
      // Nếu có số buổi tùy chỉnh và lớn hơn 1, tính ngày hết hạn dựa trên số buổi
      if (customSessions > 1) {
        validUntil.setDate(validUntil.getDate() + (customSessions - 1));
        validUntilText = formatDate(validUntil);
      } else {
        // Mặc định cho chu kỳ theo ngày là cùng ngày
        validUntilText = formatDate(today);
      }
    }
    
    // Nếu thanh toán trước, thêm "(dự kiến)"
    if (isPrepayment) {
      validUntilText += " (dự kiến)";
    }
    
    return validUntilText;
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
            <div ref={receiptRef} className="border border-gray-300 p-6 rounded-lg bg-white">
              {/* Header mới theo mẫu */}
              <div className="text-center mb-4">
                <p className="font-bold text-xl text-indigo-600">HoeEdu Solution</p>
                <p className="text-sm text-gray-500 mb-2">0985970322</p>
                <h3 className="text-2xl font-bold uppercase relative inline-block pb-1">
                  BIÊN NHẬN
                  <span className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500"></span>
                </h3>
                <p className="text-lg font-medium mt-3">No. <span className="font-bold receipt-number">{generateReceiptNumber()}</span></p>
              </div>
              
              {/* Ngày tháng */}
              <div className="text-right mb-4">
                <p className="text-sm">
                  Ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
                </p>
              </div>
              
              {/* Thông tin số tiền */}
              <div className="bg-green-50 p-4 rounded-lg mb-4">
                <p className="font-medium mb-1">
                  Đã nhận số tiền: <span className="font-bold">{formatCurrency(customAmount > 0 ? customAmount : getFeeAmount())}</span>
                </p>
                <p className="mb-1">
                  Bằng chữ: <span className="italic">{capitalizeFirstLetter(getAmountInWords())}</span>
                </p>
              </div>
              
              {/* Thông tin học sinh */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p>Học sinh: <span className="font-semibold">{student?.name}</span></p>
                </div>
                <div>
                  <p>Mã học sinh: <span className="font-semibold">{student?.code}</span></p>
                </div>
                <div>
                  <p>Lớp: <span className="font-semibold">{classData?.name || 'Chưa xác định'}</span></p>
                </div>
                <div>
                  <p>Chu kỳ thanh toán: <span className="font-semibold">{formatPaymentCycle(student?.paymentCycle || "1-thang")}</span></p>
                </div>
              </div>
              
              {/* Thời hạn học phí */}
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                  </div>
                  <h4 className="font-bold text-blue-800">Thời hạn & chu kỳ thanh toán</h4>
                </div>
                
                <p className="mb-2">
                  Học phí tính từ ngày: <span className="font-semibold">{formatDate(paymentDate)}</span> đến ngày <span className="font-semibold">{getValidUntilDate().split(" ")[0]}</span>
                </p>
                
                <p className="mb-2">
                  <span className="font-bold text-blue-700">Chu kỳ thanh toán tiếp theo:</span> <span className="font-semibold text-blue-800">{getValidUntilDate()}</span>
                </p>
                
                {customSessions > 0 && (
                  <p className="mt-1">
                    Số buổi: <span className="font-semibold">{customSessions} buổi</span>
                  </p>
                )}
                
                {/* Thông tin chu kỳ thanh toán tiếp theo */}
                {student?.paymentCycle && student.paymentCycle.includes("buoi") && (
                  <p className="mt-2 text-amber-600 font-medium">
                    Lưu ý: Ngày đến hạn dự kiến (có thể thay đổi tùy theo lịch học thực tế)
                  </p>
                )}
              </div>
              
              {/* Thống kê điểm danh */}
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Thống kê điểm danh</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  {!isLoadingAttendance && attendance && Array.isArray(attendance) ? (
                    <>
                      {/* Hiển thị thống kê tổng hợp */}
                      {(() => {
                        // Thống kê theo các loại điểm danh
                        const stats = summarizeAttendance(attendance);
                        return (
                          <div className="grid grid-cols-5 gap-1 text-center mb-3">
                            <div className="bg-green-100 rounded p-2">
                              <p className="text-sm font-medium text-green-700">Có mặt</p>
                              <p className="font-bold">{stats.present}</p>
                            </div>
                            <div className="bg-red-100 rounded p-2">
                              <p className="text-sm font-medium text-red-700">Vắng mặt</p>
                              <p className="font-bold">{stats.absent}</p>
                            </div>
                            <div className="bg-yellow-100 rounded p-2">
                              <p className="text-sm font-medium text-yellow-700">GV nghỉ</p>
                              <p className="font-bold">{stats.teacherAbsent}</p>
                            </div>
                            <div className="bg-blue-100 rounded p-2">
                              <p className="text-sm font-medium text-blue-700">Học bù</p>
                              <p className="font-bold">{stats.makeup}</p>
                            </div>
                            <div className="bg-purple-100 rounded p-2">
                              <p className="text-sm font-medium text-purple-700">Tổng</p>
                              <p className="font-bold">{stats.total}</p>
                            </div>
                          </div>
                        );
                      })()}
                      
                      {/* Bảng thông tin chi tiết điểm danh */}
                      {attendance.length > 0 ? (
                        <>

                          
                          {/* Chi tiết điểm danh */}
                          <div className="mt-2 border-t border-gray-200 pt-2">
                            <p className="text-sm font-medium mb-1">Chi tiết điểm danh:</p>
                            <div className="grid grid-cols-3 gap-2">
                              {attendance.slice(0, 9).map((a: any, index: number) => {
                                const statusClass = 
                                  a.status === 'present' ? 'bg-green-100 text-green-700' : 
                                  a.status === 'absent' ? 'bg-red-100 text-red-700' : 
                                  a.status === 'makeup' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700';
                                
                                return (
                                  <div 
                                    key={index} 
                                    className={`${statusClass} rounded p-2 text-center border-t-2 border-${
                                      a.status === 'present' ? 'green' : 
                                      a.status === 'absent' ? 'red' : 
                                      a.status === 'makeup' ? 'blue' : 'yellow'
                                    }-400`}
                                  >
                                    <p className="text-xs font-medium mb-1">{formatDate(new Date(a.date))}</p>
                                    <p className="text-sm font-bold">{formatAttendanceStatus(a.status)}</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      ) : (
                        <p className="text-center text-sm text-gray-500 py-2">Chưa có dữ liệu điểm danh</p>
                      )}
                    </>
                  ) : isLoadingAttendance ? (
                    <div className="flex justify-center items-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
                      <span className="text-sm text-muted-foreground">Đang tải dữ liệu điểm danh...</span>
                    </div>
                  ) : (
                    <p className="text-center text-sm text-gray-500 py-2">Chưa có dữ liệu điểm danh</p>
                  )}
                </div>
              </div>
              
              {/* Lịch sử thanh toán */}
              {!isLoadingPayments && payments && Array.isArray(payments) && payments.length > 0 ? (
                <div className="mb-4">
                  <h4 className="font-semibold mb-2">Lịch sử thanh toán</h4>
                  <div className="grid grid-cols-1 gap-1">
                    {payments.slice(0, 3).map((p: any, index: number) => (
                      <div key={index} className="flex justify-between bg-white px-3 py-2 rounded border border-gray-100">
                        <span>{formatDate(new Date(p.paymentDate))}:</span>
                        <span className="font-medium">{formatCurrency(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : isLoadingPayments ? (
                <div className="flex justify-center items-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
                  <span className="text-sm text-muted-foreground">Đang tải lịch sử thanh toán...</span>
                </div>
              ) : null}
              
              {/* Footer */}
              <div className="mt-6">
                <p className="text-left italic mb-4">Phụ huynh vui lòng kiểm tra kỹ số tiền và ngày học của con</p>
                
                <div className="text-right">
                  <p className="mb-1">Chân thành cảm ơn</p>
                  <p className="font-medium">Trần Đông Phú</p>
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
                {!isLoadingPayments && payments && Array.isArray(payments) && payments.length > 0 ? (
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
                          <TableCell>{formatDate(new Date(payment.paymentDate))}</TableCell>
                          <TableCell>{formatCurrency(payment.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : isLoadingPayments ? (
                  <div className="flex justify-center items-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
                    <span className="text-sm text-muted-foreground">Đang tải lịch sử thanh toán...</span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Chưa có lịch sử thanh toán</p>
                )}
              </div>
              
              <div className="border rounded-lg p-3 space-y-2">
                <h3 className="font-medium">Điểm danh gần đây</h3>
                {!isLoadingAttendance && attendance && Array.isArray(attendance) && attendance.length > 0 ? (
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
                          <TableCell>{formatDate(new Date(record.date))}</TableCell>
                          <TableCell>
                            {formatAttendanceStatus(record.status)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : isLoadingAttendance ? (
                  <div className="flex justify-center items-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
                    <span className="text-sm text-muted-foreground">Đang tải dữ liệu điểm danh...</span>
                  </div>
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
