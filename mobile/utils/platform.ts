/**
 * Tiện ích phát hiện nền tảng và thiết bị
 */

// Kiểm tra thiết bị di động
export const isTablet = (): boolean => {
  // Kiểm tra dựa trên User Agent (không hoàn toàn chính xác nhưng đủ cho hầu hết trường hợp)
  if (typeof navigator === 'undefined') return false;
  
  // Kiểm tra user agent
  const userAgent = navigator.userAgent.toLowerCase();
  
  // Kiểm tra người dùng đang sử dụng thiết bị tablet
  const isTabletDevice = 
    /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/.test(userAgent);
  
  // Nếu không phát hiện được qua user agent, kiểm tra kích thước màn hình
  if (!isTabletDevice) {
    // Thường tablet có màn hình rộng hơn 768px nhưng nhỏ hơn 1280px
    return window.innerWidth >= 768 && window.innerWidth < 1280;
  }
  
  return isTabletDevice;
};

// Kiểm tra smartphone
export const isSmartphone = (): boolean => {
  // Kiểm tra dựa trên User Agent
  if (typeof navigator === 'undefined') return false;
  
  const userAgent = navigator.userAgent.toLowerCase();
  
  // Kiểm tra các pattern thông dụng của thiết bị di động
  const isMobileDevice = 
    /android|webos|iphone|ipod|blackberry|iemobile|opera mini/.test(userAgent);
  
  // Nếu không phát hiện được qua user agent, kiểm tra kích thước màn hình
  if (!isMobileDevice) {
    // Smartphone thường có màn hình nhỏ hơn 768px
    return window.innerWidth < 768;
  }
  
  return isMobileDevice && !isTablet();
};

// Kiểm tra desktop
export const isDesktop = (): boolean => {
  return !isTablet() && !isSmartphone();
};

// Lấy thông tin rộng rãi hơn về nền tảng
export const getPlatformInfo = () => {
  if (typeof navigator === 'undefined') {
    return {
      platform: 'unknown',
      isIOS: false,
      isAndroid: false,
      isMobile: false,
      isTablet: false,
      isDesktop: false,
      isTouchDevice: false
    };
  }
  
  const userAgent = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isAndroid = /android/.test(userAgent);
  const isMobileDevice = isSmartphone();
  const isTabletDevice = isTablet();
  const isDesktopDevice = isDesktop();
  
  // Kiểm tra khả năng cảm ứng
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Xác định nền tảng chung
  let platform = 'unknown';
  if (isIOS) platform = 'ios';
  else if (isAndroid) platform = 'android';
  else if (isDesktopDevice) platform = 'desktop';
  
  return {
    platform,
    isIOS,
    isAndroid,
    isMobile: isMobileDevice,
    isTablet: isTabletDevice,
    isDesktop: isDesktopDevice,
    isTouchDevice
  };
};

// Lắng nghe sự thay đổi kích thước màn hình
export const addResizeListener = (callback: () => void): (() => void) => {
  if (typeof window === 'undefined') return () => {};
  
  window.addEventListener('resize', callback);
  
  return () => window.removeEventListener('resize', callback);
};