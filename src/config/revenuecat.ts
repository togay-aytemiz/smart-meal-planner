import { Platform } from 'react-native';

const DEFAULT_TEST_KEY = 'test_eebluAcSBvgeRrNpwMFXaTNfiXS';

export const revenueCatConfig = {
    apiKeys: {
        ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? DEFAULT_TEST_KEY,
        android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? DEFAULT_TEST_KEY,
    },
    entitlementId: 'Omnoo Unlimited',
    getApiKey() {
        return Platform.OS === 'android' ? this.apiKeys.android : this.apiKeys.ios;
    },
} as const;
