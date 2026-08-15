import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.colexplore.app',
  appName: 'ColExplore',
  webDir: 'build',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '212388302936-drc74cquj0r94r1iv4ki9nvu4ebkdbr0.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
