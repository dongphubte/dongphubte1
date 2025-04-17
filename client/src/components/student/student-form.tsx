import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Student, 
  extendedInsertStudentSchema, 
  Class 
} from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/utils/format";
import { format } from "date-fns";

interface StudentFormProps {
  isOpen: boolean;
  onClose: () => void;
  studentToEdit?: Student;
}

export default function StudentForm({ isOpen, onClose, studentToEdit }: StudentFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedClassId, setSelectedClassId] = useState<number | undefined>(undefined);

  const { data: classes, isLoading: isLoadingClasses } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
  });

  const formSchema = extendedInsertStudentSchema;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      code: generateStudentCode(),
      phone: "",
      classId: 0,
      paymentCycle: "1-thang",
      status: "active",
    },
  });

  // Generate a random student code
  function generateStudentCode() {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = String(today.getFullYear()).substring(2);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${day}${month}${year}${random}`;
  }

  useEffect(() => {
    if (studentToEdit) {
      form.reset({
        name: studentToEdit.name,
        code: studentToEdit.code,
        phone: studentToEdit.phone,
        classId: studentToEdit.classId,
        paymentCycle: studentToEdit.paymentCycle,
        status: studentToEdit.status,
      });
      setSelectedClassId(studentToEdit.classId);
    } else {
      // Generate a new code for new students
      form.reset({
        name: "",
        code: generateStudentCode(),
        phone: "",
        classId: 0,
        paymentCycle: "1-thang",
        status: "active",
      });
      setSelectedClassId(undefined);
    }
  }, [studentToEdit, form, isOpen]);

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const res = await apiRequest("POST", "/api/students", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      toast({
        title: "Thành công",
        description: "Đã thêm học sinh mới",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể thêm học sinh mới",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const res = await apiRequest("PUT", `/api/students/${studentToEdit?.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      toast({
        title: "Thành công",
        description: "Đã cập nhật học sinh",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể cập nhật học sinh",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    // Make sure a class is selected
    if (!data.classId) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn lớp học",
        variant: "destructive",
      });
      return;
    }

    if (studentToEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleClassChange = (value: string) => {
    const classId = parseInt(value);
    form.setValue("classId", classId);
    setSelectedClassId(classId);
  };

  // Get the selected class details
  const selectedClass = classes?.find(c => c.id === selectedClassId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{studentToEdit ? "Cập nhật học sinh" : "Thêm học sinh mới"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Họ và tên</Label>
              <Input 
                id="name"
                placeholder="Nhập họ và tên học sinh"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="code">Mã học sinh</Label>
              <Input 
                id="code"
                readOnly
                className="bg-neutral-100"
                {...form.register("code")}
              />
              <p className="text-xs text-neutral-500">Mã được tạo tự động</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input 
                id="phone"
                placeholder="Nhập số điện thoại"
                {...form.register("phone")}
              />
              {form.formState.errors.phone && (
                <p className="text-sm text-red-500">{form.formState.errors.phone.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="class">Lớp</Label>
              <Select 
                onValueChange={handleClassChange}
                defaultValue={studentToEdit ? String(studentToEdit.classId) : undefined}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn lớp" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingClasses ? (
                    <SelectItem value="loading" disabled>Đang tải...</SelectItem>
                  ) : classes && classes.length > 0 ? (
                    classes.map((classItem) => (
                      <SelectItem key={classItem.id} value={String(classItem.id)}>
                        {classItem.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="empty" disabled>Không có lớp học</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {!selectedClassId && (
                <p className="text-xs text-neutral-500">Chọn lớp để hiển thị thông tin học phí và lịch học</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fee">Giá tiền</Label>
              <Input 
                id="fee"
                readOnly
                className="bg-neutral-100"
                value={selectedClass ? formatCurrency(selectedClass.fee) : ""}
              />
              <p className="text-xs text-neutral-500">Được lấy từ thông tin lớp học</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="schedule">Thời gian học</Label>
              <Input 
                id="schedule"
                readOnly
                className="bg-neutral-100"
                value={selectedClass ? selectedClass.schedule : ""}
              />
              <p className="text-xs text-neutral-500">Được lấy từ thông tin lớp học</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="paymentCycle">Chu kỳ thanh toán</Label>
              <Select 
                onValueChange={(value) => form.setValue("paymentCycle", value)}
                defaultValue={studentToEdit ? studentToEdit.paymentCycle : "1-thang"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn chu kỳ thanh toán" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-thang">1 tháng</SelectItem>
                  <SelectItem value="8-buoi">8 buổi</SelectItem>
                  <SelectItem value="10-buoi">10 buổi</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.paymentCycle && (
                <p className="text-sm text-red-500">{form.formState.errors.paymentCycle.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Tình trạng</Label>
              <Select 
                onValueChange={(value) => form.setValue("status", value)}
                defaultValue={studentToEdit ? studentToEdit.status : "active"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn tình trạng" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Đang học</SelectItem>
                  <SelectItem value="inactive">Nghỉ học</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.status && (
                <p className="text-sm text-red-500">{form.formState.errors.status.message}</p>
              )}
            </div>
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
