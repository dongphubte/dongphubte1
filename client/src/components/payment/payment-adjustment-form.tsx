import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Payment, Class, Student } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/utils/format";
import { useSettings, FeeCalculationMethod } from "@/hooks/use-settings";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Alert, 
  AlertDescription,
  AlertTitle
} from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { 
  AlertCircle, 
  Calculator, 
  Calendar, 
  Check, 
  CreditCard,
  Info, 
  Loader2,
  RefreshCw
} from "lucide-react";

interface PaymentAdjustmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment;
}

export default function PaymentAdjustmentForm({ 
  isOpen, 
  onClose, 
  payment 
}: PaymentAdjustmentFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getFeeCalculationMethod } = useSettings();
  const [originalAmount, setOriginalAmount] = useState(payment.amount);
  const [newAmount, setNewAmount] = useState(payment.amount);
  const [plannedSessions, setPlannedSessions] = useState<number | undefined>(payment.plannedSessions || getDefaultPlannedSessions());
  const [maxSessions, setMaxSessions] = useState<number>(payment.plannedSessions || getDefaultPlannedSessions());
  
  // Lấy thông tin học sinh
  const { data: student } = useQuery<Student>({
    queryKey: ["/api/students", payment.studentId],
    enabled: isOpen,
  });

  // Lấy thông tin lớp học
  const { data: classInfo } = useQuery<Class>({
    queryKey: ["/api/classes", student?.classId],
    enabled: isOpen && !!student?.classId,
  });

  // Form cho điều chỉnh thanh toán
  const formSchema = z.object({
    actualSessions: z.coerce.number().min(0, "Số buổi không thể âm"),
    adjustmentReason: z.string().min(1, "Vui lòng nhập lý do điều chỉnh"),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      actualSessions: payment.actualSessions || payment.plannedSessions || getDefaultPlannedSessions(),
      adjustmentReason: payment.adjustmentReason || "",
    },
  });

  // Cập nhật thanh toán với thông tin mới
  const updatePaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", `/api/payments/${payment.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments/student", payment.studentId] });
      
      toast({
        title: "Thành công",
        description: "Đã cập nhật thông tin thanh toán",
      });
      
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể cập nhật thanh toán",
        variant: "destructive",
      });
    },
  });

  // Xử lý khi submit form
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    const { actualSessions, adjustmentReason } = data;
    
    // Tính toán số tiền điều chỉnh dựa trên số buổi thực tế
    const adjustedAmount = calculateAdjustedAmount(
      originalAmount,
      plannedSessions || getDefaultPlannedSessions(),
      actualSessions
    );
    
    // Cập nhật trạng thái nếu có hoàn trả
    const status = adjustedAmount < originalAmount ? "partial_refund" : payment.status;
    
    updatePaymentMutation.mutate({
      ...payment,
      amount: adjustedAmount,
      plannedSessions,
      actualSessions,
      adjustmentReason,
      status,
    });
  };

  // Sử dụng Effect để cập nhật giá trị khi payment thay đổi
  useEffect(() => {
    if (payment && isOpen) {
      setOriginalAmount(payment.amount);
      setNewAmount(payment.amount);
      setPlannedSessions(payment.plannedSessions || getDefaultPlannedSessions());
      setMaxSessions(payment.plannedSessions || getDefaultPlannedSessions());
      
      form.reset({
        actualSessions: payment.actualSessions || payment.plannedSessions || getDefaultPlannedSessions(),
        adjustmentReason: payment.adjustmentReason || "",
      });
    }
  }, [payment, isOpen, form]);

  // Sử dụng Effect để tính lại số tiền khi số buổi thay đổi
  useEffect(() => {
    const actualSessions = form.getValues("actualSessions");
    
    if (plannedSessions && actualSessions !== undefined) {
      const adjustedAmount = calculateAdjustedAmount(
        originalAmount,
        plannedSessions,
        actualSessions
      );
      
      setNewAmount(adjustedAmount);
    }
  }, [form.watch("actualSessions"), plannedSessions, originalAmount]);

  // Hàm tính số buổi mặc định dựa trên chu kỳ
  function getDefaultPlannedSessions(): number {
    if (!student || !classInfo) return 4; // Mặc định là 4 buổi

    const paymentCycle = student.paymentCycle || classInfo.paymentCycle || "1-thang";
    
    switch (paymentCycle) {
      case "8-buoi": return 8;
      case "10-buoi": return 10;
      case "1-thang": return 4; // Giả sử 1 tháng có 4 buổi học
      case "theo-ngay": return 1;
      default: return 4;
    }
  }

  // Hàm tính toán số tiền điều chỉnh
  function calculateAdjustedAmount(
    originalAmount: number,
    plannedSessions: number,
    actualSessions: number
  ): number {
    if (plannedSessions <= 0) return originalAmount;
    if (actualSessions >= plannedSessions) return originalAmount;
    
    // Tính toán số tiền cho mỗi buổi học
    const amountPerSession = originalAmount / plannedSessions;
    
    // Tính toán số tiền dựa trên số buổi thực tế
    return Math.round(amountPerSession * actualSessions);
  }

  // Tính số tiền chênh lệch (hoàn trả)
  const refundAmount = originalAmount - newAmount;
  const hasRefund = refundAmount > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Điều chỉnh thanh toán</DialogTitle>
          <DialogDescription>
            Điều chỉnh số buổi thực tế và số tiền thanh toán
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {student && classInfo && (
              <div className="grid gap-2 text-sm">
                <div><strong>Học sinh:</strong> {student.name}</div>
                <div><strong>Lớp học:</strong> {classInfo.name}</div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1 text-primary" /> 
                  <span>
                    <strong>Hiệu lực:</strong> {new Date(payment.validFrom).toLocaleDateString('vi-VN')} đến {new Date(payment.validTo).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <div className="flex items-center">
                  <CreditCard className="h-4 w-4 mr-1 text-primary" />
                  <span>
                    <strong>Số tiền gốc:</strong> {formatCurrency(originalAmount)}
                  </span>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Số buổi dự kiến</Label>
                  <Input
                    type="number"
                    value={plannedSessions?.toString() || ""}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value) && value > 0) {
                        setPlannedSessions(value);
                        setMaxSessions(value);
                        
                        const actualSessions = Math.min(value, form.getValues("actualSessions"));
                        form.setValue("actualSessions", actualSessions);
                      }
                    }}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="actualSessions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Số buổi thực tế</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            if (!isNaN(value) && value >= 0 && value <= maxSessions) {
                              field.onChange(value);
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Buổi học thực tế ({form.watch("actualSessions")}/{maxSessions})</Label>
                  <span className="text-xs text-muted-foreground">
                    Kéo để điều chỉnh
                  </span>
                </div>
                <Slider
                  value={[form.watch("actualSessions")]}
                  min={0}
                  max={maxSessions}
                  step={1}
                  onValueChange={(values) => {
                    form.setValue("actualSessions", values[0]);
                  }}
                />
              </div>
              
              <Card className={`${hasRefund ? 'border-amber-300 bg-amber-50' : 'border-green-200 bg-green-50'}`}>
                <CardHeader className="py-4">
                  <CardTitle className="text-base flex items-center">
                    <Calculator className="h-4 w-4 mr-2" />
                    Tính toán học phí
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="space-y-1">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Học phí gốc:</div>
                      <div className="font-medium text-right">{formatCurrency(originalAmount)}</div>
                      
                      <div>Số buổi dự kiến:</div>
                      <div className="font-medium text-right">{plannedSessions} buổi</div>
                      
                      <div>Số buổi thực tế:</div>
                      <div className="font-medium text-right">{form.watch("actualSessions")} buổi</div>
                      
                      <div>Học phí mỗi buổi:</div>
                      <div className="font-medium text-right">
                        {formatCurrency(plannedSessions ? (originalAmount / plannedSessions) : 0)}
                      </div>
                      
                      {hasRefund && (
                        <>
                          <div className="text-amber-600">Số tiền hoàn trả:</div>
                          <div className="font-semibold text-right text-amber-600">
                            {formatCurrency(refundAmount)}
                          </div>
                        </>
                      )}
                      
                      <div className="col-span-2 pt-2 border-t">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">Học phí điều chỉnh:</span>
                          <span className="font-bold text-lg">
                            {formatCurrency(newAmount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <FormField
                control={form.control}
                name="adjustmentReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lý do điều chỉnh</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Nhập lý do điều chỉnh học phí (ví dụ: học sinh nghỉ học, lớp kết thúc sớm...)"
                        className="resize-none h-20"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {hasRefund && (
              <Alert variant="warning" className="bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Lưu ý</AlertTitle>
                <AlertDescription>
                  Học phí sẽ được điều chỉnh giảm {formatCurrency(refundAmount)} do học sinh tham gia ít hơn số buổi dự kiến.
                </AlertDescription>
              </Alert>
            )}
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Hủy
              </Button>
              
              <Button 
                type="submit"
                disabled={updatePaymentMutation.isPending || newAmount === originalAmount}
              >
                {updatePaymentMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Xác nhận điều chỉnh
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}