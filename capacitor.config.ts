import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.odyssey',
  appName: 'Odyssey',
  webDir: 'dist',
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
