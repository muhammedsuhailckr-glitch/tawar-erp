import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tawarhomes.app',
  appName: 'Tawar Homes',
  webDir: 'public',
  server: {
    url: 'https://01.tawarventures.workers.dev',
    cleartext: false
  }
};

export default config;