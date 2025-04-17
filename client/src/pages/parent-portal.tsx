import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/utils/format";
import { formatDate } from "@/utils/date-utils";

export default function ParentPortal() {
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

  const getPaymentStatus = () => {
    if (!studentData?.payments || studentData.payments.length === 0) {
      return {
        text: "Chưa thanh toán",
        color: "bg-warning bg-opacity-10 text-warning"
      };
    }

    const latestPayment = studentData.payments.sort(
      (a: any, b: any) => new Date(b.validTo).getTime() - new Date(a.validTo).getTime()
    )[0];

    if (new Date(latestPayment.validTo) < new Date()) {
      return {
        text: "Quá hạn thanh toán",
        color: "bg-error bg-opacity-10 text-error"
      };
    }

    return {
      text: "Đã thanh toán",
      color: "bg-success bg-opacity-10 text-success"
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "bg-success bg-opacity-10 text-success";
      case "absent":
        return "bg-error bg-opacity-10 text-error";
      case "teacher_absent":
        return "bg-warning bg-opacity-10 text-warning";
      default:
        return "bg-primary bg-opacity-10 text-primary";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "present":
        return "Có mặt";
      case "absent":
        return "Vắng mặt";
      case "teacher_absent":
        return "GV nghỉ";
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
      default:
        return cycle;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 p-4">
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

        <Card>
          <CardHeader className="bg-primary text-white">
            <CardTitle>Tra cứu thông tin học sinh</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <Label htmlFor="student-code">Nhập mã học sinh</Label>
                <Input
                  id="student-code"
                  placeholder="Ví dụ: 010523456"
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="sm:self-end">
                <Button type="submit" disabled={isLoading || !studentCode}>
                  Tra cứu
                </Button>
              </div>
            </form>

            {isLoading && <p className="text-center py-4">Đang tìm kiếm...</p>}

            {error && hasSearched && (
              <div className="p-4 border rounded-md bg-error bg-opacity-10 text-error">
                <p>Không tìm thấy học sinh với mã này. Vui lòng kiểm tra lại.</p>
              </div>
            )}

            {studentData && (
              <div className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-neutral-800">Thông tin học sinh</h3>
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${studentData.student.status === 'active' ? 'bg-success bg-opacity-10 text-success' : 'bg-error bg-opacity-10 text-error'}`}>
                    {studentData.student.status === 'active' ? 'Đang học' : 'Nghỉ học'}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-neutral-500">Họ và tên:</p>
                    <p className="font-medium">{studentData.student.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Mã học sinh:</p>
                    <p className="font-medium">{studentData.student.code}</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Lớp:</p>
                    <p className="font-medium">{studentData.class?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Chu kỳ thanh toán:</p>
                    <p className="font-medium">{getPaymentCycleText(studentData.student.paymentCycle)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Tình trạng thanh toán:</p>
                    <p className={`font-medium ${getPaymentStatus().color}`}>{getPaymentStatus().text}</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Ngày đăng ký:</p>
                    <p className="font-medium">{formatDate(studentData.student.registrationDate)}</p>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <h4 className="font-medium text-neutral-800 mb-2">Lịch sử thanh toán</h4>
                {studentData.payments && studentData.payments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-neutral-200">
                      <thead className="bg-neutral-100">
                        <tr>
                          <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Ngày</th>
                          <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Số tiền</th>
                          <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Thời hạn</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-neutral-200">
                        {studentData.payments.map((payment: any) => (
                          <tr key={payment.id}>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-neutral-500">{formatDate(payment.paymentDate)}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-neutral-500">{formatCurrency(payment.amount)}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-neutral-500">
                              {formatDate(payment.validFrom)} - {formatDate(payment.validTo)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-neutral-500">Chưa có lịch sử thanh toán</p>
                )}
                
                <Separator className="my-4" />
                
                <h4 className="font-medium text-neutral-800 mb-2">Điểm danh</h4>
                {studentData.attendance && studentData.attendance.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-neutral-200">
                      <thead className="bg-neutral-100">
                        <tr>
                          <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Ngày</th>
                          <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-neutral-200">
                        {studentData.attendance.map((record: any) => (
                          <tr key={record.id}>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-neutral-500">{formatDate(record.date)}</td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(record.status)}`}>
                                {getStatusText(record.status)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-neutral-500">Chưa có dữ liệu điểm danh</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
