import { useQuery, useMutation } from "@tanstack/react-query";
import { Setting } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export const FEE_CALCULATION_METHOD = "fee_calculation_method";

// Các phương pháp tính học phí
export enum FeeCalculationMethod {
  PER_SESSION = "per_session", // Tính theo giá mỗi buổi
  PER_CYCLE = "per_cycle" // Tính theo giá cả chu kỳ
}

export function useSettings() {
  const { toast } = useToast();

  // Lấy tất cả cài đặt
  const { 
    data: settings, 
    isLoading: isLoadingSettings,
    error: settingsError
  } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const response = await fetch("/api/settings");
      if (!response.ok) {
        throw new Error("Không thể lấy cài đặt hệ thống");
      }
      return response.json() as Promise<Setting[]>;
    }
  });

  // Lấy một cài đặt cụ thể
  const getSetting = (key: string): string | undefined => {
    if (!settings) return undefined;
    const setting = settings.find(s => s.key === key);
    return setting?.value;
  };

  // Xác định phương pháp tính học phí hiện tại
  const getFeeCalculationMethod = (): FeeCalculationMethod => {
    const method = getSetting(FEE_CALCULATION_METHOD);
    return method as FeeCalculationMethod || FeeCalculationMethod.PER_SESSION;
  };

  // Tạo cài đặt mới
  const createSettingMutation = useMutation({
    mutationFn: async (data: { key: string; value: string; description?: string }) => {
      const response = await apiRequest("POST", "/api/settings", data);
      return response.json() as Promise<Setting>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Thành công",
        description: "Đã tạo cài đặt mới",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description: `Không thể tạo cài đặt: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Cập nhật cài đặt
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const response = await apiRequest("PUT", `/api/settings/${key}`, { value });
      return response.json() as Promise<Setting>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Thành công",
        description: "Đã cập nhật cài đặt",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description: `Không thể cập nhật cài đặt: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Xóa cài đặt
  const deleteSettingMutation = useMutation({
    mutationFn: async (key: string) => {
      await apiRequest("DELETE", `/api/settings/${key}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Thành công",
        description: "Đã xóa cài đặt",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description: `Không thể xóa cài đặt: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Cài đặt hoặc cập nhật phương pháp tính học phí
  const setFeeCalculationMethod = async (method: FeeCalculationMethod) => {
    const currentMethod = getSetting(FEE_CALCULATION_METHOD);
    
    if (currentMethod) {
      // Cập nhật nếu đã tồn tại
      return updateSettingMutation.mutateAsync({ key: FEE_CALCULATION_METHOD, value: method });
    } else {
      // Tạo mới nếu chưa tồn tại
      return createSettingMutation.mutateAsync({ 
        key: FEE_CALCULATION_METHOD, 
        value: method,
        description: "Phương pháp tính học phí (per_session: tính theo buổi, per_cycle: tính theo chu kỳ)"
      });
    }
  };

  return {
    settings,
    isLoadingSettings,
    settingsError,
    getSetting,
    getFeeCalculationMethod,
    setFeeCalculationMethod,
    createSettingMutation,
    updateSettingMutation,
    deleteSettingMutation
  };
}