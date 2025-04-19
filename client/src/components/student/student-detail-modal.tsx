import React, { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatPaymentCycle, formatAttendanceStatus, summarizeAttendance } from "@/utils/format";
import { formatDate } from "@/utils/date-utils";
import { Student } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, AlertTriangle, Check, Calendar, Wallet, History, Clock, Scan, QrCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import QRCode from "react-qr-code";

interface StudentDetailProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  className?: string;
}

export default function StudentDetailModal({ isOpen, onClose, student, className }: StudentDetailProps) {
  const { data: classData } = useQuery({
    queryKey: ["/api/classes", student?.classId],
    queryFn: async () => {
      if (!student) return null;
      const res = await fetch(`/api/classes/${student.classId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!student?.classId,
  });

  const { data: attendance, isLoading: isLoadingAttendance } = useQuery({
    queryKey: ["/api/attendance/student", student?.id],
    queryFn: async () => {
      if (!student) return [];
      const res = await fetch(`/api/attendance/student/${student.id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!student?.id,
  });

  const { data: payments, isLoading: isLoadingPayments } = useQuery({
    queryKey: ["/api/payments/student", student?.id],
    queryFn: async () => {
      if (!student) return [];
      const res = await fetch(`/api/payments/student/${student.id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!student?.id,
  });

  // Tính tổng số tiền đã thanh toán
  const getTotalPaid = () => {
    if (!payments || !Array.isArray(payments)) return 0;
    return payments.reduce((total, payment) => total + payment.amount, 0);
  };

  // Tính số tiền chưa thanh toán
  const getUnpaidAmount = () => {
    if (!student || !classData || !classData.fee) return 0;
    
    // Nếu học sinh đã nghỉ học, không còn khoản phải thanh toán
    if (student.status !== 'active') return 0;
    
    // Nếu đã có thanh toán và chưa hết hạn
    if (payments && Array.isArray(payments) && payments.length > 0) {
      const latestPayment = payments[0];
      const validTo = new Date(latestPayment.validTo);
      const now = new Date();
      
      // Nếu chưa hết hạn, không có khoản phải thanh toán
      if (validTo > now) return 0;
    }
    
    // Nếu không có thanh toán hoặc đã hết hạn
    let fee = classData.fee;
    if (student.paymentCycle === '8-buoi') {
      fee = fee * 8;
    } else if (student.paymentCycle === '10-buoi') {
      fee = fee * 10;
    }
    
    return fee;
  };

  // Tính số tiền quá hạn
  const getOverdueAmount = () => {
    if (!student || !classData || !classData.fee) return 0;
    
    // Nếu học sinh đã nghỉ học, không còn khoản quá hạn
    if (student.status !== 'active') return 0;
    
    // Nếu đã có thanh toán, kiểm tra xem đã quá hạn chưa
    if (payments && Array.isArray(payments) && payments.length > 0) {
      const latestPayment = payments[0];
      const validTo = new Date(latestPayment.validTo);
      const now = new Date();
      
      // Nếu đã quá hạn 7 ngày trở lên, tính là khoản quá hạn
      const overdueThreshold = new Date(validTo);
      overdueThreshold.setDate(overdueThreshold.getDate() + 7);
      
      if (now > overdueThreshold) {
        let fee = classData.fee;
        if (student.paymentCycle === '8-buoi') {
          fee = fee * 8;
        } else if (student.paymentCycle === '10-buoi') {
          fee = fee * 10;
        }
        
        return fee;
      }
    } else if (student.status === 'active') {
      // Nếu chưa có thanh toán nào và học sinh đang học, tính toàn bộ học phí là quá hạn
      // sau 14 ngày kể từ ngày đăng ký
      const registerDate = new Date(student.registrationDate);
      const now = new Date();
      const overdueThreshold = new Date(registerDate);
      overdueThreshold.setDate(overdueThreshold.getDate() + 14);
      
      if (now > overdueThreshold) {
        let fee = classData.fee;
        if (student.paymentCycle === '8-buoi') {
          fee = fee * 8;
        } else if (student.paymentCycle === '10-buoi') {
          fee = fee * 10;
        }
        
        return fee;
      }
    }
    
    return 0;
  };
  
  // Tính trạng thái thanh toán
  const getPaymentStatus = () => {
    if (student?.status !== 'active') return 'inactive';
    
    if (getOverdueAmount() > 0) return 'overdue';
    if (getUnpaidAmount() > 0) return 'pending';
    return 'paid';
  };

  // Hiển thị badge trạng thái thanh toán
  const renderPaymentStatusBadge = () => {
    const status = getPaymentStatus();
    
    if (status === 'paid') {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Đã thanh toán</Badge>;
    } else if (status === 'pending') {
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Chưa thanh toán</Badge>;
    } else if (status === 'overdue') {
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Quá hạn thanh toán</Badge>;
    } else {
      return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">Nghỉ học</Badge>;
    }
  };

  // Tính phần trăm điểm danh
  const getAttendancePercentage = () => {
    if (!attendance || !Array.isArray(attendance) || attendance.length === 0) return 0;
    
    const stats = summarizeAttendance(attendance);
    const presentCount = stats.present + stats.makeup;
    const totalCount = stats.total;
    
    return totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
  };

  if (!student) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center">
            Thông tin chi tiết học sinh
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-1">
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">{student.name}</h3>
                <p className="text-gray-500 text-sm">Mã học sinh: {student.code}</p>
                <p className="text-gray-500 text-sm">
                  Đăng ký ngày: {formatDate(student.registrationDate)}
                </p>
                <p className="text-gray-500 text-sm">
                  Số điện thoại: {student.phone}
                </p>
              </div>
              <div className="text-right">
                {renderPaymentStatusBadge()}
                <p className="text-sm mt-2">
                  <span className="font-medium">Chu kỳ thanh toán:</span> {formatPaymentCycle(student.paymentCycle)}
                </p>
              </div>
            </div>
          </div>
          
          <Tabs defaultValue="class">
            <TabsList className="grid grid-cols-5 mb-4">
              <TabsTrigger value="class">
                <Calendar className="w-4 h-4 mr-2" />
                Lớp học
              </TabsTrigger>
              <TabsTrigger value="attendance">
                <Check className="w-4 h-4 mr-2" />
                Điểm danh
              </TabsTrigger>
              <TabsTrigger value="payment">
                <Wallet className="w-4 h-4 mr-2" />
                Học phí
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="w-4 h-4 mr-2" />
                Lịch sử
              </TabsTrigger>
              <TabsTrigger value="qrcode">
                <QrCode className="w-4 h-4 mr-2" />
                QR Code
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="class">
              <Card className="p-4">
                {classData ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-lg">{classData.name}</h3>
                      <Badge variant="outline">{formatPaymentCycle(classData.paymentCycle)}</Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Học phí:</span>
                        <span className="font-medium">{formatCurrency(classData.fee)}{classData.paymentCycle === 'theo-ngay' || classData.paymentCycle.includes('buoi') ? '/buổi' : '/tháng'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Lịch học:</span>
                        <span>{classData.schedule}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Địa điểm:</span>
                        <span>{classData.location}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center items-center p-6">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    <span>Đang tải thông tin lớp học...</span>
                  </div>
                )}
              </Card>
            </TabsContent>
            
            <TabsContent value="attendance">
              <Card className="p-4">
                {isLoadingAttendance ? (
                  <div className="flex justify-center items-center p-6">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    <span>Đang tải dữ liệu điểm danh...</span>
                  </div>
                ) : attendance && Array.isArray(attendance) && attendance.length > 0 ? (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-medium">Tỷ lệ điểm danh</h3>
                        <span className="font-medium">{getAttendancePercentage()}%</span>
                      </div>
                      <Progress value={getAttendancePercentage()} className="h-2" />
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="font-medium">Thống kê</h3>
                      <div className="grid grid-cols-4 gap-2">
                        {(() => {
                          const stats = summarizeAttendance(attendance);
                          return (
                            <>
                              <div className="bg-green-100 rounded p-2 text-center">
                                <p className="text-sm font-medium text-green-700">Có mặt</p>
                                <p className="font-bold">{stats.present}</p>
                              </div>
                              <div className="bg-red-100 rounded p-2 text-center">
                                <p className="text-sm font-medium text-red-700">Vắng mặt</p>
                                <p className="font-bold">{stats.absent}</p>
                              </div>
                              <div className="bg-blue-100 rounded p-2 text-center">
                                <p className="text-sm font-medium text-blue-700">Học bù</p>
                                <p className="font-bold">{stats.makeup}</p>
                              </div>
                              <div className="bg-purple-100 rounded p-2 text-center">
                                <p className="text-sm font-medium text-purple-700">Tổng</p>
                                <p className="font-bold">{stats.total}</p>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="font-medium">Lịch sử điểm danh</h3>
                      <div className="max-h-[300px] overflow-y-auto">
                        <div className="grid grid-cols-1 gap-2">
                          {attendance.map((record: any) => (
                            <div key={record.id} className={`flex justify-between items-center p-2 rounded-md ${
                              record.status === 'present' ? 'bg-green-50' : 
                              record.status === 'absent' ? 'bg-red-50' : 
                              record.status === 'makeup' ? 'bg-blue-50' : 'bg-yellow-50'
                            }`}>
                              <div className="flex items-center">
                                <span className={`w-2 h-2 rounded-full mr-2 ${
                                  record.status === 'present' ? 'bg-green-500' : 
                                  record.status === 'absent' ? 'bg-red-500' : 
                                  record.status === 'makeup' ? 'bg-blue-500' : 'bg-yellow-500'
                                }`}></span>
                                <span>{formatDate(record.date)}</span>
                              </div>
                              <span className="font-medium">{formatAttendanceStatus(record.status)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <AlertTriangle className="h-10 w-10 text-yellow-500 mb-2" />
                    <h3 className="font-medium text-gray-900">Chưa có dữ liệu điểm danh</h3>
                    <p className="text-gray-500 text-sm mt-1">Học sinh này chưa có thông tin điểm danh nào.</p>
                  </div>
                )}
              </Card>
            </TabsContent>
            
            <TabsContent value="payment">
              <Card className="p-4">
                {isLoadingPayments ? (
                  <div className="flex justify-center items-center p-6">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    <span>Đang tải dữ liệu thanh toán...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-600">Đã thanh toán</p>
                        <p className="text-lg font-semibold">{formatCurrency(getTotalPaid())}</p>
                      </div>
                      <div className="bg-yellow-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-600">Chưa thanh toán</p>
                        <p className="text-lg font-semibold">{formatCurrency(getUnpaidAmount())}</p>
                      </div>
                      <div className="bg-red-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-600">Quá hạn</p>
                        <p className="text-lg font-semibold">{formatCurrency(getOverdueAmount())}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="font-medium">Lịch sử thanh toán</h3>
                      {payments && Array.isArray(payments) && payments.length > 0 ? (
                        <div className="max-h-[300px] overflow-y-auto">
                          <div className="grid grid-cols-1 gap-2">
                            {payments.map((payment: any) => (
                              <div key={payment.id} className="flex justify-between items-center border rounded-md p-3">
                                <div>
                                  <p className="font-medium">{formatDate(payment.paymentDate)}</p>
                                  <p className="text-sm text-gray-500">
                                    {formatDate(payment.validFrom)} - {formatDate(payment.validTo)}
                                  </p>
                                  {payment.notes && (
                                    <p className="text-xs text-gray-500 mt-1 max-w-[250px] truncate" title={payment.notes}>
                                      {payment.notes}
                                    </p>
                                  )}
                                </div>
                                <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                          <AlertTriangle className="h-10 w-10 text-yellow-500 mb-2" />
                          <h3 className="font-medium text-gray-900">Chưa có dữ liệu thanh toán</h3>
                          <p className="text-gray-500 text-sm mt-1">Học sinh này chưa có thông tin thanh toán nào.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            </TabsContent>
            
            <TabsContent value="history">
              <Card className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-primary" />
                    <h3 className="font-medium">Lịch sử tạm nghỉ học và học lại</h3>
                  </div>
                  
                  {student.status === 'suspended' && (
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
                      <p className="font-medium text-amber-700">Đang tạm nghỉ</p>
                      <div className="mt-1 text-sm">
                        <p>Nghỉ từ: <span className="font-medium">{formatDate(student.suspendDate)}</span></p>
                        {student.suspendReason && (
                          <p className="mt-1">Lý do: <span className="italic">{student.suspendReason}</span></p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {student.suspendHistory && Array.isArray(student.suspendHistory) && student.suspendHistory.length > 0 ? (
                    <div className="space-y-2">
                      <div className="relative pl-8 space-y-4 before:absolute before:inset-0 before:w-[1px] before:left-3 before:ml-[1px] before:h-full before:bg-primary/20">
                        {student.suspendHistory.map((record: any, index: number) => (
                          <div key={index} className="relative pl-6 pb-4">
                            <div className="absolute top-0 left-0 bg-primary rounded-full h-6 w-6 flex items-center justify-center">
                              <Clock className="h-3 w-3 text-white" />
                            </div>
                            <div className="bg-white border rounded-md p-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium">Tạm nghỉ học</p>
                                  <p className="text-sm text-gray-500">
                                    {formatDate(record.suspendDate)} - {formatDate(record.restartDate)}
                                  </p>
                                </div>
                                <Badge className="bg-green-100 text-green-800">
                                  Đã học lại
                                </Badge>
                              </div>
                              {record.suspendReason && (
                                <p className="text-sm mt-2 italic">"{record.suspendReason}"</p>
                              )}
                              <div className="text-xs text-gray-500 mt-2">
                                <p>Thời gian tạm nghỉ: {Math.ceil((new Date(record.restartDate).getTime() - new Date(record.suspendDate).getTime()) / (1000 * 60 * 60 * 24))} ngày</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : student.status !== 'suspended' ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <AlertTriangle className="h-10 w-10 text-blue-500 mb-2" />
                      <h3 className="font-medium text-gray-900">Không có lịch sử tạm nghỉ</h3>
                      <p className="text-gray-500 text-sm mt-1">Học sinh này chưa từng tạm nghỉ học.</p>
                    </div>
                  ) : null}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}