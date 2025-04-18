import React, { useEffect, useState } from 'react';
import { getDeviceInfo, isNative, network, showToast, storage } from '../utils/capacitor-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

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
  const [deviceData, setDeviceData] = useState<DeviceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [networkStatus, setNetworkStatus] = useState<boolean>(true);

  useEffect(() => {
    // Lấy thông tin thiết bị khi component được render
    async function loadDeviceInfo() {
      try {
        setIsLoading(true);
        const info = await getDeviceInfo();
        const isOnline = await network.isConnected();
        
        setDeviceData({
          platform: info.platform,
          model: info.model || 'Unknown',
          osVersion: info.osVersion || 'Unknown',
          uuid: info.uuid || 'Unknown',
          isOnline,
          appInfo: {
            name: 'HoeEdu Mobile',
            version: '1.0.0',
            build: '1'
          }
        });
      } catch (error) {
        console.error('Error loading device info:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadDeviceInfo();

    // Thiết lập theo dõi kết nối mạng
    const unsubscribe = network.watchConnection((connected) => {
      setNetworkStatus(connected);
      if (connected) {
        showToast('Đã kết nối mạng trở lại');
      } else {
        showToast('Mất kết nối mạng, chuyển sang chế độ ngoại tuyến');
      }
    });

    // Cleanup
    return () => {
      unsubscribe();
    };
  }, []);

  const handleTestStorage = async () => {
    try {
      await storage.set('test_key', { timestamp: new Date().toISOString() });
      showToast('Đã lưu dữ liệu vào storage');
      
      const data = await storage.get('test_key');
      showToast(`Đã đọc dữ liệu: ${JSON.stringify(data)}`);
    } catch (error) {
      console.error('Storage test error:', error);
      showToast('Lỗi khi kiểm tra storage');
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
                <p className="text-sm font-medium text-gray-500">Phiên bản hệ điều hành</p>
                <p className="font-medium">{deviceData.osVersion}</p>
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
                <p className="text-sm font-medium">{isNative() ? 'Ứng dụng gốc (Native)' : 'Web'}</p>
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