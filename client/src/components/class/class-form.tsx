import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Class, extendedInsertClassSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatFeeDisplay } from "@/utils/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSettings, FeeCalculationMethod } from "@/hooks/use-settings";
import { Info } from "lucide-react";
import { 
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface ClassFormProps {
  isOpen: boolean;
  onClose: () => void;
  classToEdit?: Class;
}

export default function ClassForm({ isOpen, onClose, classToEdit }: ClassFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isScheduleValid, setIsScheduleValid] = useState(true);
  const { getFeeCalculationMethod, isLoadingSettings } = useSettings();

  const formSchema = z.object({
    name: z.string().min(1, "Tên lớp là bắt buộc"),
    fee: z.coerce.number().min(1000, "Giá tiền phải lớn hơn 1.000 VND"),
    schedule: z.string().min(1, "Phải chọn ít nhất một ngày học"),
    location: z.string().min(1, "Địa điểm học là bắt buộc"),
    paymentCycle: z.enum(["1-thang", "8-buoi", "10-buoi", "theo-ngay"]).default("1-thang"),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      fee: 0,
      schedule: "",
      location: "",
      paymentCycle: "1-thang", // Mặc định là 1 tháng
    },
  });

  useEffect(() => {
    if (classToEdit) {
      // Ensure paymentCycle is one of the valid enum values
      const paymentCycle = ["1-thang", "8-buoi", "10-buoi", "theo-ngay"].includes(classToEdit.paymentCycle || "")
        ? classToEdit.paymentCycle as "1-thang" | "8-buoi" | "10-buoi" | "theo-ngay"
        : "1-thang";
      
      form.reset({
        name: classToEdit.name,
        fee: classToEdit.fee,
        schedule: classToEdit.schedule,
        location: classToEdit.location,
        paymentCycle: paymentCycle,
      });
    } else {
      form.reset({
        name: "",
        fee: 0,
        schedule: "",
        location: "",
        paymentCycle: "1-thang",
      });
    }
  }, [classToEdit, form, isOpen]);

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const res = await apiRequest("POST", "/api/classes", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      toast({
        title: "Thành công",
        description: "Đã thêm lớp học mới",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể thêm lớp học mới",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const res = await apiRequest("PUT", `/api/classes/${classToEdit?.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      toast({
        title: "Thành công",
        description: "Đã cập nhật lớp học",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể cập nhật lớp học",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    // Make sure at least one day is selected
    if (!data.schedule) {
      setIsScheduleValid(false);
      return;
    }

    // Log the data being submitted
    console.log("Submitting data:", data);

    if (classToEdit) {
      updateMutation.mutate({
        ...data,
        fee: Number(data.fee) // Ensure fee is a number
      });
    } else {
      createMutation.mutate({
        ...data,
        fee: Number(data.fee) // Ensure fee is a number
      });
    }
  };

  const scheduleDays = [
    { id: "thu2", label: "Thứ 2", value: "Thứ 2" },
    { id: "thu3", label: "Thứ 3", value: "Thứ 3" },
    { id: "thu4", label: "Thứ 4", value: "Thứ 4" },
    { id: "thu5", label: "Thứ 5", value: "Thứ 5" },
    { id: "thu6", label: "Thứ 6", value: "Thứ 6" },
    { id: "thu7", label: "Thứ 7", value: "Thứ 7" },
    { id: "chunhat", label: "Chủ nhật", value: "Chủ nhật" },
  ];

  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  useEffect(() => {
    if (classToEdit && classToEdit.schedule) {
      const days = classToEdit.schedule.split(", ");
      setSelectedDays(days);
    } else {
      setSelectedDays([]);
    }
  }, [classToEdit, isOpen]);

  const handleDayToggle = (value: string) => {
    setSelectedDays((prev) => {
      const newSelection = prev.includes(value)
        ? prev.filter((day) => day !== value)
        : [...prev, value];
      
      // Update the form value
      form.setValue("schedule", newSelection.join(", "));
      setIsScheduleValid(newSelection.length > 0);
      
      return newSelection;
    });
  };

  const handleFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove non-numeric characters and commas
    const value = e.target.value.replace(/[^\d]/g, "");
    const numericValue = parseInt(value) || 0;
    console.log("Setting fee to:", numericValue);
    
    // Directly update the fee value in the form
    form.setValue("fee", numericValue, { 
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true 
    });
    
    // Re-render to update the value
    e.target.value = formatCurrency(numericValue).replace(" VND", "");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{classToEdit ? "Cập nhật lớp học" : "Thêm lớp học mới"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tên lớp</Label>
            <Input 
              id="name"
              placeholder="Nhập tên lớp"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Label htmlFor="fee">Giá tiền (VND)</Label>
              <HoverCard>
                <HoverCardTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Thông tin học phí</h4>
                    {isLoadingSettings ? (
                      <p className="text-sm text-muted-foreground">Đang tải cài đặt...</p>
                    ) : (
                      <div className="text-sm">
                        <p>
                          {getFeeCalculationMethod() === FeeCalculationMethod.PER_SESSION ? (
                            <>
                              <span className="font-medium">Phương pháp tính: Theo buổi học</span>
                              <br />
                              Giá tiền là học phí cho một buổi học.
                              {form.getValues("paymentCycle") !== "theo-ngay" && (
                                <>
                                  <br />
                                  Tổng học phí sẽ được tính dựa trên số buổi trong chu kỳ.
                                </>
                              )}
                            </>
                          ) : (
                            <>
                              <span className="font-medium">Phương pháp tính: Theo chu kỳ</span>
                              <br />
                              Giá tiền là tổng học phí cho toàn bộ chu kỳ.
                            </>
                          )}
                        </p>
                        <p className="mt-2 font-medium">
                          Hiển thị cho học sinh:
                          {' '}
                          {formatFeeDisplay(
                            form.getValues("fee") || 0, 
                            form.getValues("paymentCycle") || "1-thang",
                            getFeeCalculationMethod()
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </HoverCardContent>
              </HoverCard>
            </div>
            <Input 
              id="fee"
              placeholder="Nhập giá tiền"
              defaultValue={formatCurrency(form.getValues("fee") || 0).replace(" VND", "")}
              onChange={handleFeeChange}
            />
            {form.formState.errors.fee && (
              <p className="text-sm text-red-500">{form.formState.errors.fee.message}</p>
            )}
            {!isLoadingSettings && (
              <p className="text-xs text-muted-foreground">
                {getFeeCalculationMethod() === FeeCalculationMethod.PER_SESSION
                  ? `Hiển thị: ${formatFeeDisplay(form.getValues("fee") || 0, form.getValues("paymentCycle") || "1-thang", getFeeCalculationMethod())}`
                  : `Hiển thị: ${formatFeeDisplay(form.getValues("fee") || 0, form.getValues("paymentCycle") || "1-thang", getFeeCalculationMethod())}`
                }
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>Thời gian học</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {scheduleDays.map((day) => (
                <div key={day.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={day.id}
                    checked={selectedDays.includes(day.value)}
                    onCheckedChange={() => handleDayToggle(day.value)}
                  />
                  <Label htmlFor={day.id} className="cursor-pointer">{day.label}</Label>
                </div>
              ))}
            </div>
            {!isScheduleValid && (
              <p className="text-sm text-red-500">Chọn ít nhất một ngày học</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="location">Địa điểm học</Label>
            <Input 
              id="location"
              placeholder="Nhập địa điểm học"
              {...form.register("location")}
            />
            {form.formState.errors.location && (
              <p className="text-sm text-red-500">{form.formState.errors.location.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="paymentCycle">Chu kỳ thanh toán</Label>
            <Select
              value={form.getValues("paymentCycle") || "1-thang"}
              onValueChange={(value: "1-thang" | "8-buoi" | "10-buoi" | "theo-ngay") => {
                console.log("Setting payment cycle to:", value);
                form.setValue("paymentCycle", value, {
                  shouldValidate: true,
                  shouldDirty: true,
                  shouldTouch: true
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn chu kỳ thanh toán" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1-thang">1 tháng</SelectItem>
                <SelectItem value="8-buoi">8 buổi</SelectItem>
                <SelectItem value="10-buoi">10 buổi</SelectItem>
                <SelectItem value="theo-ngay">Theo ngày</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter className="sm:justify-end">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
            >
              Hủy
            </Button>
            <Button 
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? "Đang xử lý..." : "Lưu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
