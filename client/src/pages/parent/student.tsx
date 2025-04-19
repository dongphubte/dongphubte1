import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/utils/format";
import { formatDate } from "@/utils/date-utils";
import { Loader2, AlertTriangle, Calendar, CheckCircle, XCircle, Clock, CreditCard, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function StudentPage() {
  const { studentCode } = useParams();
  
  const {
    data: studentData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/students/code", studentCode],
    queryFn: async () => {
      if (!studentCode) return null;
      try {
        console.log("Đang gọi API với mã học sinh:", studentCode);
        const res = await fetch(`/api/students/code/${studentCode}`);
        if (!res.ok) {
          console.error("Lỗi khi gọi API:", res.status, res.statusText);
          throw new Error("Không tìm thấy học sinh với mã này");
        }
        const data = await res.json();
        console.log("Nhận được dữ liệu học sinh:", data);
        return data;
      } catch (err) {
        console.error("Lỗi khi lấy dữ liệu học sinh:", err);
        throw err;
      }
    },
    enabled: !!studentCode,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  const getPaymentStatus = () => {
    if (!studentData?.payments || studentData.payments.length === 0) {
      return {
        status: "unpaid",
        text: "Chưa thanh toán",
        color: "bg-yellow-100 text-yellow-800",
        icon: <Clock className="w-3 h-3" />,
        detailColor: "bg-yellow-50 border-yellow-200 text-yellow-800"
      };
    }

    const latestPayment = studentData.payments.sort(
      (a: any, b: any) => new Date(b.validTo).getTime() - new Date(a.validTo).getTime()
    )[0];

    if (new Date(latestPayment.validTo) < new Date()) {
      return {
        status: "overdue",
        text: "Quá hạn thanh toán",
        color: "bg-red-100 text-red-800",
        icon: <AlertTriangle className="w-3 h-3" />,
        detailColor: "bg-red-50 border-red-200 text-red-800"
      };
    }

    return {
      status: "paid",
      text: "Đã thanh toán",
      color: "bg-green-100 text-green-800",
      icon: <CheckCircle className="w-3 h-3" />,
      detailColor: "bg-green-50 border-green-200 text-green-800"
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
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present":
        return <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> Có mặt
        </Badge>;
      case "absent":
        return <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
          <XCircle className="w-3 h-3" /> Vắng mặt
        </Badge>;
      case "teacher_absent":
        return <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> GV nghỉ
        </Badge>;
      case "makeup":
        return <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Học bù
        </Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-gray-600">Đang tải thông tin học sinh...</p>
        </div>
      </div>
    );
  }

  if (error || !studentData) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="mx-auto max-w-4xl">
          <header className="bg-white shadow mb-6 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <h1 className="text-xl font-bold text-primary">HoeEdu Solution</h1>
              <Link href="/parent">
                <Button variant="outline" size="sm">
                  Trang chủ
                </Button>
              </Link>
            </div>
          </header>

          <Card>
            <CardHeader className="bg-red-50 border-b border-red-100">
              <CardTitle className="text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Lỗi
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Không tìm thấy thông tin học sinh</h3>
                <p className="text-gray-500 mb-6">Mã học sinh không hợp lệ hoặc không tồn tại trong hệ thống.</p>
                <Link href="/parent">
                  <Button>Quay lại trang chủ</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { student, class: classData, attendance, payments } = studentData;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-4xl">
        <header className="bg-white shadow mb-6 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-primary">HoeEdu Solution</h1>
            <Link href="/parent">
              <Button variant="outline" size="sm">
                Trang chủ
              </Button>
            </Link>
          </div>
        </header>

        <Card className="mb-6">
          <CardHeader className="bg-gradient-to-r from-primary/90 to-primary text-white border-b">
            <CardTitle className="flex justify-between items-center">
              <span>Thông tin học sinh</span>
              <Badge className={student.status === 'active' 
                ? 'bg-green-400 text-white hover:bg-green-500' 
                : 'bg-red-400 text-white hover:bg-red-500'
              }>
                {student.status === 'active' ? 'Đang học' : 'Nghỉ học'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-500">Họ và tên:</p>
                <p className="font-medium text-lg">{student.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Mã học sinh:</p>
                <p className="font-medium text-lg">{student.code}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Lớp học:</p>
                <p className="font-medium text-lg">{classData?.name || 'Chưa phân lớp'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Chu kỳ thanh toán:</p>
                <p className="font-medium text-lg">{getPaymentCycleText(student.paymentCycle)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Tình trạng thanh toán:</p>
                <Badge className={getPaymentStatus().color}>
                  {getPaymentStatus().text}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">Ngày đăng ký:</p>
                <p className="font-medium">{formatDate(student.registrationDate)}</p>
              </div>
            </div>
            
            {classData && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Thông tin lớp học
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-gray-500">Lịch học:</p>
                    <p className="font-medium">{classData.schedule}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Địa điểm:</p>
                    <p className="font-medium">{classData.location}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Học phí:</p>
                    <p className="font-medium">
                      {formatCurrency(classData.fee)}
                      {classData.paymentCycle === "theo-ngay" || classData.paymentCycle?.includes("buoi") 
                        ? "/buổi" 
                        : "/tháng"
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="attendance" className="bg-white shadow rounded-lg">
          <TabsList className="w-full p-0 bg-gray-100 rounded-t-lg border-b">
            <TabsTrigger value="attendance" className="flex-1 py-3 rounded-none rounded-tl-lg">
              Điểm danh
            </TabsTrigger>
            <TabsTrigger value="payment" className="flex-1 py-3 rounded-none rounded-tr-lg">
              Thanh toán
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="attendance" className="p-4">
            <h3 className="font-medium text-gray-800 mb-4">Lịch sử điểm danh</h3>
            
            {attendance && attendance.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {attendance
                  .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((record: any) => (
                    <div key={record.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md border">
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium">{formatDate(record.date)}</div>
                      </div>
                      {getStatusBadge(record.status)}
                    </div>
                  ))
                }
              </div>
            ) : (
              <div className="text-center py-8 border rounded-md bg-gray-50">
                <AlertTriangle className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
                <p className="text-gray-600">Chưa có dữ liệu điểm danh</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="payment" className="p-4">
            {/* Trạng thái thanh toán và thông tin chuyển khoản */}
            {student.status === "active" && (
              <div className="mb-6">
                <h3 className="font-medium text-gray-800 mb-4 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Trạng thái thanh toán
                </h3>
                
                {/* Card trạng thái thanh toán */}
                {(() => {
                  const paymentStatus = getPaymentStatus();
                  return (
                    <div className={`border rounded-lg p-4 mb-4 ${paymentStatus.detailColor}`}>
                      <div className="flex justify-between items-center">
                        <div className="font-medium flex items-center gap-2">
                          {paymentStatus.icon}
                          <span>{paymentStatus.text}</span>
                        </div>
                        
                        {paymentStatus.status === "paid" && payments && payments.length > 0 && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            Đến {formatDate(payments[0].validTo)}
                          </span>
                        )}
                      </div>
                      
                      {/* Thông tin chuyển khoản nếu chưa thanh toán */}
                      {(paymentStatus.status === "unpaid" || paymentStatus.status === "overdue") && (
                        <div className="mt-4 p-3 bg-white rounded border-dashed border-2 border-gray-300">
                          <p className="text-sm font-medium mb-2 flex items-center gap-1">
                            <Info className="h-4 w-4 text-primary" />
                            Thông tin thanh toán
                          </p>
                          <div className="space-y-2 text-sm">
                            <p><span className="text-gray-500">Số tài khoản:</span> <span className="font-medium">9704229262085470</span></p>
                            <p><span className="text-gray-500">Ngân hàng:</span> <span className="font-medium">MB Bank</span></p>
                            <p><span className="text-gray-500">Chủ tài khoản:</span> <span className="font-medium">Tran Dong Phu</span></p>
                            <p><span className="text-gray-500">Nội dung:</span> <span className="font-medium">HP {student.code} {student.name}</span></p>
                            <p><span className="text-gray-500">Số tiền:</span> <span className="font-medium text-primary">{formatCurrency(classData.fee)}</span></p>
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
                          <p className="font-medium text-blue-800">{formatCurrency(classData.fee)}</p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}
          
            <h3 className="font-medium text-gray-800 mb-4">Lịch sử thanh toán</h3>
            
            {payments && payments.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {payments
                  .sort((a: any, b: any) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
                  .map((payment: any) => (
                    <div key={payment.id} className="p-3 bg-gray-50 rounded-md border">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">{formatDate(payment.paymentDate)}</span>
                        <span className="font-bold text-primary">{formatCurrency(payment.amount)}</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        Thời hạn: {formatDate(payment.validFrom)} - {formatDate(payment.validTo)}
                      </div>
                      {payment.notes && (
                        <div className="mt-2 text-xs italic text-gray-500">{payment.notes}</div>
                      )}
                    </div>
                  ))
                }
              </div>
            ) : (
              <div className="text-center py-8 border rounded-md bg-gray-50">
                <AlertTriangle className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
                <p className="text-gray-600">Chưa có dữ liệu thanh toán</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}