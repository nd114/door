export interface CapacitorConfig {
  appId: string;
  appName: string;
  webDir: string;
  server?: {
    androidScheme?: string;
    cleartext?: boolean;
    url?: string;
  };
  plugins?: Record<string, unknown>;
  ios?: {
    handleApplicationNotifications?: boolean;
    contentInset?: string;
  };
  android?: {
    backgroundColor?: string;
  };
}

const config: CapacitorConfig = {
  appId: 'com.door.app',
  appName: 'Door',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  plugins: {
    Haptics: {
      selection: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  ios: {
    handleApplicationNotifications: true,
    contentInset: 'always',
  },
  android: {
    backgroundColor: '#07080b',
  },
};

export default config;

