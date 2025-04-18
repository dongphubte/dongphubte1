/**
 * Tiện ích cho Capacitor - Hỗ trợ các tương tác với các plugin và API của thiết bị
 */

import { Capacitor } from '@capacitor/core';

// Kiểm tra môi trường đang chạy
export const isNative = () => Capacitor.isNativePlatform();
export const isAndroid = () => Capacitor.getPlatform() === 'android';
export const isIOS = () => Capacitor.getPlatform() === 'ios';
export const isWeb = () => Capacitor.getPlatform() === 'web';

// Tiện ích thông báo (sẽ sử dụng plugins khi cài đặt)
export const showToast = async (message: string, duration: 'short' | 'long' = 'short') => {
  try {
    if (isNative()) {
      // Sử dụng Toast plugin khi đã cài đặt
      // const { Toast } = await import('@capacitor/toast');
      // await Toast.show({ text: message, duration });
      console.log('Native Toast:', message);
    } else {
      // Fallback cho web
      console.log('Toast message:', message);
      alert(message);
    }
  } catch (error) {
    console.error('Error showing toast:', error);
  }
};

// Tiện ích hiển thị hộp thoại
export const showDialog = async (options: { 
  title: string; 
  message: string;
  okText?: string;
  cancelText?: string;
}) => {
  try {
    if (isNative()) {
      // Sử dụng Dialog plugin khi đã cài đặt
      // const { Dialog } = await import('@capacitor/dialog');
      // const { value } = await Dialog.confirm({
      //   title: options.title,
      //   message: options.message,
      //   okButtonTitle: options.okText || 'OK',
      //   cancelButtonTitle: options.cancelText || 'Cancel'
      // });
      // return value;
      console.log('Native Dialog:', options);
      return window.confirm(options.message);
    } else {
      // Fallback cho web
      return window.confirm(options.message);
    }
  } catch (error) {
    console.error('Error showing dialog:', error);
    return false;
  }
};

// Lưu trữ dữ liệu cục bộ
export const storage = {
  set: async (key: string, value: any) => {
    try {
      if (isNative()) {
        // Sử dụng Storage plugin khi đã cài đặt
        // const { Storage } = await import('@capacitor/storage');
        // await Storage.set({ key, value: JSON.stringify(value) });
        localStorage.setItem(key, JSON.stringify(value));
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error('Error setting storage item:', error);
    }
  },
  
  get: async (key: string) => {
    try {
      if (isNative()) {
        // Sử dụng Storage plugin khi đã cài đặt
        // const { Storage } = await import('@capacitor/storage');
        // const { value } = await Storage.get({ key });
        // return value ? JSON.parse(value) : null;
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
      } else {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
      }
    } catch (error) {
      console.error('Error getting storage item:', error);
      return null;
    }
  },
  
  remove: async (key: string) => {
    try {
      if (isNative()) {
        // Sử dụng Storage plugin khi đã cài đặt
        // const { Storage } = await import('@capacitor/storage');
        // await Storage.remove({ key });
        localStorage.removeItem(key);
      } else {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error('Error removing storage item:', error);
    }
  },
  
  clear: async () => {
    try {
      if (isNative()) {
        // Sử dụng Storage plugin khi đã cài đặt
        // const { Storage } = await import('@capacitor/storage');
        // await Storage.clear();
        localStorage.clear();
      } else {
        localStorage.clear();
      }
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }
};

// Kiểm tra kết nối mạng
export const network = {
  isConnected: async () => {
    try {
      if (isNative()) {
        // Sử dụng Network plugin khi đã cài đặt
        // const { Network } = await import('@capacitor/network');
        // const status = await Network.getStatus();
        // return status.connected;
        return navigator.onLine;
      } else {
        return navigator.onLine;
      }
    } catch (error) {
      console.error('Error checking network connection:', error);
      return true; // Giả định là kết nối
    }
  },
  
  watchConnection: (callback: (connected: boolean) => void) => {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Trả về hàm để loại bỏ listener
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }
};

// Lấy thông tin thiết bị
export const getDeviceInfo = async () => {
  try {
    if (isNative()) {
      // Sử dụng Device plugin khi đã cài đặt
      // const { Device } = await import('@capacitor/device');
      // return await Device.getInfo();
      return {
        name: 'Mobile Device',
        platform: Capacitor.getPlatform(),
        uuid: 'unknown',
        operatingSystem: Capacitor.getPlatform(),
        osVersion: 'unknown',
        webViewVersion: 'unknown',
        model: 'unknown'
      };
    } else {
      return {
        name: navigator.userAgent,
        platform: 'web',
        uuid: 'browser',
        operatingSystem: navigator.platform,
        osVersion: 'unknown',
        webViewVersion: navigator.appVersion,
        model: 'browser'
      };
    }
  } catch (error) {
    console.error('Error getting device info:', error);
    return {
      name: 'Unknown',
      platform: 'unknown',
      uuid: 'unknown',
      operatingSystem: 'unknown',
      osVersion: 'unknown',
      webViewVersion: 'unknown',
      model: 'unknown'
    };
  }
};