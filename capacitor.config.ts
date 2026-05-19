import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.odyssey',
  appName: 'Odyssey',
  webDir: 'dist',
  server: {
    url: 'https://voyager-301a2.web.app',
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#070e1c',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
};

export default config;
