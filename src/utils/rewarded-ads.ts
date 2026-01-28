import { Alert } from 'react-native';

type RewardedAdOptions = {
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
};

export const requestRewardedAd = ({
    title = 'Reklam gerekli',
    message = 'Bu işlemi yapmak için kısa bir reklam izlemen gerekiyor.',
    confirmText = 'Reklamı izle',
    cancelText = 'Vazgeç',
}: RewardedAdOptions = {}): Promise<boolean> =>
    new Promise((resolve) => {
        Alert.alert(title, message, [
            { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
            { text: confirmText, onPress: () => resolve(true) },
        ]);
    });
