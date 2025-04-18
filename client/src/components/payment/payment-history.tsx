import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatPaymentCycle } from "@/utils/format";
import { formatDate } from "@/utils/date-utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Edit, Trash2, Eye, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Receipt from "../receipt/receipt";

interface PaymentHistoryProps {
  studentId?: number; // Optional, if we want to filter by student
  onPaymentChanged?: () => void; // Callback when a payment is updated/deleted
}

export default function PaymentHistory({ 
  studentId, 
  onPaymentChanged 
}: PaymentHistoryProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [paymentToEdit, setPaymentToEdit] = useState<any | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<any | null>(null);
  const [paymentToView, setPaymentToView] = useState<any | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Query to fetch all payments or payments for a specific student
  const { 
    data: payments, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: studentId 
      ? ["/api/payments/student", studentId] 
      : ["/api/payments"],
    queryFn: async () => {
      const url = studentId 
        ? `/api/payments/student/${studentId}` 
        : '/api/payments';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch payments');
      return response.json();
    }
  });

  // Query to fetch students for displaying student names
  const { data: students = [] } = useQuery<any[]>({
    queryKey: ["/api/students"],
  });

  // Mutation to update a payment
  const updatePaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest(
        "PUT", 
        `/api/payments/${data.id}`, 
        data
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/payments"] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/reports/dashboard"] 
      });
      
      if (studentId) {
        queryClient.invalidateQueries({ 
          queryKey: ["/api/payments/student", studentId] 
        });
      }
      
      toast({
        title: "Thành công",
        description: "Đã cập nhật thanh toán",
      });
      
      setIsEditDialogOpen(false);
      setPaymentToEdit(null);
      
      if (onPaymentChanged) {
        onPaymentChanged();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể cập nhật thanh toán",
        variant: "destructive",
      });
    },
  });

  // Mutation to delete a payment
  const deletePaymentMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(
        "DELETE", 
        `/api/payments/${id}`, 
        {}
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/payments"] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/reports/dashboard"] 
      });
      
      if (studentId) {
        queryClient.invalidateQueries({ 
          queryKey: ["/api/payments/student", studentId] 
        });
      }
      
      toast({
        title: "Thành công",
        description: "Đã xóa thanh toán",
      });
      
      setIsDeleteDialogOpen(false);
      setPaymentToDelete(null);
      
      if (onPaymentChanged) {
        onPaymentChanged();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể xóa thanh toán",
        variant: "destructive",
      });
    },
  });

  // Handle edit payment
  const handleEditPayment = (payment: any) => {
    setPaymentToEdit({
      ...payment,
      paymentDate: payment.paymentDate ? new Date(payment.paymentDate).toISOString().split('T')[0] : '',
      validFrom: payment.validFrom ? new Date(payment.validFrom).toISOString().split('T')[0] : '',
      validTo: payment.validTo ? new Date(payment.validTo).toISOString().split('T')[0] : '',
    });
    setIsEditDialogOpen(true);
  };

  // Handle save payment edit
  const handleSaveEdit = () => {
    if (!paymentToEdit) return;
    
    updatePaymentMutation.mutate(paymentToEdit);
  };

  // Handle delete payment
  const handleDeletePayment = (payment: any) => {
    setPaymentToDelete(payment);
    setIsDeleteDialogOpen(true);
  };

  // Confirm delete payment
  const confirmDelete = () => {
    if (paymentToDelete) {
      deletePaymentMutation.mutate(paymentToDelete.id);
    }
  };

  // Handle view receipt
  const handleViewReceipt = (payment: any) => {
    // First, get the student for this payment
    const student = students?.find(s => s.id === payment.studentId);
    if (student) {
      setPaymentToView({
        ...student,
        paymentData: payment // Include payment data to pre-populate receipt
      });
      setIsReceiptOpen(true);
    } else {
      toast({
        title: "Không tìm thấy học sinh",
        description: "Không thể tìm thấy thông tin học sinh cho thanh toán này",
        variant: "destructive",
      });
    }
  };

  // Function to get student name from ID
  const getStudentName = (studentId: number) => {
    const student = students?.find(s => s.id === studentId);
    return student ? student.name : `Học sinh #${studentId}`;
  };

  // Function to get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Đã đóng</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Chưa đóng</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Quá hạn</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Calculate total amount
  const totalAmount = payments
    ? payments.reduce((sum: number, payment: any) => sum + payment.amount, 0)
    : 0;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">Lịch sử thanh toán</h2>
      
      {isLoading ? (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4">
          <p>Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại sau.</p>
        </div>
      ) : !payments || payments.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded-md">
          <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">Chưa có thanh toán nào</p>
          {!studentId && (
            <p className="text-sm text-gray-400">Các thanh toán sẽ xuất hiện ở đây sau khi được tạo.</p>
          )}
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ngày</TableHead>
                {!studentId && <TableHead>Học sinh</TableHead>}
                <TableHead>Số tiền</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Hiệu lực từ</TableHead>
                <TableHead>Hiệu lực đến</TableHead>
                <TableHead>Ghi chú</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment: any) => (
                <TableRow key={payment.id}>
                  <TableCell>{formatDate(new Date(payment.paymentDate))}</TableCell>
                  {!studentId && (
                    <TableCell>{getStudentName(payment.studentId)}</TableCell>
                  )}
                  <TableCell className="font-medium">{formatCurrency(payment.amount)}</TableCell>
                  <TableCell>{getStatusBadge(payment.status)}</TableCell>
                  <TableCell>{formatDate(new Date(payment.validFrom))}</TableCell>
                  <TableCell>{formatDate(new Date(payment.validTo))}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={payment.notes}>
                    {payment.notes || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0" 
                        onClick={() => handleViewReceipt(payment)}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">Xem</span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0" 
                        onClick={() => handleEditPayment(payment)}
                      >
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Sửa</span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0" 
                        onClick={() => handleDeletePayment(payment)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Xóa</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={studentId ? 1 : 2} className="font-medium">
                  Tổng cộng
                </TableCell>
                <TableCell className="font-medium">{formatCurrency(totalAmount)}</TableCell>
                <TableCell colSpan={5}></TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}

      {/* Edit Payment Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa thanh toán</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="amount">Số tiền</Label>
              <Input
                id="amount"
                type="number"
                value={paymentToEdit?.amount || ""}
                onChange={(e) => setPaymentToEdit({
                  ...paymentToEdit,
                  amount: Number(e.target.value)
                })}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="status">Trạng thái</Label>
              <Select
                value={paymentToEdit?.status || "paid"}
                onValueChange={(value) => setPaymentToEdit({
                  ...paymentToEdit,
                  status: value
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Đã đóng</SelectItem>
                  <SelectItem value="pending">Chưa đóng</SelectItem>
                  <SelectItem value="overdue">Quá hạn</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="paymentDate">Ngày thanh toán</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentToEdit?.paymentDate || ""}
                onChange={(e) => setPaymentToEdit({
                  ...paymentToEdit,
                  paymentDate: e.target.value
                })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="validFrom">Hiệu lực từ</Label>
                <Input
                  id="validFrom"
                  type="date"
                  value={paymentToEdit?.validFrom || ""}
                  onChange={(e) => setPaymentToEdit({
                    ...paymentToEdit,
                    validFrom: e.target.value
                  })}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="validTo">Hiệu lực đến</Label>
                <Input
                  id="validTo"
                  type="date"
                  value={paymentToEdit?.validTo || ""}
                  onChange={(e) => setPaymentToEdit({
                    ...paymentToEdit,
                    validTo: e.target.value
                  })}
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="notes">Ghi chú</Label>
              <Input
                id="notes"
                value={paymentToEdit?.notes || ""}
                onChange={(e) => setPaymentToEdit({
                  ...paymentToEdit,
                  notes: e.target.value
                })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Hủy
            </Button>
            <Button 
              onClick={handleSaveEdit}
              disabled={updatePaymentMutation.isPending}
            >
              {updatePaymentMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                "Lưu thay đổi"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa thanh toán</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa thanh toán này? 
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletePaymentMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang xóa...
                </>
              ) : (
                "Xóa thanh toán"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Receipt View */}
      {paymentToView && (
        <Receipt
          isOpen={isReceiptOpen}
          onClose={() => {
            setIsReceiptOpen(false);
            setPaymentToView(null);
          }}
          student={paymentToView}
        />
      )}
    </div>
  );
}