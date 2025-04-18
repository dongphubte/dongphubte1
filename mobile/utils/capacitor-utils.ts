/**
 * Tiện ích cho Capacitor - Hỗ trợ các tương tác với các plugin và API của thiết bị
 */

// Giả lập các chức năng Capacitor khi chạy trên web
// Khi ứng dụng được build cho thiết bị di động, các hàm này sẽ được thay thế bởi các hàm thật

// Kiểm tra môi trường
export const isNative = () => false; // Giả lập là đang chạy trên web
export const isAndroid = () => false;
export const isIOS = () => false;
export const isWeb = () => true;

// Hiển thị thông báo Toast
export const showToast = async (message: string, duration: 'short' | 'long' = 'short') => {
  console.log('Show Toast:', message);
  
  // Giả lập toast trên web
  const toast = document.createElement('div');
  toast.innerText = message;
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.backgroundColor = 'rgba(0,0,0,0.7)';
  toast.style.color = 'white';
  toast.style.padding = '10px 20px';
  toast.style.borderRadius = '5px';
  toast.style.zIndex = '9999';
  
  document.body.appendChild(toast);
  
  // Tự động ẩn sau thời gian
  setTimeout(() => {
    document.body.removeChild(toast);
  }, duration === 'short' ? 2000 : 3500);
};

// Hiển thị hộp thoại
export const showDialog = async (options: { 
  title: string; 
  message: string; 
  okText?: string; 
  cancelText?: string;
}) => {
  console.log('Show Dialog:', options);
  
  // Sử dụng confirm của browser khi chạy trên web
  return window.confirm(`${options.title}\n\n${options.message}`);
};

// Lưu trữ dữ liệu
export const storage = {
  set: async (key: string, value: any) => {
    console.log('Storage set:', key, value);
    localStorage.setItem(key, JSON.stringify(value));
  },
  get: async (key: string) => {
    console.log('Storage get:', key);
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  },
  remove: async (key: string) => {
    console.log('Storage remove:', key);
    localStorage.removeItem(key);
  },
  clear: async () => {
    console.log('Storage clear');
    localStorage.clear();
  }
};

// Kiểm tra kết nối mạng
export const network = {
  isConnected: async () => {
    return navigator.onLine;
  },
  getStatus: async () => {
    return {
      connected: navigator.onLine,
      connectionType: navigator.onLine ? 'wifi' : 'none'
    };
  },
  watchConnection: (callback: (connected: boolean) => void) => {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Trả về hàm để remove listeners
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }
};

// Lấy thông tin thiết bị
export const getDeviceInfo = async () => {
  return {
    platform: 'web',
    model: 'Web Browser',
    osVersion: navigator.userAgent,
    uuid: 'web-simulator',
    appVersion: '1.0.0',
    appBuild: '1',
    manufacturer: 'Unknown',
    isVirtual: false,
    memUsed: 0,
    diskFree: 0,
    diskTotal: 0,
    batteryLevel: 100,
    isCharging: true
  };
};