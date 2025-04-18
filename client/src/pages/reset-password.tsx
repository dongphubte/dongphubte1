import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useSearch, Link } from "wouter";

const resetPasswordSchema = z.object({
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Mật khẩu xác nhận không khớp",
  path: ["confirmPassword"]
});

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState("");
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const search = useSearch();
  const { toast } = useToast();

  useEffect(() => {
    // Lấy token từ URL
    const params = new URLSearchParams(search);
    const tokenParam = params.get("token");
    
    if (!tokenParam) {
      setIsTokenValid(false);
      toast({
        title: "Lỗi",
        description: "Không tìm thấy token đặt lại mật khẩu trong URL",
        variant: "destructive"
      });
      return;
    }
    
    setToken(tokenParam);
    setIsTokenValid(true);
  }, [search, toast]);

  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: ""
    },
  });

  const onSubmit = async (data: z.infer<typeof resetPasswordSchema>) => {
    if (!token) {
      toast({
        title: "Lỗi",
        description: "Không có token đặt lại mật khẩu",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await apiRequest("POST", "/api/reset-password", {
        token,
        password: data.password
      });
      
      if (response.ok) {
        toast({
          title: "Thành công",
          description: "Mật khẩu đã được đặt lại. Bạn có thể đăng nhập với mật khẩu mới.",
        });
        
        // Chuyển hướng đến trang đăng nhập sau 2 giây
        setTimeout(() => {
          setLocation("/auth");
        }, 2000);
      } else {
        const error = await response.json();
        toast({
          title: "Lỗi",
          description: error.message || "Không thể đặt lại mật khẩu",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Đã xảy ra lỗi khi đặt lại mật khẩu",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-center">Đặt lại mật khẩu</h1>
            <div className="mt-4 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <p className="mt-4 text-neutral-600">Đang kiểm tra token đặt lại mật khẩu...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isTokenValid === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-center">Đặt lại mật khẩu</h1>
            <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-lg">
              <p>Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.</p>
              <p className="mt-2">Vui lòng yêu cầu một link đặt lại mật khẩu mới.</p>
            </div>
            <div className="mt-4">
              <Link href="/auth">
                <a className="inline-block text-primary hover:underline">Quay lại trang đăng nhập</a>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">Đặt lại mật khẩu</h1>
          <p className="mt-2 text-neutral-600">
            Nhập mật khẩu mới cho tài khoản của bạn
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mật khẩu mới</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="password" 
                      placeholder="Nhập mật khẩu mới" 
                      className="bg-neutral-100"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Xác nhận mật khẩu</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="password" 
                      placeholder="Nhập lại mật khẩu mới" 
                      className="bg-neutral-100"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full mt-6"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                "Đặt lại mật khẩu"
              )}
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center">
          <Link href="/auth">
            <a className="text-primary hover:underline">Quay lại trang đăng nhập</a>
          </Link>
        </div>
      </div>
    </div>
  );
}