import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RoutineDay, WeeklyRoutine } from '../contexts/onboarding-context';

const WEEKLY_REGENERATION_KEY = '@smart_meal_planner:weekly_regeneration';

type DayKey = keyof WeeklyRoutine;

export type RoutineChange = {
    dayKey: DayKey;
    dayLabel: string;
    previousType: RoutineDay['type'];
    nextType: RoutineDay['type'];
};

export type PreferenceChange = {
    key: string;
    label: string;
    detail?: string;
};

export type WeeklyRegenerationRequest = {
    weekStart: string;
    startDate: string;
    requestedAt: string;
    onboardingHash?: string | null;
    preferenceChanges: PreferenceChange[];
    routineChanges?: RoutineChange[];
};

const buildWeeklyRegenerationKey = (userId: string) => `${WEEKLY_REGENERATION_KEY}:${userId}`;

export const loadWeeklyRegenerationRequest = async (userId: string): Promise<WeeklyRegenerationRequest | null> => {
    try {
        const raw = await AsyncStorage.getItem(buildWeeklyRegenerationKey(userId));
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw) as WeeklyRegenerationRequest;
        if (!parsed?.weekStart || !parsed?.startDate) {
            return null;
        }
        const preferenceChanges = Array.isArray(parsed.preferenceChanges) ? parsed.preferenceChanges : [];
        const routineChanges = Array.isArray(parsed.routineChanges) ? parsed.routineChanges : undefined;
        return {
            ...parsed,
            preferenceChanges,
            ...(routineChanges ? { routineChanges } : {}),
        };
    } catch (error) {
        console.warn('Weekly regeneration read error:', error);
        return null;
    }
};

export const persistWeeklyRegenerationRequest = async (userId: string, request: WeeklyRegenerationRequest) => {
    try {
        await AsyncStorage.setItem(buildWeeklyRegenerationKey(userId), JSON.stringify(request));
    } catch (error) {
        console.warn('Weekly regeneration write error:', error);
    }
};

export const clearWeeklyRegenerationRequest = async (userId: string) => {
    try {
        await AsyncStorage.removeItem(buildWeeklyRegenerationKey(userId));
    } catch (error) {
        console.warn('Weekly regeneration clear error:', error);
    }
};
