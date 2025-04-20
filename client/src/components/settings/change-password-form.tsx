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
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

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
    <div className="max-w-md">
      {submitSuccess && (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600">
            Mật khẩu đã được thay đổi thành công.
          </AlertDescription>
        </Alert>
      )}
      
      {submitError && (
        <Alert className="mb-6 bg-destructive/10 border-destructive/20">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive">
            {submitError}
          </AlertDescription>
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
            {changePasswordMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              "Thay đổi mật khẩu"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}