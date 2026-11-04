import * as SecureStore from 'expo-secure-store';

const REFRESH_KEY = 'vyro.refresh';

/** Refresh token in the iOS Keychain / Android Keystore; never in AsyncStorage. */
export const secureRefreshStore = {
  get: () => SecureStore.getItemAsync(REFRESH_KEY),
  async set(token: string | null) {
    if (token) await SecureStore.setItemAsync(REFRESH_KEY, token, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY });
    else await SecureStore.deleteItemAsync(REFRESH_KEY);
  },
};
