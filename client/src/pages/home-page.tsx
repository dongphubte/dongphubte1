import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import MainLayout from "@/components/layout/main-layout";
import ClassList from "@/components/class/class-list";
import StudentList from "@/components/student/student-list";
import AttendanceForm from "@/components/attendance/attendance-form";
import AttendanceByClass from "@/components/attendance/attendance-by-class";
import Dashboard from "@/components/reports/dashboard";
import SettingsPage from "@/components/settings/settings-page";
import PaymentHistory from "@/components/payment/payment-history";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
          <AttendanceByClass />
        </div>
      )}
      {activeTab === "thanh-toan" && <PaymentHistory />}
      {activeTab === "bao-cao" && <Dashboard />}
      {activeTab === "cai-dat" && <SettingsPage />}
    </MainLayout>
  );
}
