/**
 * Cấu hình ứng dụng di động HoeEdu
 */

export const AppConfig = {
  // Thông tin ứng dụng
  app: {
    name: 'HoeEdu Mobile',
    version: '1.0.0',
    build: '1',
    description: 'Ứng dụng quản lý giáo dục HoeEdu'
  },
  
  // Cấu hình API
  api: {
    baseUrl: '/',
    timeout: 30000, // 30 giây
    retryCount: 3,
  },
  
  // Cấu hình giao diện
  ui: {
    theme: 'system', // light, dark, system
    primaryColor: '#6366f1',
    fontScale: 1.0,
    animationsEnabled: true,
  },
  
  // Cấu hình thông báo
  notifications: {
    enabled: true,
    sound: true,
    vibration: true,
  },
  
  // Cấu hình offline
  offline: {
    enabled: true,
    syncInterval: 60 * 5, // 5 phút
    maxOfflineTime: 60 * 60 * 24 * 7, // 7 ngày
  },
  
  // Cấu hình bảo mật
  security: {
    biometricEnabled: true,
    autoLockTimeout: 60 * 5, // 5 phút
    sessionTimeout: 60 * 60 * 24 * 7, // 7 ngày
  },
  
  // Cấu hình đồng bộ
  sync: {
    autoSync: true,
    syncOnStart: true,
    syncOnConnect: true,
    backgroundSync: true,
  },
  
  // Cấu hình debug
  debug: {
    enabled: process.env.NODE_ENV === 'development',
    logLevel: 'info', // debug, info, warn, error
    crashReporting: true,
    analyticsEnabled: process.env.NODE_ENV === 'production',
  }
};