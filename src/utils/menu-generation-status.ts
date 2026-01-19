/**
 * Menu Generation Status Utility
 * Subscribes to the menuGenerationStatus Firestore document for real-time updates
 */

import firestore from '@react-native-firebase/firestore';

export type MenuGenerationState = 'pending' | 'in_progress' | 'completed' | 'failed';

export type MenuGenerationStatus = {
    state: MenuGenerationState;
    startedAt?: string;
    completedAt?: string;
    updatedAt?: string;
    completedDays: number;
    totalDays: number;
    error?: string;
};

/**
 * Get the week start date in YYYY-MM-DD format for the current or given date.
 * Week starts on Monday.
 */
export const getWeekStartDate = (date?: Date): string => {
    const base = date ?? new Date();
    const reference = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    const dayIndex = (reference.getDay() + 6) % 7; // Monday = 0
    const start = new Date(reference);
    start.setDate(reference.getDate() - dayIndex);

    const year = start.getFullYear();
    const month = `${start.getMonth() + 1}`.padStart(2, '0');
    const day = `${start.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Build the status document ID for a user and week.
 */
const buildStatusDocId = (userId: string, weekStart: string): string =>
    `${userId}_${weekStart}`;

/**
 * Parse the Firestore document data into MenuGenerationStatus.
 */
const parseStatusDoc = (data: Record<string, unknown> | undefined): MenuGenerationStatus => {
    if (!data) {
        return {
            state: 'pending',
            completedDays: 0,
            totalDays: 0,
        };
    }

    return {
        state: (data.status as MenuGenerationState) ?? 'pending',
        startedAt: data.startedAt as string | undefined,
        completedAt: data.completedAt as string | undefined,
        updatedAt: data.updatedAt as string | undefined,
        completedDays: (data.completedDays as number) ?? 0,
        totalDays: (data.totalDays as number) ?? 0,
        error: data.error as string | undefined,
    };
};

/**
 * Subscribe to menu generation status changes.
 * Returns an unsubscribe function.
 */
export const subscribeToMenuGenerationStatus = (
    userId: string,
    weekStart: string,
    onStatusChange: (status: MenuGenerationStatus) => void
): (() => void) => {
    const statusDocId = buildStatusDocId(userId, weekStart);

    const unsubscribe = firestore()
        .collection('menuGenerationStatus')
        .doc(statusDocId)
        .onSnapshot(
            (snapshot) => {
                const data = snapshot.data() as Record<string, unknown> | undefined;
                const status = parseStatusDoc(data);
                onStatusChange(status);
            },
            (error) => {
                console.error('[MenuGenerationStatus] Subscription error:', error);
                // On error, assume pending state
                onStatusChange({
                    state: 'pending',
                    completedDays: 0,
                    totalDays: 0,
                });
            }
        );

    return unsubscribe;
};

/**
 * Get the current menu generation status (one-time fetch).
 */
export const getMenuGenerationStatus = async (
    userId: string,
    weekStart: string
): Promise<MenuGenerationStatus> => {
    const statusDocId = buildStatusDocId(userId, weekStart);

    try {
        const snapshot = await firestore()
            .collection('menuGenerationStatus')
            .doc(statusDocId)
            .get();

        const data = snapshot.data() as Record<string, unknown> | undefined;
        return parseStatusDoc(data);
    } catch (error) {
        console.error('[MenuGenerationStatus] Fetch error:', error);
        return {
            state: 'pending',
            completedDays: 0,
            totalDays: 0,
        };
    }
};

// Legacy export for backwards compatibility
export const checkWeeklyMenuCompleteness = async (
    userId: string,
    startDate?: Date
): Promise<{ complete: boolean; generatedDays: number; totalDays: number; missingDays: string[] }> => {
    const weekStart = getWeekStartDate(startDate);
    const status = await getMenuGenerationStatus(userId, weekStart);

    return {
        complete: status.state === 'completed',
        generatedDays: status.completedDays,
        totalDays: status.totalDays,
        missingDays: [], // No longer tracked per-day
    };
};

