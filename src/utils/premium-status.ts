import AsyncStorage from '@react-native-async-storage/async-storage';

const PREMIUM_OVERRIDE_KEY = '@smart_meal_planner:premium_override';

type PremiumStatus = {
    isPremium: boolean;
    updatedAt: string;
};

const buildPremiumKey = (userId: string) => `${PREMIUM_OVERRIDE_KEY}:${userId}`;

export const loadPremiumStatus = async (userId?: string | null): Promise<boolean> => {
    if (!userId) {
        return false;
    }
    try {
        const raw = await AsyncStorage.getItem(buildPremiumKey(userId));
        if (!raw) {
            return false;
        }
        const parsed = JSON.parse(raw) as PremiumStatus;
        return Boolean(parsed?.isPremium);
    } catch (error) {
        console.warn('Premium status read error:', error);
        return false;
    }
};

export const persistPremiumStatus = async (userId: string, isPremium: boolean) => {
    try {
        const payload: PremiumStatus = { isPremium, updatedAt: new Date().toISOString() };
        await AsyncStorage.setItem(buildPremiumKey(userId), JSON.stringify(payload));
    } catch (error) {
        console.warn('Premium status write error:', error);
    }
};
