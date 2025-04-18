import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage 
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Loader2, 
  BookOpen, 
  ClipboardCheck, 
  Users, 
  CreditCard, 
  BarChart4,
  CheckCircle 
} from "lucide-react";
import ForgotPasswordForm from "@/components/common/forgot-password-form";

const loginSchema = z.object({
  username: z.string().min(1, "Tên đăng nhập là bắt buộc"),
  password: z.string().min(1, "Mật khẩu là bắt buộc"),
});

export default function AuthPage() {
  const { user, loginMutation } = useAuth();
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onLoginSubmit = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(data);
  };

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  if (showForgotPassword) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <ForgotPasswordForm onCancel={() => setShowForgotPassword(false)} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Left Side - Login Form */}
      <div className="w-full lg:w-1/2 p-8 md:p-12 flex items-center justify-center">
        <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Đăng nhập HoeEdu Solution</h1>
            <p className="text-gray-600">Vui lòng đăng nhập để tiếp tục</p>
          </div>

          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-5">
              <FormField
                control={loginForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700">Tên đăng nhập</FormLabel>
                    <FormControl>
                      <Input className="h-11" placeholder="Nhập tên đăng nhập" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700">Mật khẩu</FormLabel>
                    <FormControl>
                      <Input className="h-11" type="password" placeholder="Nhập mật khẩu" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="remember" 
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="remember" className="text-sm text-gray-600">Ghi nhớ đăng nhập</Label>
                </div>
                
                <Button
                  variant="link"
                  className="p-0 h-auto text-sm text-primary"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowForgotPassword(true);
                  }}
                >
                  Quên mật khẩu?
                </Button>
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-11" 
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Đăng nhập
              </Button>
              
              <div className="text-center text-sm text-gray-500 mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <p className="font-medium mb-1">Thông tin đăng nhập demo:</p>
                <div className="flex justify-between px-3">
                  <span>Username:</span>
                  <span className="font-semibold">dongphubte</span>
                </div>
                <div className="flex justify-between px-3">
                  <span>Password:</span>
                  <span className="font-semibold">@Bentre2013</span>
                </div>
              </div>
            </form>
          </Form>
          
          <div className="mt-8 text-center">
            <Button 
              variant="outline" 
              className="text-primary border-primary hover:bg-primary/5"
              onClick={() => window.location.href = "/parent-portal"}
            >
              Tra cứu thông tin học sinh
            </Button>
          </div>
        </div>
      </div>

      {/* Right Side - Info */}
      <div className="hidden lg:block lg:w-1/2 bg-gradient-to-br from-primary/90 to-primary">
        <div className="flex h-full flex-col justify-center p-12 text-white">
          <div className="mb-12">
            <h1 className="text-4xl font-bold mb-4">HoeEdu Solution</h1>
            <p className="text-xl opacity-90">Hệ thống quản lý giáo dục toàn diện</p>
          </div>
          
          <div className="space-y-8">
            <div className="bg-white/10 p-6 rounded-xl backdrop-blur-sm">
              <h2 className="text-2xl font-semibold mb-4">Chức năng chính</h2>
              
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="bg-white/20 p-2 rounded-lg mr-4">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium">Quản lý lớp học</h3>
                    <p className="text-sm opacity-80">Tạo và quản lý thông tin lớp, lịch học, học phí</p>
                  </div>
                </li>
                
                <li className="flex items-start">
                  <div className="bg-white/20 p-2 rounded-lg mr-4">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium">Quản lý học sinh</h3>
                    <p className="text-sm opacity-80">Lưu trữ thông tin học sinh, phụ huynh, lịch sử học tập</p>
                  </div>
                </li>
                
                <li className="flex items-start">
                  <div className="bg-white/20 p-2 rounded-lg mr-4">
                    <ClipboardCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium">Điểm danh tự động</h3>
                    <p className="text-sm opacity-80">Theo dõi chuyên cần, ghi nhận tình trạng học tập</p>
                  </div>
                </li>
                
                <li className="flex items-start">
                  <div className="bg-white/20 p-2 rounded-lg mr-4">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium">Quản lý học phí</h3>
                    <p className="text-sm opacity-80">Ghi nhận thanh toán, phát hành biên lai, cảnh báo hết hạn</p>
                  </div>
                </li>
                
                <li className="flex items-start">
                  <div className="bg-white/20 p-2 rounded-lg mr-4">
                    <BarChart4 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium">Báo cáo trực quan</h3>
                    <p className="text-sm opacity-80">Biểu đồ thống kê tài chính và tình hình học tập</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
