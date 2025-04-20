import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/utils/format";
import { formatDate } from "@/utils/date-utils";
import { Search, QrCode, User, Calendar, Phone, AlertCircle, CreditCard, Clock, Check, X, Info, RefreshCw, Download } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

// Hàm loại bỏ dấu tiếng Việt
function removeVietnameseAccents(str: string): string {
  if (!str) return '';
  
  return str
    .normalize('NFD') // Chuyển đổi về dạng tách các ký tự và dấu
    .replace(/[\u0300-\u036f]/g, '') // Loại bỏ các dấu
    .replace(/[đĐ]/g, (m) => m === 'đ' ? 'd' : 'D'); // Chuyển đổi đ và Đ
}

// Hàm tạo nội dung QR code cho thanh toán theo chuẩn VietQR
function generateTransferContent(bankAccount: string, bankName: string, accountName: string, amount: number, description: string): string {
  // Format theo chuẩn để ứng dụng ngân hàng có thể đọc
  return `${bankName}|${bankAccount}|${accountName}|${amount}|${description}`;
}

// Hàm tạo URL của VietQR để hiển thị mã QR chuyển khoản ngân hàng
// Dựa theo hướng dẫn: https://www.vietqr.io/danh-sach-api/link-tao-ma-nhanh/
function generateVietQRUrl(
  bankBin: string,   // Mã ngân hàng (VD: 970422 cho MB Bank)
  accountNo: string, // Số tài khoản
  accountName: string = "", // Tên tài khoản (có thể để trống)
  amount: number = 0, // Số tiền (có thể để trống)
  description: string = "" // Nội dung chuyển khoản (có thể để trống)
): string {
  // Biến đổi các thông số để phù hợp với URL
  const encodedAccountName = encodeURIComponent(accountName);
  const encodedDescription = encodeURIComponent(description);
  
  // Tạo URL theo mẫu của VietQR.io
  return `https://img.vietqr.io/image/${bankBin}-${accountNo}-compact.png?amount=${amount}&addInfo=${encodedDescription}&accountName=${encodedAccountName}`;
}

