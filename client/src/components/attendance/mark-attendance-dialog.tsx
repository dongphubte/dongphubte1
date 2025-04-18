import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, X, AlertTriangle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Student } from "@shared/schema";

interface StudentWithClass extends Student {
  className: string;
  schedule: string;
}

interface MarkAttendanceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentWithClass;
}

export default function MarkAttendanceDialog({ isOpen, onClose, student }: MarkAttendanceDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>("present");
  
  const markAttendanceMutation = useMutation({
    mutationFn: async (data: { studentId: number; status: string; date: string; }) => {
      const res = await apiRequest("POST", "/api/attendance", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      toast({
        title: "Thành công",
        description: "Đã điểm danh cho học sinh",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể điểm danh cho học sinh",
        variant: "destructive",
      });
    },
  });
  
  const handleMarkAttendance = () => {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0]; // YYYY-MM-DD
    
    markAttendanceMutation.mutate({
      studentId: student.id,
      status: selectedStatus,
      date: formattedDate,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Điểm danh cho học sinh</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Học sinh</p>
              <p className="text-lg font-semibold">{student.name}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Mã học sinh</p>
              <p className="text-base">{student.code}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Lớp</p>
              <p className="text-base">{student.className}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Lịch học</p>
              <p className="text-base">{student.schedule}</p>
            </div>
            
            <div className="pt-2">
              <p className="text-sm font-medium text-gray-500 mb-3">Trạng thái điểm danh</p>
              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant={selectedStatus === "present" ? "default" : "outline"}
                  onClick={() => setSelectedStatus("present")}
                  className={`flex items-center ${selectedStatus === "present" ? "bg-green-500 hover:bg-green-600" : ""}`}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Có mặt
                </Button>
                
                <Button
                  type="button"
                  variant={selectedStatus === "absent" ? "default" : "outline"}
                  onClick={() => setSelectedStatus("absent")}
                  className={`flex items-center ${selectedStatus === "absent" ? "bg-red-500 hover:bg-red-600" : ""}`}
                >
                  <X className="mr-2 h-4 w-4" />
                  Vắng mặt
                </Button>
                
                <Button
                  type="button"
                  variant={selectedStatus === "teacher_absent" ? "default" : "outline"}
                  onClick={() => setSelectedStatus("teacher_absent")}
                  className={`flex items-center ${selectedStatus === "teacher_absent" ? "bg-amber-500 hover:bg-amber-600" : ""}`}
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  GV nghỉ
                </Button>
              </div>
            </div>
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
            type="button"
            onClick={handleMarkAttendance}
            disabled={markAttendanceMutation.isPending}
          >
            {markAttendanceMutation.isPending ? "Đang xử lý..." : "Điểm danh"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}