import AsyncStorage from '@react-native-async-storage/async-storage';

export type MenuChangeSignal = {
    updatedAt: string;
    dateKey?: string;
    source?: string;
};

const STORAGE_KEY = '@smart_meal_planner:menu_change_signal';

export const setMenuChangeSignal = async (signal: MenuChangeSignal) => {
    try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(signal));
    } catch (error) {
        console.warn('Failed to set menu change signal:', error);
    }
};

export const consumeMenuChangeSignal = async (): Promise<MenuChangeSignal | null> => {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return null;
        }
        await AsyncStorage.removeItem(STORAGE_KEY);
        return JSON.parse(raw) as MenuChangeSignal;
    } catch (error) {
        console.warn('Failed to read menu change signal:', error);
        return null;
    }
};
