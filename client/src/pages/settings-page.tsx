import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Key, Shield } from "lucide-react";
import ChangePasswordForm from "@/components/settings/change-password-form";

export default function SettingsPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Cài đặt hệ thống</h1>
          <p className="text-muted-foreground">Quản lý các cài đặt và cấu hình hệ thống</p>
        </div>
        <Settings className="h-10 w-10 text-muted-foreground" />
      </div>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-xl">Bảo mật tài khoản</CardTitle>
              <CardDescription>
                Quản lý bảo mật và quyền truy cập vào tài khoản của bạn
              </CardDescription>
            </div>
            <Shield className="h-8 w-8 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center">
                  <Key className="mr-2 h-5 w-5 text-primary" />
                  Thay đổi mật khẩu
                </h3>
                <ChangePasswordForm />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}