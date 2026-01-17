/**
 * Menu Generation Status Utility
 * Checks if all days of the week have generated menus
 */

import firestore from '@react-native-firebase/firestore';

export type MenuGenerationStatus = {
    complete: boolean;
    generatedDays: number;
    totalDays: number;
    missingDays: string[];
};

/**
 * Build date keys for the current week (Monday to Sunday).
 * If startDate is provided, only include that day and later.
 */
export const buildWeekDateKeys = (startDate?: Date): string[] => {
    const base = startDate ?? new Date();
    const reference = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    const dayIndex = (reference.getDay() + 6) % 7; // Monday = 0
    const start = new Date(reference);
    start.setDate(reference.getDate() - dayIndex);

    const keys: string[] = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        if (startDate && d.getTime() < reference.getTime()) {
            continue;
        }
        const year = d.getFullYear();
        const month = `${d.getMonth() + 1}`.padStart(2, '0');
        const day = `${d.getDate()}`.padStart(2, '0');
        keys.push(`${year}-${month}-${day}`);
    }
    return keys;
};

/**
 * Check if all 7 days of the current week have dinner menus in Firestore
 * Uses dinner as the proxy for "day is generated" since it's the most common meal
 */
export const checkWeeklyMenuCompleteness = async (
    userId: string,
    startDate?: Date
): Promise<MenuGenerationStatus> => {
    const weekDates = buildWeekDateKeys(startDate);
    const totalDays = weekDates.length;
    const missingDays: string[] = [];

    // Check each day's dinner menu
    const checks = await Promise.all(
        weekDates.map(async (dateKey) => {
            const menuDocId = `${userId}_${dateKey}_dinner`;
            const doc = await firestore()
                .collection('menus')
                .doc(menuDocId)
                .get();
            return { dateKey, exists: doc.exists };
        })
    );

    checks.forEach(({ dateKey, exists }) => {
        if (!exists) {
            missingDays.push(dateKey);
        }
    });

    const generatedDays = totalDays - missingDays.length;

    return {
        complete: missingDays.length === 0,
        generatedDays,
        totalDays,
        missingDays,
    };
};

/**
 * Subscribe to menu generation completion
 * Calls onComplete when all days are generated
 */
export const subscribeToMenuCompletion = (
    userId: string,
    onStatusChange: (status: MenuGenerationStatus) => void,
    intervalMs: number = 5000,
    startDate?: Date
): (() => void) => {
    let cancelled = false;

    const poll = async () => {
        if (cancelled) return;

        const status = await checkWeeklyMenuCompleteness(userId, startDate);
        onStatusChange(status);

        if (!status.complete && !cancelled) {
            setTimeout(poll, intervalMs);
        }
    };

    // Start polling
    poll();

    // Return cleanup function
    return () => {
        cancelled = true;
    };
};
