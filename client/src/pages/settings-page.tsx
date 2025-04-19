import { useState } from "react";
import { useSettings, FeeCalculationMethod } from "@/hooks/use-settings";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const { 
    settings, 
    isLoadingSettings, 
    getFeeCalculationMethod,
    setFeeCalculationMethod,
    createSettingMutation,
    updateSettingMutation,
    deleteSettingMutation 
  } = useSettings();
  const { toast } = useToast();
  
  const [feeMethod, setFeeMethod] = useState<FeeCalculationMethod>(
    getFeeCalculationMethod()
  );
  
  const [newSetting, setNewSetting] = useState({
    key: "",
    value: "",
    description: ""
  });
  
  const handleFeeMethodChange = async (value: FeeCalculationMethod) => {
    setFeeMethod(value);
    try {
      await setFeeCalculationMethod(value);
      toast({
        title: "Thành công",
        description: "Đã cập nhật phương pháp tính học phí",
      });
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật phương pháp tính học phí",
        variant: "destructive",
      });
    }
  };
  
  const handleCreateSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetting.key || !newSetting.value) {
      toast({
        title: "Lỗi",
        description: "Khóa và giá trị không được để trống",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await createSettingMutation.mutateAsync(newSetting);
      setNewSetting({ key: "", value: "", description: "" });
    } catch (error) {
      // Lỗi đã được xử lý trong mutation
    }
  };
  
  const handleUpdateSetting = async (key: string, value: string) => {
    try {
      await updateSettingMutation.mutateAsync({ key, value });
    } catch (error) {
      // Lỗi đã được xử lý trong mutation
    }
  };
  
  const handleDeleteSetting = async (key: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa cài đặt này?")) {
      try {
        await deleteSettingMutation.mutateAsync(key);
      } catch (error) {
        // Lỗi đã được xử lý trong mutation
      }
    }
  };
  
  if (isLoadingSettings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Cài đặt hệ thống</h1>
          <p className="text-muted-foreground">Quản lý các cài đặt và cấu hình hệ thống</p>
        </div>
        <Settings className="h-10 w-10 text-muted-foreground" />
      </div>
      
      <Tabs defaultValue="fee" className="space-y-6">
        <TabsList>
          <TabsTrigger value="fee">Học phí</TabsTrigger>
          <TabsTrigger value="all">Tất cả cài đặt</TabsTrigger>
          <TabsTrigger value="new">Thêm cài đặt mới</TabsTrigger>
        </TabsList>
        
        <TabsContent value="fee" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Phương pháp tính học phí</CardTitle>
              <CardDescription>
                Chọn cách tính học phí cho các lớp học
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={feeMethod}
                onValueChange={(value) => handleFeeMethodChange(value as FeeCalculationMethod)}
                className="space-y-4"
              >
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value={FeeCalculationMethod.PER_SESSION} id="per-session" />
                  <div className="grid gap-1.5">
                    <Label htmlFor="per-session" className="font-medium">
                      Tính theo buổi học
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Giá học phí được hiểu là mức phí cho mỗi buổi học. Tổng học phí = Giá × Số buổi.
                      <br />
                      <span className="italic">Ví dụ: 60,000 VND/buổi × 8 buổi = 480,000 VND</span>
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value={FeeCalculationMethod.PER_CYCLE} id="per-cycle" />
                  <div className="grid gap-1.5">
                    <Label htmlFor="per-cycle" className="font-medium">
                      Tính theo chu kỳ
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Giá học phí được hiểu là tổng chi phí cho toàn bộ chu kỳ.
                      <br />
                      <span className="italic">Ví dụ: 480,000 VND cho chu kỳ 8 buổi</span>
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>Tất cả cài đặt</CardTitle>
              <CardDescription>
                Danh sách tất cả các cài đặt trong hệ thống
              </CardDescription>
            </CardHeader>
            <CardContent>
              {settings && settings.length > 0 ? (
                <div className="space-y-4">
                  {settings.map((setting) => (
                    <div key={setting.key} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{setting.key}</h3>
                          <Badge variant="outline">{setting.id}</Badge>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteSetting(setting.key)}
                        >
                          Xóa
                        </Button>
                      </div>
                      
                      {setting.description && (
                        <p className="text-sm text-muted-foreground mb-3">{setting.description}</p>
                      )}
                      
                      <div className="flex items-end gap-4">
                        <div className="flex-1">
                          <Label htmlFor={`setting-${setting.id}`}>Giá trị</Label>
                          <Input
                            id={`setting-${setting.id}`}
                            defaultValue={setting.value}
                            onBlur={(e) => {
                              if (e.target.value !== setting.value) {
                                handleUpdateSetting(setting.key, e.target.value);
                              }
                            }}
                          />
                        </div>
                        <Badge variant="secondary">
                          Cập nhật: {new Date(setting.updatedAt).toLocaleString()}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Chưa có cài đặt nào. Hãy thêm cài đặt mới.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="new">
          <Card>
            <CardHeader>
              <CardTitle>Thêm cài đặt mới</CardTitle>
              <CardDescription>
                Tạo cài đặt mới cho hệ thống
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateSetting} className="space-y-4">
                <div>
                  <Label htmlFor="setting-key">Khóa</Label>
                  <Input
                    id="setting-key"
                    value={newSetting.key}
                    onChange={(e) => setNewSetting({ ...newSetting, key: e.target.value })}
                    placeholder="Nhập khóa cài đặt (VD: email_host)"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="setting-value">Giá trị</Label>
                  <Input
                    id="setting-value"
                    value={newSetting.value}
                    onChange={(e) => setNewSetting({ ...newSetting, value: e.target.value })}
                    placeholder="Nhập giá trị cài đặt"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="setting-description">Mô tả (tùy chọn)</Label>
                  <Input
                    id="setting-description"
                    value={newSetting.description}
                    onChange={(e) => setNewSetting({ ...newSetting, description: e.target.value })}
                    placeholder="Mô tả cài đặt này"
                  />
                </div>
                
                <Button type="submit" disabled={createSettingMutation.isPending}>
                  {createSettingMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Lưu cài đặt
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}