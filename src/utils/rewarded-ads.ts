import { Alert } from 'react-native';
import {
    AdEventType,
    RewardedAd,
    RewardedAdEventType,
    RewardedAdReward,
    RequestOptions,
} from 'react-native-google-mobile-ads';
import { admobConfig } from '../config/admob';

type RewardedAdOptions = {
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    requestOptions?: RequestOptions;
};

let rewardedInProgress = false;

const showRewardedAd = async (requestOptions?: RequestOptions): Promise<boolean> =>
    new Promise((resolve) => {
        if (rewardedInProgress) {
            resolve(false);
            return;
        }

        rewardedInProgress = true;
        const rewarded = RewardedAd.createForAdRequest(admobConfig.getRewardedAdUnitId(), {
            requestNonPersonalizedAdsOnly: true,
            ...requestOptions,
        });

        let resolved = false;
        const finalize = (result: boolean) => {
            if (resolved) {
                return;
            }
            resolved = true;
            rewardedInProgress = false;
            unsubscribeLoaded();
            unsubscribeEarned();
            unsubscribeClosed();
            unsubscribeError();
            resolve(result);
        };

        const unsubscribeLoaded = rewarded.addAdEventListener(
            RewardedAdEventType.LOADED,
            () => {
                rewarded.show();
            }
        );

        const unsubscribeEarned = rewarded.addAdEventListener(
            RewardedAdEventType.EARNED_REWARD,
            (_reward: RewardedAdReward) => {
                finalize(true);
            }
        );

        const unsubscribeClosed = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
            finalize(false);
        });

        const unsubscribeError = rewarded.addAdEventListener(AdEventType.ERROR, (error) => {
            console.warn('Rewarded ad error:', error);
            Alert.alert('Reklam yüklenemedi', 'Lütfen daha sonra tekrar deneyin.');
            finalize(false);
        });

        rewarded.load();
    });

export const requestRewardedAd = ({
    title = 'Reklam gerekli',
    message = 'Bu işlemi yapmak için kısa bir reklam izlemen gerekiyor.',
    confirmText = 'Reklamı izle',
    cancelText = 'Vazgeç',
    requestOptions,
}: RewardedAdOptions = {}): Promise<boolean> =>
    new Promise((resolve) => {
        Alert.alert(title, message, [
            { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
            {
                text: confirmText,
                onPress: () => {
                    showRewardedAd(requestOptions)
                        .then(resolve)
                        .catch((error) => {
                            console.warn('Rewarded ad flow error:', error);
                            Alert.alert('Reklam yüklenemedi', 'Lütfen daha sonra tekrar deneyin.');
                            resolve(false);
                        });
                },
            },
        ]);
    });
