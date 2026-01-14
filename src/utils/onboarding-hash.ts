import type { RoutineDay, WeeklyRoutine } from '../contexts/onboarding-context';

export type OnboardingSnapshot = {
    profile?: { name?: string; avatarUrl?: string };
    householdSize?: number;
    dietary?: { restrictions?: string[]; allergies?: string[] };
    cuisine?: { selected?: string[] };
    cooking?: {
        timePreference?: 'quick' | 'balanced' | 'elaborate';
        skillLevel?: 'beginner' | 'intermediate' | 'expert';
        equipment?: string[];
    };
    routines?: WeeklyRoutine;
};

const DEFAULT_ROUTINES: WeeklyRoutine = {
    monday: { type: 'office', gymTime: 'none' },
    tuesday: { type: 'office', gymTime: 'none' },
    wednesday: { type: 'office', gymTime: 'none' },
    thursday: { type: 'office', gymTime: 'none' },
    friday: { type: 'office', gymTime: 'none' },
    saturday: { type: 'remote', gymTime: 'none' },
    sunday: { type: 'remote', gymTime: 'none' },
};

const normalizeString = (value: string) => value.trim().toLocaleLowerCase('tr-TR');

const normalizeList = (values?: string[]) => {
    if (!values?.length) {
        return [];
    }
    const cleaned = values
        .map((item) => normalizeString(item))
        .filter((item) => item.length > 0);
    return Array.from(new Set(cleaned)).sort();
};

const normalizeRoutineDay = (value: RoutineDay | undefined, fallback: RoutineDay): RoutineDay => ({
    type: value?.type ?? fallback.type,
    gymTime: value?.gymTime ?? fallback.gymTime,
    officeMealToGo: value?.officeMealToGo ?? fallback.officeMealToGo,
    officeBreakfastAtHome: value?.officeBreakfastAtHome ?? fallback.officeBreakfastAtHome,
    schoolBreakfast: value?.schoolBreakfast ?? fallback.schoolBreakfast,
    remoteMeals: value?.remoteMeals ?? fallback.remoteMeals,
    excludeFromPlan: value?.excludeFromPlan ?? fallback.excludeFromPlan,
});

const normalizeWeeklyRoutine = (value: WeeklyRoutine | undefined): WeeklyRoutine => ({
    monday: normalizeRoutineDay(value?.monday, DEFAULT_ROUTINES.monday),
    tuesday: normalizeRoutineDay(value?.tuesday, DEFAULT_ROUTINES.tuesday),
    wednesday: normalizeRoutineDay(value?.wednesday, DEFAULT_ROUTINES.wednesday),
    thursday: normalizeRoutineDay(value?.thursday, DEFAULT_ROUTINES.thursday),
    friday: normalizeRoutineDay(value?.friday, DEFAULT_ROUTINES.friday),
    saturday: normalizeRoutineDay(value?.saturday, DEFAULT_ROUTINES.saturday),
    sunday: normalizeRoutineDay(value?.sunday, DEFAULT_ROUTINES.sunday),
});

const hashString = (value: string) => {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
        hash = (hash << 5) - hash + value.charCodeAt(index);
        hash |= 0;
    }
    return (hash >>> 0).toString(36);
};

export const buildOnboardingHash = (snapshot?: OnboardingSnapshot | null) => {
    if (!snapshot) {
        return null;
    }

    const normalized = {
        householdSize: snapshot.householdSize ?? 1,
        dietary: {
            restrictions: normalizeList(snapshot.dietary?.restrictions),
            allergies: normalizeList(snapshot.dietary?.allergies),
        },
        cuisine: normalizeList(snapshot.cuisine?.selected),
        cooking: {
            timePreference: snapshot.cooking?.timePreference ?? 'balanced',
            skillLevel: snapshot.cooking?.skillLevel ?? 'intermediate',
            equipment: normalizeList(snapshot.cooking?.equipment),
        },
        routines: normalizeWeeklyRoutine(snapshot.routines),
    };

    return hashString(JSON.stringify(normalized));
};
