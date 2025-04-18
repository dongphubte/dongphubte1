/**
 * Entry point cho phiên bản di động của HoeEdu
 */

// Export components
export { DeviceInfo } from './components/DeviceInfo';
export { TabletLayout } from './components/TabletLayout';

// Export utils
export * from './utils/capacitor-utils';
export * from './utils/platform';

// Export configs
export { AppConfig } from './config/app-config';

// Version information
export const MobileVersion = {
  version: '1.0.0',
  build: '1',
  platform: 'capacitor',
  environment: process.env.NODE_ENV || 'production'
};