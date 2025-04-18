import { useState, useEffect } from 'react';

// Interface cho thông tin thiết bị
export interface DeviceInfo {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  orientation: 'portrait' | 'landscape';
  userAgent: string;
}

/**
 * Hook kiểm tra nếu thiết bị là di động (Điện thoại hoặc máy tính bảng)
 * @returns boolean
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  
  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth;
      setIsMobile(width < 1024); // Coi thiết bị có width < 1024px là thiết bị di động
    };
    
    // Kiểm tra khi mount
    checkMobile();
    
    // Kiểm tra khi thay đổi kích thước
    window.addEventListener('resize', checkMobile);
    
    // Dọn dẹp
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return isMobile;
}

/**
 * Hook lấy thông tin chi tiết về thiết bị
 * @returns DeviceInfo
 */
export function useDeviceInfo(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    orientation: 'portrait',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  });
  
  useEffect(() => {
    const updateDeviceInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1024;
      const isDesktop = width >= 1024;
      const orientation = height > width ? 'portrait' : 'landscape';
      const userAgent = navigator.userAgent;
      
      setDeviceInfo({
        width,
        height,
        isMobile,
        isTablet,
        isDesktop,
        orientation,
        userAgent,
      });
    };
    
    // Cập nhật khi mount
    updateDeviceInfo();
    
    // Cập nhật khi thay đổi kích thước
    window.addEventListener('resize', updateDeviceInfo);
    
    // Dọn dẹp
    return () => window.removeEventListener('resize', updateDeviceInfo);
  }, []);
  
  return deviceInfo;
}

/**
 * Hook kiểm tra thiết bị có phải là tablet hay không
 * @returns boolean
 */
export function useIsTablet(): boolean {
  const deviceInfo = useDeviceInfo();
  return deviceInfo.isTablet;
}

/**
 * Hook kiểm tra thiết bị có phải là điện thoại hay không
 * @returns boolean
 */
export function useIsPhone(): boolean {
  const deviceInfo = useDeviceInfo();
  return deviceInfo.isMobile;
}

/**
 * Hook kiểm tra thiết bị có phải là desktop hay không
 * @returns boolean
 */
export function useIsDesktop(): boolean {
  const deviceInfo = useDeviceInfo();
  return deviceInfo.isDesktop;
}

/**
 * Hook lấy hướng màn hình (ngang hay dọc)
 * @returns 'portrait' | 'landscape'
 */
export function useOrientation(): 'portrait' | 'landscape' {
  const deviceInfo = useDeviceInfo();
  return deviceInfo.orientation;
}