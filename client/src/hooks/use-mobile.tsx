import { useEffect, useState } from 'react';

/**
 * Hook kiểm tra xem thiết bị hiện tại có phải là thiết bị di động không
 * @param breakpoint Điểm ngắt để xác định thiết bị di động (mặc định là 768px)
 * @returns boolean cho biết có phải thiết bị di động không
 */
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    // Hàm kiểm tra kích thước màn hình
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    // Kiểm tra lần đầu
    checkMobile();

    // Lắng nghe sự kiện thay đổi kích thước màn hình
    window.addEventListener('resize', checkMobile);

    // Dọn dẹp khi unmount
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, [breakpoint]);

  return isMobile;
}

/**
 * Hook kiểm tra loại thiết bị và trả về thông tin về màn hình
 * @returns Đối tượng chứa thông tin về thiết bị
 */
export function useDeviceInfo() {
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    width: 0,
    height: 0,
  });

  useEffect(() => {
    // Hàm cập nhật thông tin thiết bị
    const updateDeviceInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setDeviceInfo({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        width,
        height,
      });
    };

    // Cập nhật lần đầu
    updateDeviceInfo();

    // Lắng nghe sự kiện thay đổi kích thước màn hình
    window.addEventListener('resize', updateDeviceInfo);

    // Dọn dẹp khi unmount
    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
    };
  }, []);

  return deviceInfo;
}