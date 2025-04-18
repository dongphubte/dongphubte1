import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import MainLayout from "@/components/layout/main-layout";
import ClassList from "@/components/class/class-list";
import StudentList from "@/components/student/student-list";
import AttendanceForm from "@/components/attendance/attendance-form";
import Dashboard from "@/components/reports/dashboard";
import SettingsPage from "@/components/settings/settings-page";
import PaymentHistory from "@/components/payment/payment-history";
import { Button } from "@/components/ui/button";
import { BarChart, CalendarCheck } from "lucide-react";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("lop-hoc");
  const [location, navigate] = useLocation();

  return (
    <MainLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === "lop-hoc" && <ClassList />}
      {activeTab === "hoc-sinh" && <StudentList />}
      {activeTab === "diem-danh" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Điểm danh hôm nay</h2>
            <Button 
              onClick={() => navigate("/attendance")}
              className="flex items-center gap-2"
              variant="outline"
            >
              <BarChart className="h-4 w-4" />
              Xem thống kê chi tiết
            </Button>
          </div>
          <AttendanceForm />
        </div>
      )}
      {activeTab === "thanh-toan" && <PaymentHistory />}
      {activeTab === "bao-cao" && <Dashboard />}
      {activeTab === "cai-dat" && <SettingsPage />}
    </MainLayout>
  );
}
