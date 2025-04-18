import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useDeviceInfo } from '@/hooks/use-mobile';

interface DeviceInfoProps {
  onClose?: () => void;
}

interface DeviceData {
  platform: string;
  model: string;
  osVersion: string;
  uuid: string;
  isOnline: boolean;
  appInfo: {
    name: string;
    version: string;
    build: string;
  }
}

/**
 * Thành phần hiển thị thông tin thiết bị cho ứng dụng di động
 */
export function DeviceInfo({ onClose }: DeviceInfoProps) {
  const deviceInfo = useDeviceInfo();
  const [isLoading, setIsLoading] = useState(true);
  const [networkStatus, setNetworkStatus] = useState<boolean>(true);
  const [deviceData, setDeviceData] = useState<DeviceData | null>(null);

  useEffect(() => {
    // Giả lập lấy thông tin thiết bị
    const loadDeviceInfo = () => {
      setIsLoading(true);
      
      // Trì hoãn 1 giây để giả lập việc tải dữ liệu
      setTimeout(() => {
        setDeviceData({
          platform: navigator.platform,
          model: 'Web Browser',
          osVersion: navigator.userAgent,
          uuid: 'web-simulator-' + Math.random().toString(36).substring(2, 15),
          isOnline: navigator.onLine,
          appInfo: {
            name: 'HoeEdu Mobile',
            version: '1.0.0',
            build: '1'
          }
        });
        
        setIsLoading(false);
      }, 1000);
    };
    
    loadDeviceInfo();
    
    // Giả lập theo dõi kết nối mạng
    const handleOnline = () => {
      setNetworkStatus(true);
    };
    
    const handleOffline = () => {
      setNetworkStatus(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleTestStorage = () => {
    try {
      const testKey = 'test_storage_key';
      const testValue = { timestamp: new Date().toISOString() };
      
      // Lưu vào localStorage
      localStorage.setItem(testKey, JSON.stringify(testValue));
      
      // Hiển thị thông báo
      alert('Đã lưu dữ liệu thành công vào localStorage');
      
      // Đọc lại dữ liệu
      const savedData = localStorage.getItem(testKey);
      if (savedData) {
        alert(`Đã đọc dữ liệu: ${savedData}`);
      }
    } catch (error) {
      console.error('Lỗi khi kiểm tra storage:', error);
      alert('Lỗi khi kiểm tra storage');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Thông tin thiết bị</CardTitle>
        <CardDescription>
          Thông tin chi tiết về thiết bị của bạn và phiên bản ứng dụng
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : deviceData ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">Nền tảng</p>
                <p className="font-medium">{deviceData.platform}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">Thiết bị</p>
                <p className="font-medium">{deviceData.model}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">Kích thước màn hình</p>
                <p className="font-medium">{deviceInfo.width} x {deviceInfo.height}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">ID thiết bị</p>
                <p className="font-medium text-xs truncate">{deviceData.uuid}</p>
              </div>
            </div>
            
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500">Trạng thái mạng</p>
                <div className={`flex items-center ${networkStatus ? 'text-green-600' : 'text-red-600'}`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${networkStatus ? 'bg-green-600' : 'bg-red-600'}`}></div>
                  <p className="font-medium">{networkStatus ? 'Trực tuyến' : 'Ngoại tuyến'}</p>
                </div>
              </div>
            </div>
            
            <div className="pt-2 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-500 mb-2">Thông tin ứng dụng</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Tên</p>
                  <p className="font-medium">{deviceData.appInfo.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Phiên bản</p>
                  <p className="font-medium">{deviceData.appInfo.version}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Build</p>
                  <p className="font-medium">{deviceData.appInfo.build}</p>
                </div>
              </div>
            </div>
            
            <div className="pt-2 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-500 mb-2">Môi trường</p>
              <div className="bg-gray-100 rounded-lg p-2">
                <p className="text-sm font-medium">Web (Mô phỏng)</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center py-8 text-gray-500">Không thể tải thông tin thiết bị</p>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={handleTestStorage}>
          Kiểm tra Storage
        </Button>
        {onClose && (
          <Button onClick={onClose}>
            Đóng
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}