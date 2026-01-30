import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

const PROD_REWARDED_AD_UNIT_IDS = {
    ios: 'ca-app-pub-5638979274291428/2245405130',
    android: 'ca-app-pub-5638979274291428/9932323466',
} as const;

export const admobConfig = {
    appIds: {
        ios: 'ca-app-pub-5638979274291428~7497731810',
        android: 'ca-app-pub-5638979274291428~9613992793',
    },
    getRewardedAdUnitId() {
        if (__DEV__) {
            return TestIds.REWARDED;
        }
        return Platform.OS === 'android' ? PROD_REWARDED_AD_UNIT_IDS.android : PROD_REWARDED_AD_UNIT_IDS.ios;
    },
} as const;
