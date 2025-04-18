import { useState } from "react";
import MainLayout from "@/components/layout/main-layout";
import ClassList from "@/components/class/class-list";
import StudentList from "@/components/student/student-list";
import AttendanceForm from "@/components/attendance/attendance-form";
import Dashboard from "@/components/reports/dashboard";
import SettingsPage from "@/components/settings/settings-page";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("lop-hoc");

  return (
    <MainLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === "lop-hoc" && <ClassList />}
      {activeTab === "hoc-sinh" && <StudentList />}
      {activeTab === "diem-danh" && <AttendanceForm />}
      {activeTab === "bao-cao" && <Dashboard />}
      {activeTab === "cai-dat" && <SettingsPage />}
    </MainLayout>
  );
}
