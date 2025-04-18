import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Tên đăng nhập là bắt buộc"),
  password: z.string().min(1, "Mật khẩu là bắt buộc"),
});

export default function AuthForm({ onForgotPassword }: { onForgotPassword: () => void }) {
  const { loginMutation } = useAuth();
  const { toast } = useToast();

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

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold mb-6 text-center">Đăng nhập HoeEdu Solution</h2>
      <Form {...loginForm}>
        <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
          <FormField
            control={loginForm.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tên đăng nhập</FormLabel>
                <FormControl>
                  <Input placeholder="Nhập tên đăng nhập" {...field} />
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
                <FormLabel>Mật khẩu</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Nhập mật khẩu" {...field} />
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
              type="button"
              variant="link"
              className="p-0 h-auto text-sm text-primary"
              onClick={onForgotPassword}
            >
              Quên mật khẩu?
            </Button>
          </div>
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Đăng nhập
          </Button>
          
          {/* <div className="text-center text-sm text-gray-500 mt-4">
            <p>
              Gợi ý: username = dongphubte, password = @Bentre2013
            </p>
          </div> */}
        </form>
      </Form>
    </div>
  );
}
