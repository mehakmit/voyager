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
    SocialLogin: {
      google: {
        webClientId: '947837806868-458ks4a37llqjrl3rqel1ji937n2lt0u.apps.googleusercontent.com',
        iOSClientId: '947837806868-458ks4a37llqjrl3rqel1ji937n2lt0u.apps.googleusercontent.com',
      },
      apple: {},
    },
  },
};

export default config;
