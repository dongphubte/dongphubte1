import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle } from "lucide-react";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(6, {
      message: "Mật khẩu hiện tại cần có ít nhất 6 ký tự",
    }),
    newPassword: z.string().min(6, {
      message: "Mật khẩu mới cần có ít nhất 6 ký tự",
    }),
    confirmPassword: z.string().min(6, {
      message: "Xác nhận mật khẩu cần có ít nhất 6 ký tự",
    }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export default function ChangePasswordForm() {
  const { toast } = useToast();
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: ChangePasswordFormValues) => {
      const res = await apiRequest("POST", "/api/change-password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      return await res.json();
    },
    onSuccess: () => {
      setSubmitSuccess(true);
      setSubmitError(null);
      form.reset();
      
      toast({
        title: "Thành công!",
        description: "Mật khẩu đã được thay đổi thành công.",
      });
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 3000);
    },
    onError: (error: Error) => {
      setSubmitError(error.message);
      setSubmitSuccess(false);
      
      toast({
        title: "Lỗi",
        description: error.message || "Không thể thay đổi mật khẩu",
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: ChangePasswordFormValues) {
    changePasswordMutation.mutate(data);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Thay đổi mật khẩu</h3>
      
      {submitSuccess && (
        <Alert className="mb-6 bg-green-50 border-green-200 text-green-700">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <AlertDescription>
            Mật khẩu đã được thay đổi thành công.
          </AlertDescription>
        </Alert>
      )}
      
      {submitError && (
        <Alert className="mb-6 bg-red-50 border-red-200 text-red-700">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="currentPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mật khẩu hiện tại</FormLabel>
                <FormControl>
                  <Input 
                    type="password"
                    placeholder="Nhập mật khẩu hiện tại" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mật khẩu mới</FormLabel>
                <FormControl>
                  <Input 
                    type="password"
                    placeholder="Nhập mật khẩu mới" 
                    {...field} 
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
                <FormLabel>Xác nhận mật khẩu mới</FormLabel>
                <FormControl>
                  <Input 
                    type="password"
                    placeholder="Nhập lại mật khẩu mới" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Button 
            type="submit"
            className="w-full mt-6" 
            disabled={changePasswordMutation.isPending}
          >
            {changePasswordMutation.isPending ? "Đang xử lý..." : "Thay đổi mật khẩu"}
          </Button>
        </form>
      </Form>
    </div>
  );
}