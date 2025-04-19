import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Setting } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export enum FeeCalculationMethod {
  PER_SESSION = "PER_SESSION", // Học phí tính theo buổi học
  PER_CYCLE = "PER_CYCLE"      // Học phí tính theo chu kỳ
}

const FEE_METHOD_SETTING_KEY = "fee_calculation_method";

export function useSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Truy vấn tất cả cài đặt
  const { 
    data: settings, 
    isLoading: isLoadingSettings,
    error 
  } = useQuery<Setting[]>({
    queryKey: ["/api/settings"],
    staleTime: 5 * 60 * 1000, // Cache 5 phút
  });
  
  // Tạo mới một cài đặt
  const createSettingMutation = useMutation({
    mutationFn: async (settingData: {key: string, value: string, description?: string}) => {
      const res = await apiRequest("POST", "/api/settings", settingData);
      return res.json();
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
        description: error.message || "Không thể tạo cài đặt mới",
        variant: "destructive",
      });
    },
  });
  
  // Cập nhật một cài đặt
  const updateSettingMutation = useMutation({
    mutationFn: async ({key, value}: {key: string, value: string}) => {
      const res = await apiRequest("PUT", `/api/settings/${key}`, { value });
      return res.json();
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
        description: error.message || "Không thể cập nhật cài đặt",
        variant: "destructive",
      });
    },
  });
  
  // Xóa một cài đặt
  const deleteSettingMutation = useMutation({
    mutationFn: async (key: string) => {
      const res = await apiRequest("DELETE", `/api/settings/${key}`);
      return res.json();
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
        description: error.message || "Không thể xóa cài đặt",
        variant: "destructive",
      });
    },
  });
  
  // Hàm lấy giá trị của một cài đặt theo khóa
  const getSetting = (key: string): string | null => {
    if (!settings) return null;
    const setting = settings.find(s => s.key === key);
    return setting ? setting.value : null;
  };
  
  // Hàm lấy phương pháp tính học phí hiện tại
  const getFeeCalculationMethod = (): FeeCalculationMethod => {
    const method = getSetting(FEE_METHOD_SETTING_KEY);
    return method === FeeCalculationMethod.PER_CYCLE 
      ? FeeCalculationMethod.PER_CYCLE 
      : FeeCalculationMethod.PER_SESSION; // Mặc định là tính theo buổi học
  };
  
  // Hàm đặt phương pháp tính học phí
  const setFeeCalculationMethod = async (method: FeeCalculationMethod): Promise<void> => {
    // Kiểm tra xem cài đặt đã tồn tại chưa
    const currentMethod = getSetting(FEE_METHOD_SETTING_KEY);
    
    if (currentMethod === null) {
      // Chưa có cài đặt, tạo mới
      await createSettingMutation.mutateAsync({
        key: FEE_METHOD_SETTING_KEY,
        value: method,
        description: "Phương pháp tính học phí: PER_SESSION (theo buổi) hoặc PER_CYCLE (theo chu kỳ)"
      });
    } else {
      // Đã có cài đặt, cập nhật
      await updateSettingMutation.mutateAsync({
        key: FEE_METHOD_SETTING_KEY,
        value: method
      });
    }
  };
  
  return {
    settings,
    isLoadingSettings,
    error,
    getSetting,
    getFeeCalculationMethod,
    setFeeCalculationMethod,
    createSettingMutation,
    updateSettingMutation,
    deleteSettingMutation
  };
}