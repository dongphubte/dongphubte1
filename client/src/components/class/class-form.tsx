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
import { formatCurrency, formatPaymentCycle } from "@/utils/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ClassFormProps {
  isOpen: boolean;
  onClose: () => void;
  classToEdit?: Class;
}

export default function ClassForm({ isOpen, onClose, classToEdit }: ClassFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isScheduleValid, setIsScheduleValid] = useState(true);

  const formSchema = extendedInsertClassSchema.extend({
    paymentCycle: z.string().optional(),
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
      form.reset({
        name: classToEdit.name,
        fee: classToEdit.fee,
        schedule: classToEdit.schedule,
        location: classToEdit.location,
        paymentCycle: classToEdit.paymentCycle || "1-thang",
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

    if (classToEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
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
    // Remove non-numeric characters
    const value = e.target.value.replace(/\D/g, "");
    form.setValue("fee", parseInt(value) || 0);
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
            <Label htmlFor="fee">Giá tiền (VND)</Label>
            <Input 
              id="fee"
              placeholder="Nhập giá tiền"
              value={formatCurrency(form.getValues("fee") || 0).replace(" VND", "")}
              onChange={handleFeeChange}
            />
            {form.formState.errors.fee && (
              <p className="text-sm text-red-500">{form.formState.errors.fee.message}</p>
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
              defaultValue={form.getValues("paymentCycle") || "1-thang"}
              onValueChange={(value) => form.setValue("paymentCycle", value)}
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
