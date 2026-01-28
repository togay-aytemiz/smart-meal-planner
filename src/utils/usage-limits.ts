import AsyncStorage from '@react-native-async-storage/async-storage';

const USAGE_LIMITS_KEY = '@smart_meal_planner:usage_limits';

type WeeklyUsage = {
    weekStart: string;
    recipeViews: number;
    updatedAt: string;
};

const buildDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const resolveWeekStartKey = (date: Date) => {
    const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayIndex = (weekStart.getDay() + 6) % 7;
    weekStart.setDate(weekStart.getDate() - dayIndex);
    return buildDateKey(weekStart);
};

const parseDateKey = (dateKey: string) => {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day);
};

const buildUsageKey = (userId: string, weekStart: string) => `${USAGE_LIMITS_KEY}:${userId}:${weekStart}`;

export const getWeeklyRecipeViews = async (userId: string, dateKey: string): Promise<number> => {
    try {
        const weekStart = resolveWeekStartKey(parseDateKey(dateKey));
        const raw = await AsyncStorage.getItem(buildUsageKey(userId, weekStart));
        if (!raw) {
            return 0;
        }
        const parsed = JSON.parse(raw) as WeeklyUsage;
        return typeof parsed?.recipeViews === 'number' ? parsed.recipeViews : 0;
    } catch (error) {
        console.warn('Weekly usage read error:', error);
        return 0;
    }
};

export const incrementWeeklyRecipeViews = async (
    userId: string,
    dateKey: string,
    incrementBy = 1
): Promise<number> => {
    try {
        const weekStart = resolveWeekStartKey(parseDateKey(dateKey));
        const key = buildUsageKey(userId, weekStart);
        const raw = await AsyncStorage.getItem(key);
        const parsed = raw ? (JSON.parse(raw) as WeeklyUsage) : null;
        const current = typeof parsed?.recipeViews === 'number' ? parsed.recipeViews : 0;
        const next = current + incrementBy;
        const payload: WeeklyUsage = {
            weekStart,
            recipeViews: next,
            updatedAt: new Date().toISOString(),
        };
        await AsyncStorage.setItem(key, JSON.stringify(payload));
        return next;
    } catch (error) {
        console.warn('Weekly usage write error:', error);
        return 0;
    }
};
