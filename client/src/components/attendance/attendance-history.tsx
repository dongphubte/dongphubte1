import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Calendar } from "lucide-react";
import { formatDate } from "@/utils/date-utils";

interface AttendanceSummary {
  date: string;
  total: number;
  present: number;
  absent: number;
  teacherAbsent: number;
}

export default function AttendanceHistory() {
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary[]>([]);

  // Get recent attendance data
  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ["/api/attendance"],
  });

  useEffect(() => {
    if (attendanceData) {
      // Group by date
      const groupedByDate = attendanceData.reduce((acc: {[key: string]: any[]}, record: any) => {
        const date = new Date(record.date).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(record);
        return acc;
      }, {});

      // Create summary for each date
      const summary = Object.entries(groupedByDate)
        .map(([date, records]: [string, any[]]) => {
          const total = records.length;
          const present = records.filter(r => r.status === 'present').length;
          const absent = records.filter(r => r.status === 'absent').length;
          const teacherAbsent = records.filter(r => r.status === 'teacher_absent').length;

          return {
            date,
            total,
            present,
            absent,
            teacherAbsent
          };
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 7); // Get last 7 days only

      setAttendanceSummary(summary);
    }
  }, [attendanceData]);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg font-medium text-neutral-800">Lịch sử điểm danh</CardTitle>
        <p className="text-sm text-neutral-500">Dữ liệu điểm danh trong 7 ngày gần nhất</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : attendanceSummary.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {attendanceSummary.map((day) => (
              <div key={day.date} className="border rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <Calendar className="h-5 w-5 text-primary mr-2" />
                  <h4 className="font-medium text-neutral-800">
                    {formatDate(day.date)}
                  </h4>
                </div>
                <div className="mt-2 space-y-2">
                  <p className="text-sm text-neutral-500">Tổng số học sinh: {day.total}</p>
                  <p className="text-sm text-success flex items-center">
                    <span className="w-3 h-3 rounded-full bg-success mr-2"></span>
                    Có mặt: {day.present}
                  </p>
                  <p className="text-sm text-error flex items-center">
                    <span className="w-3 h-3 rounded-full bg-error mr-2"></span>
                    Vắng mặt: {day.absent}
                  </p>
                  <p className="text-sm text-warning flex items-center">
                    <span className="w-3 h-3 rounded-full bg-warning mr-2"></span>
                    GV nghỉ: {day.teacherAbsent}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-neutral-500">Chưa có dữ liệu điểm danh nào.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
