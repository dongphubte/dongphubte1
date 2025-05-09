import React, { useState } from "react";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AttendanceByClass from "@/components/attendance/attendance-by-class";
import AttendanceForm from "@/components/attendance/attendance-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarCheck, ListChecks, BarChart, ChevronLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState("by-class");
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header navigation */}
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1" 
            onClick={() => navigate("/")}
          >
            <ChevronLeft className="h-4 w-4" />
            Quay lại
          </Button>
          <div className="h-5 w-px bg-gray-200 mx-2"></div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1"
            onClick={() => navigate("/")}
          >
            <Home className="h-4 w-4" />
            Trang chủ
          </Button>
        </div>
        <h2 className="text-lg font-semibold gradient-heading bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-purple-800">
          HoeEdu Solution
        </h2>
      </div>

      <div className="container mx-auto p-4 max-w-7xl">
        <div className="mb-6 mt-4">
          <h1 className="text-3xl font-bold tracking-tight">Quản lý Điểm danh</h1>
          <p className="text-muted-foreground mt-1">
            Theo dõi, phân tích và quản lý điểm danh học sinh theo lớp và thời gian
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Điểm danh theo lớp</CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Thống kê</div>
              <p className="text-xs text-muted-foreground">
                Xem thống kê điểm danh cho từng lớp học
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Điểm danh hàng ngày</CardTitle>
              <CalendarCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Cập nhật</div>
              <p className="text-xs text-muted-foreground">
                Điểm danh học sinh cho ngày hiện tại
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng quan</CardTitle>
              <ListChecks className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Báo cáo</div>
              <p className="text-xs text-muted-foreground">
                Báo cáo chi tiết điểm danh theo thời gian
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white rounded-lg shadow-sm border">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex h-12 items-center justify-between rounded-none border-b bg-transparent px-4 w-full">
              <div className="flex gap-4">
                <TabsTrigger 
                  value="by-class" 
                  className="rounded-sm data-[state=active]:bg-muted"
                >
                  <BarChart className="h-4 w-4 mr-2" />
                  Thống kê lớp
                </TabsTrigger>
                <TabsTrigger 
                  value="today" 
                  className="rounded-sm data-[state=active]:bg-muted"
                >
                  <CalendarCheck className="h-4 w-4 mr-2" />
                  Điểm danh hôm nay
                </TabsTrigger>
              </div>
            </TabsList>
            
            <div className="p-4">
              <TabsContent value="by-class" className="mt-0">
                <AttendanceByClass />
              </TabsContent>
              <TabsContent value="today" className="mt-0">
                <AttendanceForm />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}