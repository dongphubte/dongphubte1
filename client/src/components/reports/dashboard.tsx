import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, Users, DollarSign, Clock, AlertCircle, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/utils/format";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

export default function Dashboard() {
  interface DashboardData {
    students: {
      total: number;
      active: number;
      inactive: number;
    };
    finances: {
      paidAmount: number;
      pendingAmount: number;
      overdueAmount: number;
      totalAmount: number;
    };
    attendance: {
      present: number;
      absent: number;
      teacherAbsent: number;
    };
    studentsPerClass: Array<{
      name: string;
      count: number;
    }>;
    monthlyRevenue: Array<{
      month: string;
      amount: number;
    }>;
  }

  const { data: reportData, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/reports/dashboard"],
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="bg-white shadow rounded-lg p-8 text-center">
        <p className="text-neutral-600">Không thể tải dữ liệu báo cáo. Vui lòng thử lại sau.</p>
      </div>
    );
  }

  const { students, finances, attendance, studentsPerClass, monthlyRevenue } = reportData;

  // Format data for charts
  const formattedStudentsPerClass = studentsPerClass.map((item: any) => ({
    name: item.name,
    "Số học sinh": item.count,
  }));

  const formattedMonthlyRevenue = monthlyRevenue.map((item: any) => ({
    name: item.month,
    "Doanh thu": item.amount,
  }));

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg leading-6 font-medium text-neutral-800">Báo cáo tổng hợp</h2>
        <p className="mt-1 text-sm text-neutral-500">Thống kê chung về tình hình học sinh và tài chính</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-white border border-blue-100">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-primary text-white mr-4">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-500">Tổng số học sinh</p>
                <h3 className="text-2xl font-semibold text-neutral-800">{students.total}</h3>
                <p className="text-xs text-neutral-400">
                  <span className="text-success">{students.active} đang học</span> |{" "}
                  <span className="text-error">{students.inactive} nghỉ học</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-white border border-green-100">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-success text-white mr-4">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-500">Đã thanh toán</p>
                <h3 className="text-2xl font-semibold text-neutral-800">{formatCurrency(finances.paidAmount)}</h3>
                <p className="text-xs text-success">Đã thu</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-white border border-yellow-100">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-warning text-white mr-4">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-500">Chưa thanh toán</p>
                <h3 className="text-2xl font-semibold text-neutral-800">{formatCurrency(finances.pendingAmount)}</h3>
                <p className="text-xs text-warning">Cần thu</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-white border border-red-100">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-error text-white mr-4">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-500">Quá hạn thanh toán</p>
                <h3 className="text-2xl font-semibold text-neutral-800">{formatCurrency(finances.overdueAmount)}</h3>
                <p className="text-xs text-error">Quá hạn</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium text-neutral-800">Số lượng học sinh theo lớp</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={formattedStudentsPerClass}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 60,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
                  <YAxis />
                  <Tooltip formatter={(value) => [value, "Số học sinh"]} />
                  <Legend />
                  <Bar dataKey="Số học sinh" fill="#0078D4" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium text-neutral-800">Doanh thu theo tháng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={formattedMonthlyRevenue}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [formatCurrency(value as number), "Doanh thu"]} 
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="Doanh thu"
                    stroke="#0078D4"
                    activeDot={{ r: 8 }}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium text-neutral-800">Tổng hợp điểm danh</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-neutral-100 rounded-lg p-4 flex flex-col items-center">
              <div className="p-3 rounded-full bg-success text-white mb-3">
                <Check className="h-6 w-6" />
              </div>
              <p className="font-semibold text-xl text-neutral-800">{attendance.present}</p>
              <p className="text-neutral-500">Có mặt</p>
            </div>
            <div className="bg-neutral-100 rounded-lg p-4 flex flex-col items-center">
              <div className="p-3 rounded-full bg-error text-white mb-3">
                <X className="h-6 w-6" />
              </div>
              <p className="font-semibold text-xl text-neutral-800">{attendance.absent}</p>
              <p className="text-neutral-500">Vắng mặt</p>
            </div>
            <div className="bg-neutral-100 rounded-lg p-4 flex flex-col items-center">
              <div className="p-3 rounded-full bg-warning text-white mb-3">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <p className="font-semibold text-xl text-neutral-800">{attendance.teacherAbsent}</p>
              <p className="text-neutral-500">GV nghỉ</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// These are imported separately to avoid importing the entire lucide-react package
function Check(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function X(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