export default function ParentPortal() {
  console.log("ParentPortal component loaded");
  const [studentCode, setStudentCode] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const {
    data: studentData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["/api/students/code", studentCode],
    queryFn: async () => {
      if (!studentCode) return null;
      const res = await fetch(`/api/students/code/${studentCode}`);
      if (!res.ok) {
        throw new Error("Không tìm thấy học sinh với mã này");
      }
      return res.json();
    },
    enabled: false,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
    refetch();
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "present":
        return "Có mặt";
      case "absent":
        return "Vắng mặt";
      case "teacher_absent":
        return "GV nghỉ";
      case "makeup":
        return "Học bù";
      default:
        return status;
    }
  };

  const getPaymentCycleText = (cycle: string) => {
    switch (cycle) {
      case "1-thang":
        return "1 tháng";
      case "8-buoi":
        return "8 buổi";
      case "10-buoi":
        return "10 buổi";
      case "theo-ngay":
        return "Theo ngày";
      default:
        return cycle;
    }
  };
  
  // Kiểm tra trạng thái thanh toán
  const checkPaymentStatus = () => {
    if (!studentData?.payments || studentData.payments.length === 0) {
      return {
        status: "unpaid",
        text: "Chưa thanh toán",
        color: "bg-orange-50 border-orange-200",
        textColor: "text-orange-700",
        badgeColor: "bg-orange-100 text-orange-800",
        icon: <Clock className="h-5 w-5 text-orange-500" />
      };
    }

    const latestPayment = studentData.payments.sort(
      (a: any, b: any) => new Date(b.validTo).getTime() - new Date(a.validTo).getTime()
    )[0];

    if (new Date(latestPayment.validTo) < new Date()) {
      return {
        status: "overdue",
        text: "Quá hạn thanh toán",
        color: "bg-red-50 border-red-200",
        textColor: "text-red-700",
        badgeColor: "bg-red-100 text-red-800",
        icon: <AlertCircle className="h-5 w-5 text-red-500" />
      };
    }

    return {
      status: "paid",
      text: "Đã thanh toán",
      color: "bg-green-50 border-green-200",
      textColor: "text-green-700",
      badgeColor: "bg-green-100 text-green-800",
      icon: <Check className="h-5 w-5 text-green-500" />
    };
  };
  
  // Tính toán chu kỳ thanh toán tiếp theo dựa trên chu kỳ hiện tại
  const calculateNextPaymentCycle = () => {
    if (!studentData?.student || !studentData?.class) return null;
    
    // Nếu chưa có thanh toán nào
    if (!studentData.payments || studentData.payments.length === 0) {
      return {
        from: new Date(),
        to: getEndDateForCycle(new Date(), studentData.student.paymentCycle)
      };
    }
    
    // Lấy thanh toán gần nhất
    const latestPayment = studentData.payments.sort(
      (a: any, b: any) => new Date(b.validTo).getTime() - new Date(a.validTo).getTime()
    )[0];
    
    // Tính ngày bắt đầu và kết thúc chu kỳ mới
    const cycleStart = new Date(latestPayment.validTo);
    cycleStart.setDate(cycleStart.getDate() + 1); // Ngày sau ngày kết thúc chu kỳ trước
    
    return {
      from: cycleStart,
      to: getEndDateForCycle(cycleStart, studentData.student.paymentCycle)
    };
  };
  
  // Hàm tính ngày kết thúc chu kỳ dựa trên loại chu kỳ
  const getEndDateForCycle = (startDate: Date, cycle: string) => {
    const result = new Date(startDate);
    
    switch(cycle) {
      case "1-thang":
        result.setMonth(result.getMonth() + 1);
        result.setDate(result.getDate() - 1);
        break;
      case "8-buoi":
      case "10-buoi":
        // Giả định 2 buổi/tuần
        const numWeeks = cycle === "8-buoi" ? 4 : 5;
        result.setDate(result.getDate() + (numWeeks * 7) - 1);
        break;
      case "theo-ngay":
        // Mặc định 1 tuần
        result.setDate(result.getDate() + 6);
        break;
      default:
        // Mặc định là 1 tháng
        result.setMonth(result.getMonth() + 1);
        result.setDate(result.getDate() - 1);
    }
    
    return result;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-4xl">
        <header className="bg-white shadow mb-6 rounded-lg p-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <h1 className="text-xl font-bold text-primary mb-4 md:mb-0">HoeEdu Solution</h1>
            <Link href="/auth">
              <Button variant="outline" size="sm">
                Đăng nhập quản trị
              </Button>
            </Link>
          </div>
        </header>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card className="md:col-span-2">
            <CardHeader className="bg-gradient-to-r from-primary/90 to-primary text-white">
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                <span>Cổng thông tin phụ huynh</span>
              </CardTitle>
              <CardDescription className="text-white/80">
                Tra cứu thông tin học sinh, theo dõi điểm danh và thanh toán
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <QrCode className="h-5 w-5" />
                    <h3 className="font-medium">Quét mã QR</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Quét mã QR từ hồ sơ học sinh để xem thông tin chi tiết về tiến độ học tập, điểm danh và lịch sử thanh toán.
                  </p>
                  <div className="flex items-center gap-2 text-primary">
                    <User className="h-5 w-5" />
                    <h3 className="font-medium">Thông tin chi tiết</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Theo dõi chi tiết tiến độ học tập, lịch học, tình trạng thanh toán và nhiều thông tin khác.
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <form onSubmit={handleSearch} className="space-y-4">
                    <div>
                      <Label htmlFor="student-code" className="flex items-center gap-1.5">
                        <Search className="h-4 w-4" />
                        <span>Nhập mã học sinh</span>
                      </Label>
                      <Input
                        id="student-code"
                        placeholder="Ví dụ: 010523456"
                        value={studentCode}
                        onChange={(e) => setStudentCode(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading || !studentCode}>
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block"></span>
                          Đang tìm kiếm...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Search className="h-4 w-4" />
                          Tra cứu
                        </span>
                      )}
                    </Button>
                  </form>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {error && hasSearched && (
          <Card className="border-red-200 bg-red-50 mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-red-600 text-lg flex items-center gap-2">
                <AlertCircle size={18} />
                Không tìm thấy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-600">Không tìm thấy học sinh với mã này. Vui lòng kiểm tra lại mã học sinh.</p>
            </CardContent>
          </Card>
        )}

        {studentData && (
          <Card>
            <CardHeader className="bg-gradient-to-r from-primary/90 to-primary text-white border-b">
              <CardTitle className="flex justify-between items-center">
                <span className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Thông tin học sinh
                </span>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                  studentData.student.status === 'active' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-red-500 text-white'
                }`}>
                  {studentData.student.status === 'active' ? 'Đang học' : 'Nghỉ học'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 flex items-center gap-1.5">
                      <User className="h-4 w-4 text-primary" />
                      Họ và tên:
                    </p>
                    <p className="font-medium">{studentData.student.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center gap-1.5">
                      <QrCode className="h-4 w-4 text-primary" />
                      Mã học sinh:
                    </p>
                    <p className="font-medium">{studentData.student.code}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-primary" />
                      Lớp học:
                    </p>
                    <p className="font-medium">{studentData.class?.name || 'Chưa phân lớp'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center gap-1.5">
                      <Phone className="h-4 w-4 text-primary" />
                      Số điện thoại:
                    </p>
                    <p className="font-medium">{studentData.student.phone || 'Không có'}</p>
                  </div>
                </div>
                
                {studentData.class && (
                  <div className="p-4 bg-gray-50 rounded-lg mt-4">
                    <h3 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      Thông tin lớp học
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <p className="text-sm text-gray-500">Lịch học:</p>
                        <p className="font-medium">{studentData.class.schedule}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Địa điểm:</p>
                        <p className="font-medium">{studentData.class.location}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Học phí:</p>
                        <p className="font-medium">
                          {formatCurrency(studentData.class.fee)}
                          {studentData.class.paymentCycle === "theo-ngay" || studentData.class.paymentCycle?.includes("buoi") 
                            ? "/buổi" 
                            : "/tháng"
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <Separator />
              
              <div className="p-6">
                <h3 className="font-medium text-gray-700 mb-4">Lịch sử điểm danh</h3>
                
                {studentData.attendance && studentData.attendance.length > 0 ? (
                  <div className="max-h-[350px] overflow-y-auto pr-2">
                    {(() => {
                      // Nhóm điểm danh theo ngày
                      const sortedAttendance = [...studentData.attendance].sort(
                        (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
                      );
                      
                      // Tạo map để lưu trữ bản ghi cho mỗi ngày
                      const attendanceByDate: Record<string, any> = {};
                      
                      sortedAttendance.forEach((record: any) => {
                        const date = new Date(record.date);
                        const dateKey = date.toISOString().split('T')[0];
                        
                        attendanceByDate[dateKey] = record;
                      });
                      
                      // Hiển thị theo ngày, mỗi ngày là một ô
                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {Object.entries(attendanceByDate).map(([dateStr, record]) => {
                            const date = new Date(dateStr);
                            return (
                              <div 
                                key={dateStr} 
                                className={`p-3 rounded-lg flex flex-col items-center justify-center border ${
                                  record.status === "present" 
                                    ? 'bg-green-50 border-green-200' 
                                    : record.status === "absent" 
                                      ? 'bg-red-50 border-red-200' 
                                      : record.status === "teacher_absent"
                                        ? 'bg-yellow-50 border-yellow-200'
                                        : 'bg-blue-50 border-blue-200'
                                }`}
                              >
                                <div className="font-medium mb-2">{formatDate(date)}</div>
                                <span className={`flex items-center px-3 py-1.5 text-sm font-medium rounded-full ${
                                  record.status === "present" 
                                    ? 'bg-green-100 text-green-800' 
                                    : record.status === "absent" 
                                      ? 'bg-red-100 text-red-800' 
                                      : record.status === "teacher_absent"
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {record.status === "present" && <Check className="h-4 w-4 mr-1.5" />}
                                  {record.status === "absent" && <X className="h-4 w-4 mr-1.5" />}
                                  {record.status === "teacher_absent" && <AlertCircle className="h-4 w-4 mr-1.5" />}
                                  {record.status === "makeup" && <RefreshCw className="h-4 w-4 mr-1.5" />}
                                  {getStatusText(record.status)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="text-center py-10 border rounded-md bg-gray-50">
                    <AlertCircle className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
                    <p className="text-gray-600">Chưa có dữ liệu điểm danh</p>
                  </div>
                )}
              </div>
              
              <Separator />
              
              <div className="p-6">
                {/* Trạng thái thanh toán */}
                {studentData.student.status === "active" && (
                  <div className="mb-6">
                    <h3 className="font-medium text-gray-700 mb-4 flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-primary" />
                      Trạng thái thanh toán
                    </h3>
                    
                    {studentData.class && (
                      <>
                        {/* Card trạng thái thanh toán */}
                        {(() => {
                          const paymentStatus = checkPaymentStatus();
                          return (
                            <div className={`border rounded-lg p-4 mb-4 ${paymentStatus.color}`}>
                              <div className="flex justify-between items-center">
                                <div className="font-medium flex items-center gap-2">
                                  {paymentStatus.status === "paid" ? (
                                    <Check className="h-5 w-5 text-green-600" />
                                  ) : paymentStatus.status === "unpaid" ? (
                                    <Clock className="h-5 w-5 text-orange-500" />
                                  ) : (
                                    <AlertCircle className="h-5 w-5 text-red-600" />
                                  )}
                                  <span className={`font-bold text-base ${
                                    paymentStatus.status === "paid" 
                                      ? "text-green-600" 
                                      : paymentStatus.status === "unpaid" 
                                        ? "text-orange-600" 
                                        : "text-red-600"
                                  }`}>
                                    {paymentStatus.text}
                                  </span>
                                </div>
                                
                                {paymentStatus.status === "paid" && (
                                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                    {studentData.payments && studentData.payments.length > 0 
                                      ? `Đến ${formatDate(studentData.payments[0].validTo)}`
                                      : ""}
                                  </span>
                                )}
                              </div>
                              
                              {/* Thông tin chuyển khoản nếu chưa thanh toán */}
                              {(paymentStatus.status === "unpaid" || paymentStatus.status === "overdue") && (
                                <div className="mt-4 p-3 bg-white rounded border-dashed border-2 border-gray-300">
                                  <p className="text-sm font-medium mb-3 flex items-center gap-1 text-primary">
                                    <Info className="h-4 w-4" />
                                    Thông tin thanh toán
                                  </p>
                                  
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2 text-sm">
                                      <p><span className="text-gray-500">Số tài khoản:</span> <span className="font-medium">9704229262085470</span></p>
                                      <p><span className="text-gray-500">Ngân hàng:</span> <span className="font-medium">MB Bank</span></p>
                                      <p><span className="text-gray-500">Chủ tài khoản:</span> <span className="font-medium">Tran Dong Phu</span></p>
                                      <p><span className="text-gray-500">Nội dung:</span> <span className="font-medium">HP {studentData.student.code} {removeVietnameseAccents(studentData.student.name)}</span></p>
                                      <p><span className="text-gray-500">Số tiền:</span> <span className="font-medium text-primary">{formatCurrency(studentData.class.fee)}</span></p>
                                    </div>
                                    
                                    <div className="flex flex-col items-center justify-center bg-white rounded-lg p-3">
                                      <p className="font-medium text-gray-700 mb-2">Quét mã QR để thanh toán</p>
                                      <div 
                                        className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm cursor-pointer relative group"
                                        onClick={() => {
                                          // Tạo URL cho mã QR
                                          const qrUrl = generateVietQRUrl(
                                            "970422", // MB Bank bin code
                                            "9704229262085470", // Số tài khoản
                                            "Tran Dong Phu", // Tên người nhận
                                            studentData.class.fee, // Số tiền
                                            `HP ${studentData.student.code} ${removeVietnameseAccents(studentData.student.name)}` // Nội dung
                                          );
                                          // Mở trong cửa sổ mới
                                          window.open(qrUrl, "_blank");
                                        }}
                                      >
                                        <img 
                                          src={generateVietQRUrl(
                                            "970422", // MB Bank bin code
                                            "9704229262085470", // Số tài khoản
                                            "Tran Dong Phu", // Tên người nhận
                                            studentData.class.fee, // Số tiền
                                            `HP ${studentData.student.code} ${removeVietnameseAccents(studentData.student.name)}` // Nội dung
                                          )}
                                          alt="QR Code thanh toán"
                                          className="w-48 h-48 object-contain transition-transform group-hover:scale-105"
                                          loading="lazy"
                                        />
                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-5 flex items-center justify-center transition-opacity opacity-0 group-hover:opacity-100 rounded-lg">
                                          <span className="bg-white text-primary font-medium px-2 py-1 rounded-md text-sm shadow-sm">Nhấn để phóng to</span>
                                        </div>
                                      </div>
                                      
                                      <div className="mt-3 flex items-center justify-center space-x-2">
                                        <a 
                                          href={generateVietQRUrl(
                                            "970422", 
                                            "9704229262085470",
                                            "Tran Dong Phu",

                                            studentData.class.fee,
                                            `HP ${studentData.student.code} ${removeVietnameseAccents(studentData.student.name)}`
                                          )}
                                          download={`qr-thanh-toan-${studentData.student.code}.png`}
                                          className="text-sm flex items-center gap-1 bg-primary text-white px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors"
                                          target="_blank"
                                        >
                                          <Download className="h-4 w-4" />
                                          Tải xuống
                                        </a>
                                      </div>
                                      
                                      <p className="text-xs text-gray-500 mt-2 text-center">Quét mã QR hoặc nhấn để phóng to</p>
                                      <p className="text-xs font-medium text-blue-600 mt-1">Powered by VietQR.io</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                        
                        {/* Chu kỳ thanh toán tiếp theo */}
                        {(() => {
                          const nextCycle = calculateNextPaymentCycle();
                          if (nextCycle) {
                            return (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm font-medium mb-2 flex items-center gap-1 text-blue-800">
                                  <Calendar className="h-4 w-4 text-blue-600" />
                                  Chu kỳ thanh toán tiếp theo (dự kiến)
                                </p>
                                <div className="flex justify-between items-center">
                                  <p className="text-sm text-blue-800">
                                    {formatDate(nextCycle.from)} - {formatDate(nextCycle.to)}
                                  </p>
                                  <p className="font-medium text-blue-800">{formatCurrency(studentData.class.fee)}</p>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </>
                    )}
                  </div>
                )}
                
                <h3 className="font-medium text-gray-700 mb-4">Lịch sử thanh toán</h3>
                
                {studentData.payments && studentData.payments.length > 0 ? (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                    {studentData.payments
                      .sort((a: any, b: any) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
                      .map((payment: any) => (
                        <div key={payment.id} className="border rounded-md p-4 bg-gray-50">
                          <div className="flex justify-between">
                            <div className="text-sm font-medium">{formatDate(payment.paymentDate)}</div>
                            <div className="font-bold text-primary">{formatCurrency(payment.amount)}</div>
                          </div>
                          <div className="mt-1 text-sm text-gray-500">
                            Thời hạn: {formatDate(payment.validFrom)} - {formatDate(payment.validTo)}
                          </div>
                          {payment.notes && (
                            <div className="mt-2 text-xs text-gray-500 italic">{payment.notes}</div>
                          )}
                        </div>
                      ))
                    }
                  </div>
                ) : (
                  <div className="text-center py-10 border rounded-md bg-gray-50">
                    <AlertCircle className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
                    <p className="text-gray-600">Chưa có dữ liệu thanh toán</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}