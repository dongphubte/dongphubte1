/**
 * Cấu hình ứng dụng di động HoeEdu
 */

export const AppConfig = {
  // Thông tin API
  api: {
    baseUrl: 'https://api.hoeedu.com',  // Cần thay đổi thành URL thực tế khi triển khai
    timeout: 30000,
    retryCount: 3
  },
  
  // Cấu hình chung của ứng dụng
  app: {
    name: 'HoeEduMobile',
    version: '1.0.0',
    theme: {
      primaryColor: '#6366f1',
      secondaryColor: '#f43f5e',
      textColor: '#1f2937',
      backgroundColor: '#ffffff'
    }
  },
  
  // Cài đặt lưu trữ
  storage: {
    prefix: 'hoeedu_',
    encryptionKey: 'hoeedu_secure_storage'
  },
  
  // Thiết lập thông báo đẩy
  notifications: {
    enabled: true,
    channel: {
      id: 'hoeedu_channel',
      name: 'HoeEdu Notifications',
      description: 'Notifications from HoeEdu'
    }
  },
  
  // Thiết lập đồng bộ hóa
  sync: {
    interval: 15, // phút
    autoSync: true,
    syncOnStartup: true,
    syncOnNetworkChange: true
  },
  
  // Cấu hình offline mode
  offline: {
    enabled: true,
    cacheImages: true,
    maxCacheSize: 50, // MB
    cacheExpiration: 7 // ngày
  }
};