import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useDeviceInfo, useIsMobile } from "@/hooks/use-mobile";
import { DeviceInfo } from "@/components/mobile/DeviceInfo";
import { TabletLayout } from "@/components/mobile/TabletLayout";

/**
 * Trang xem trước giao diện di động
 */
export default function MobileView() {
  const { user, logoutMutation } = useAuth();
  const [activeTab, setActiveTab] = useState("device");
  
  const deviceInfo = useDeviceInfo();
  const isMobile = useIsMobile();
  
  // Giả lập isNative
  const isNative = () => false;
  
  // Giả lập showToast
  const showToast = (message: string) => {
    const toast = document.createElement('div');
    toast.innerText = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.backgroundColor = 'rgba(0,0,0,0.7)';
    toast.style.color = 'white';
    toast.style.padding = '10px 20px';
    toast.style.borderRadius = '5px';
    toast.style.zIndex = '9999';
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 2000);
  };
  
  // Menu cho layout tablet
  const renderMenu = () => (
    <div className="p-4 space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">HoeEdu Mobile</h2>
        <p className="text-sm text-muted-foreground">Quản lý giáo dục</p>
      </div>
      
      <Separator />
      
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground mb-2">TỔNG QUAN</p>
        <button 
          className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-accent text-left"
          onClick={() => setActiveTab("dashboard")}
        >
          <DashboardIcon />
          <span>Trang chủ</span>
        </button>
        <button 
          className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-accent text-left"
          onClick={() => setActiveTab("classes")}
        >
          <ClassesIcon />
          <span>Lớp học</span>
        </button>
        <button 
          className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-accent text-left"
          onClick={() => setActiveTab("students")}
        >
          <StudentsIcon />
          <span>Học sinh</span>
        </button>
      </div>
      
      <Separator />
      
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground mb-2">QUẢN LÝ</p>
        <button 
          className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-accent text-left"
          onClick={() => setActiveTab("attendance")}
        >
          <AttendanceIcon />
          <span>Điểm danh</span>
        </button>
        <button 
          className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-accent text-left" 
          onClick={() => setActiveTab("payments")}
        >
          <PaymentsIcon />
          <span>Thanh toán</span>
        </button>
      </div>
      
      <Separator />
      
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground mb-2">HỆ THỐNG</p>
        <button 
          className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-accent text-left text-primary"
          onClick={() => setActiveTab("device")}
        >
          <DeviceIcon />
          <span>Thiết bị</span>
        </button>
        <button 
          className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-accent text-left"
          onClick={() => setActiveTab("settings")}
        >
          <SettingsIcon />
          <span>Cài đặt</span>
        </button>
        <button 
          className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-accent text-left" 
          onClick={() => logoutMutation.mutate()}
        >
          <LogoutIcon />
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  );
  
  // Nội dung chính
  const renderContent = () => (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">HoeEdu Mobile Preview</h1>
          <p className="text-muted-foreground">
            Xem trước giao diện và chức năng di động của ứng dụng HoeEdu Solution
          </p>
        </div>
        
        <div className="border rounded-lg overflow-hidden mb-6">
          <div className="bg-muted p-4 border-b">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Thông tin nền tảng</h2>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => showToast("Đây là ứng dụng web được đóng gói thành ứng dụng di động bằng Capacitor")}
              >
                Kiểm tra Toast
              </Button>
            </div>
          </div>
          <div className="p-4 bg-card">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="border rounded-lg p-3">
                <p className="text-sm font-medium text-muted-foreground">Loại thiết bị</p>
                <p className="font-medium mt-1">
                  {deviceInfo.isMobile 
                    ? "Điện thoại" 
                    : deviceInfo.isTablet 
                      ? "Máy tính bảng" 
                      : "Máy tính"}
                </p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-sm font-medium text-muted-foreground">Kích thước màn hình</p>
                <p className="font-medium mt-1">
                  {deviceInfo.width} x {deviceInfo.height}
                </p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-sm font-medium text-muted-foreground">Ứng dụng gốc</p>
                <p className="font-medium mt-1">{isNative() ? "Có" : "Không"}</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-sm font-medium text-muted-foreground">Loại giao diện</p>
                <p className="font-medium mt-1">{isMobile ? "Di động" : "Desktop"}</p>
              </div>
            </div>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="device">Thiết bị</TabsTrigger>
            <TabsTrigger value="dashboard">Trang chủ</TabsTrigger>
            <TabsTrigger value="classes">Lớp học</TabsTrigger>
            <TabsTrigger value="students">Học sinh</TabsTrigger>
          </TabsList>
          
          <TabsContent value="device">
            <DeviceInfo />
          </TabsContent>
          
          <TabsContent value="dashboard">
            <div className="border rounded-lg p-6 text-center">
              <h3 className="text-lg font-medium mb-2">Trang tổng quan</h3>
              <p className="text-muted-foreground">
                (Phần này sẽ hiển thị tổng quan dữ liệu của ứng dụng)
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="classes">
            <div className="border rounded-lg p-6 text-center">
              <h3 className="text-lg font-medium mb-2">Quản lý lớp học</h3>
              <p className="text-muted-foreground">
                (Phần này sẽ hiển thị danh sách lớp học)
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="students">
            <div className="border rounded-lg p-6 text-center">
              <h3 className="text-lg font-medium mb-2">Quản lý học sinh</h3>
              <p className="text-muted-foreground">
                (Phần này sẽ hiển thị danh sách học sinh)
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
  
  return (
    <div className="min-h-screen">
      <TabletLayout 
        menu={renderMenu()}
        content={renderContent()}
      />
    </div>
  );
}

// Icons
function DashboardIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  );
}

function ClassesIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 3v4c0 2-2 4-4 4s-4-2-4-4V3" />
      <path d="M10 3H6a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9" />
      <path d="M15 12v6" />
      <path d="M9 18h12" />
    </svg>
  );
}

function StudentsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function AttendanceIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="m9 13 2 2 4-4" />
    </svg>
  );
}

function PaymentsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  );
}

function DeviceIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
      <path d="M12 18h.01" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}