import { useState } from "react";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import ChangePasswordForm from "./change-password-form";
import { 
  Settings, 
  User, 
  Bell, 
  Shield 
} from "lucide-react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("password");
  
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
          <Settings className="mr-2 h-5 w-5 text-primary" />
          Cài đặt tài khoản
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Quản lý cài đặt tài khoản và bảo mật
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-1">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            orientation="vertical"
            className="w-full"
          >
            <TabsList className="flex flex-col items-stretch h-auto bg-transparent space-y-1">
              <TabsTrigger
                value="password"
                className={`justify-start px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeTab === "password"
                    ? "bg-primary/10 text-primary border-l-4 border-primary"
                    : "text-gray-600 hover:bg-gray-100 hover:text-primary"
                }`}
              >
                <Shield className="mr-2 h-4 w-4" />
                Mật khẩu & Bảo mật
              </TabsTrigger>
              
              <TabsTrigger
                value="profile"
                className={`justify-start px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeTab === "profile"
                    ? "bg-primary/10 text-primary border-l-4 border-primary"
                    : "text-gray-600 hover:bg-gray-100 hover:text-primary"
                }`}
                disabled
              >
                <User className="mr-2 h-4 w-4" />
                Thông tin cá nhân
              </TabsTrigger>
              
              <TabsTrigger
                value="notifications"
                className={`justify-start px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeTab === "notifications"
                    ? "bg-primary/10 text-primary border-l-4 border-primary"
                    : "text-gray-600 hover:bg-gray-100 hover:text-primary"
                }`}
                disabled
              >
                <Bell className="mr-2 h-4 w-4" />
                Thông báo
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <div className="md:col-span-3">
          <TabsContent value="password" className="m-0">
            <ChangePasswordForm />
          </TabsContent>
          
          <TabsContent value="profile" className="m-0">
            <div className="border rounded-lg p-6 bg-gray-50 h-64 flex items-center justify-center">
              <p className="text-gray-500">Tính năng đang phát triển</p>
            </div>
          </TabsContent>
          
          <TabsContent value="notifications" className="m-0">
            <div className="border rounded-lg p-6 bg-gray-50 h-64 flex items-center justify-center">
              <p className="text-gray-500">Tính năng đang phát triển</p>
            </div>
          </TabsContent>
        </div>
      </div>
    </div>
  );
}