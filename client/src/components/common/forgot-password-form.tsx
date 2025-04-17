import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const forgotPasswordSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
});

export default function ForgotPasswordForm({ onCancel }: { onCancel: () => void }) {
  const { forgotPasswordMutation } = useAuth();

  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "dongphubte@gmail.com", // Pre-set as per requirements
    },
  });

  const onSubmit = (data: z.infer<typeof forgotPasswordSchema>) => {
    forgotPasswordMutation.mutate(data);
  };

  return (
    <div>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-semibold text-neutral-800">Khôi phục mật khẩu</h1>
        <p className="text-neutral-500 mt-2">
          Vui lòng nhập email đã đăng ký. Chúng tôi sẽ gửi link đặt lại mật khẩu.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="email" 
                    placeholder="Nhập email của bạn" 
                    className="bg-neutral-100"
                    disabled
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end space-x-2 pt-2">
            <Button variant="outline" onClick={onCancel} type="button">
              Hủy
            </Button>
            <Button 
              type="submit" 
              disabled={forgotPasswordMutation.isPending}
            >
              {forgotPasswordMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Gửi link khôi phục
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
