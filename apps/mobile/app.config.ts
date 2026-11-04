import type { ExpoConfig } from 'expo/config';

/**
 * Brand and identifiers are configurable because the name is provisional.
 * Bundle identifiers must be replaced with ones you own before any store build.
 */
const name = process.env.EXPO_PUBLIC_BRAND_NAME || 'VYRO';
const scheme = process.env.APP_SCHEME || 'vyro';
const bundleId = process.env.APP_BUNDLE_ID || 'app.vyro.dev';
const associatedDomain = process.env.APP_LINK_DOMAIN; // e.g. app.example.com, once a domain exists

const config: ExpoConfig = {
  name,
  slug: 'vyro',
  scheme,
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  backgroundColor: '#11131C',
  ios: {
    bundleIdentifier: bundleId,
    supportsTablet: true,
    ...(associatedDomain ? { associatedDomains: [`applinks:${associatedDomain}`] } : {}),
  },
  android: {
    package: bundleId,
    adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: '#11131C' },
    ...(associatedDomain
      ? {
          intentFilters: [
            {
              action: 'VIEW',
              autoVerify: true,
              data: [{ scheme: 'https', host: associatedDomain }],
              category: ['BROWSABLE', 'DEFAULT'],
            },
          ],
        }
      : {}),
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-font',
    'expo-localization',
    ['expo-splash-screen', { image: './assets/splash.png', imageWidth: 200, resizeMode: 'contain', backgroundColor: '#11131C' }],
  ],
  experiments: { typedRoutes: false },
};

export default config;
