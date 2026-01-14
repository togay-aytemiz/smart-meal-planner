/**
 * Sample Menu Context
 * Shared state for sample menu generation between processing and analysis screens
 */

import React, { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import firestore, { doc, getDoc } from '@react-native-firebase/firestore';
import { functions } from '../config/firebase';
import { fetchMenuBundle, type MenuBundle } from '../utils/menu-storage';
import { buildOnboardingHash, type OnboardingSnapshot } from '../utils/onboarding-hash';
import type { MenuDecision, MenuRecipesResponse, MenuRecipeCourse } from '../types/menu-recipes';
import type { RoutineDay, WeeklyRoutine } from './onboarding-context';

type MenuMealType = 'breakfast' | 'lunch' | 'dinner';
type WeekdayKey = keyof WeeklyRoutine;

type MealPlan = {
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
};

type SampleDay = {
    key: WeekdayKey;
    label: string;
    dateKey: string;
    mealPlan: MealPlan;
};

type MenuRequestPayload = {
    userId: string;
    date: string;
    dayOfWeek: string;
    dietaryRestrictions: string[];
    allergies: string[];
    cuisinePreferences: string[];
    timePreference: 'quick' | 'balanced' | 'elaborate';
    skillLevel: 'beginner' | 'intermediate' | 'expert';
    equipment: string[];
    householdSize: number;
    routine?: {
        type: 'office' | 'remote' | 'gym' | 'school' | 'off';
        gymTime?: 'morning' | 'afternoon' | 'evening' | 'none';
        officeMealToGo?: 'yes' | 'no';
        officeBreakfastAtHome?: 'yes' | 'no';
        schoolBreakfast?: 'yes' | 'no';
        remoteMeals?: Array<'breakfast' | 'lunch' | 'dinner'>;
        excludeFromPlan?: boolean;
    };
    mealType: MenuMealType;
    weeklyContext?: {
        reasoningHint?: string;
        seasonalityHint?: string;
    };
    onboardingHash?: string;
};

type MenuRecipeParams = MenuRequestPayload & { menu: MenuDecision };

type MenuCallResponse = {
    success: boolean;
    menu: MenuDecision;
    model: string;
    timestamp: string;
};

type MenuRecipesCallResponse = {
    success: boolean;
    menuRecipes: MenuRecipesResponse;
    model: string;
    timestamp: string;
};

type LoadingState = Record<MenuMealType, boolean>;

type SampleMenuState = {
    menuBundles: Record<MenuMealType, MenuBundle | null>;
    loadingStates: LoadingState;
    error: string | null;
    sampleDay: SampleDay | null;
    snapshot: OnboardingSnapshot | null;
    hasStarted: boolean;
    firstMealReady: boolean;
};

type SampleMenuContextType = SampleMenuState & {
    startLoading: (userId: string, onboardingData: OnboardingSnapshot | null) => Promise<void>;
    waitForFirstMeal: () => Promise<boolean>;
    reset: () => void;
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

const DAY_LABELS: Record<WeekdayKey, string> = {
    monday: 'Pazartesi',
    tuesday: 'Salı',
    wednesday: 'Çarşamba',
    thursday: 'Perşembe',
    friday: 'Cuma',
    saturday: 'Cumartesi',
    sunday: 'Pazar',
};

const WEEKDAY_INDEX: Record<WeekdayKey, number> = {
    monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6,
};

const MEAL_ORDER: MenuMealType[] = ['dinner'];
const DEFAULT_SAMPLE_DAY: WeekdayKey = 'tuesday';
const WEEKDAY_PRIORITY: WeekdayKey[] = ['tuesday', 'monday', 'wednesday', 'thursday', 'friday'];
const WEEKEND_PRIORITY: WeekdayKey[] = ['saturday', 'sunday'];

const buildDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getNextWeekdayDate = (weekday: WeekdayKey) => {
    const today = new Date();
    const todayIndex = (today.getDay() + 6) % 7;
    const targetIndex = WEEKDAY_INDEX[weekday];
    const diff = (targetIndex - todayIndex + 7) % 7;
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + diff);
    return nextDate;
};

const getMealCount = (plan: MealPlan) => Number(plan.dinner);

const buildMealPlan = (routine: RoutineDay | null | undefined): MealPlan => {
    if (!routine) return { breakfast: false, lunch: false, dinner: true };
    if (routine.excludeFromPlan) return { breakfast: false, lunch: false, dinner: false };
    return { breakfast: false, lunch: false, dinner: true };
};

const pickSampleDayKey = (routines: WeeklyRoutine): WeekdayKey => {
    const pickByMinMeals = (days: WeekdayKey[], minMeals: number) => {
        for (const dayKey of days) {
            const plan = buildMealPlan(routines[dayKey]);
            if (getMealCount(plan) >= minMeals) return dayKey;
        }
        return null;
    };

    const pickByMaxMeals = (days: WeekdayKey[]) => {
        let bestDay: WeekdayKey | null = null;
        let bestCount = 0;
        for (const dayKey of days) {
            const plan = buildMealPlan(routines[dayKey]);
            const count = getMealCount(plan);
            if (count > bestCount) { bestDay = dayKey; bestCount = count; }
        }
        return bestCount > 0 ? bestDay : null;
    };

    const weekdayChoice = pickByMinMeals(WEEKDAY_PRIORITY, 1) ?? pickByMaxMeals(WEEKDAY_PRIORITY);
    if (weekdayChoice) return weekdayChoice;

    const weekendChoice = pickByMinMeals(WEEKEND_PRIORITY, 1) ?? pickByMaxMeals(WEEKEND_PRIORITY);
    if (weekendChoice) return weekendChoice;

    return DEFAULT_SAMPLE_DAY;
};

const WOW_REASONING_HINT =
    'Modern, restoran kalitesinde tabaklar seç; klasik ev yemeklerinden kaçın.';

const buildMenuRequest = (
    snapshot: OnboardingSnapshot | null,
    userId: string,
    date: string,
    dayKey: WeekdayKey,
    mealType: MenuMealType,
    onboardingHash?: string | null
): MenuRequestPayload => {
    const routines = snapshot?.routines ?? DEFAULT_ROUTINES;
    const routine = routines?.[dayKey];

    // Check if user specifically excluded Turkish or selected other cuisines
    const selectedCuisines = snapshot?.cuisine?.selected ?? [];
    const hasTurkish = selectedCuisines.some(c => c.toLowerCase().includes('türk') || c.toLowerCase().includes('turkish'));
    const hasDigitalCuisines = selectedCuisines.length > 0;

    let reasoningContext = WOW_REASONING_HINT;

    if (hasDigitalCuisines && !hasTurkish) {
        reasoningContext += ' Seçilen mutfaklara sadık kal: ' + selectedCuisines.join(', ') + '.';
    } else if (hasTurkish) {
        reasoningContext += ' Türk mutfağında modern ve rafine yorumları tercih et.';
    } else if (!hasDigitalCuisines) {
        reasoningContext += ' Dünya mutfağından modern füzyon tabaklar seç.';
    }

    return {
        userId,
        date,
        dayOfWeek: dayKey,
        dietaryRestrictions: snapshot?.dietary?.restrictions ?? [],
        allergies: snapshot?.dietary?.allergies ?? [],
        cuisinePreferences: selectedCuisines,
        timePreference: snapshot?.cooking?.timePreference ?? 'balanced',
        skillLevel: snapshot?.cooking?.skillLevel ?? 'intermediate',
        equipment: snapshot?.cooking?.equipment ?? [],
        householdSize: snapshot?.householdSize ?? 1,
        routine: routine ? {
            type: routine.type,
            gymTime: routine.gymTime,
            officeMealToGo: routine.officeMealToGo,
            officeBreakfastAtHome: routine.officeBreakfastAtHome,
            schoolBreakfast: routine.schoolBreakfast,
            remoteMeals: routine.remoteMeals,
            excludeFromPlan: routine.excludeFromPlan,
        } : undefined,
        mealType,
        weeklyContext: { reasoningHint: reasoningContext },
        ...(typeof onboardingHash === 'string' ? { onboardingHash } : {}),
    };
};

const getFunctionsErrorMessage = (error: unknown) => {
    if (error && typeof error === 'object') {
        const maybeError = error as { details?: { message?: string } | string; message?: string };
        if (typeof maybeError.details === 'string') return maybeError.details;
        if (maybeError.details?.message) return maybeError.details.message;
        if (maybeError.message) return maybeError.message;
    }
    return 'Bir hata oluştu.';
};

const initialState: SampleMenuState = {
    menuBundles: { breakfast: null, lunch: null, dinner: null },
    loadingStates: { breakfast: false, lunch: false, dinner: false },
    error: null,
    sampleDay: null,
    snapshot: null,
    hasStarted: false,
    firstMealReady: false,
};

const SampleMenuContext = createContext<SampleMenuContextType | null>(null);

export function SampleMenuProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<SampleMenuState>(initialState);
    const firstMealPromiseRef = useRef<{ resolve: (value: boolean) => void } | null>(null);

    const reset = useCallback(() => {
        setState(initialState);
        firstMealPromiseRef.current = null;
    }, []);

    const startLoading = useCallback(async (userId: string, onboardingData: OnboardingSnapshot | null) => {
        if (state.hasStarted) return;

        setState((prev) => ({ ...prev, hasStarted: true, snapshot: onboardingData }));

        const routines = onboardingData?.routines ?? DEFAULT_ROUTINES;
        const dayKey = pickSampleDayKey(routines);
        const planForDay = buildMealPlan(routines[dayKey]);
        const dateKey = buildDateKey(getNextWeekdayDate(dayKey));
        const onboardingHash = buildOnboardingHash(onboardingData);

        const sampleDay: SampleDay = {
            key: dayKey,
            label: DAY_LABELS[dayKey],
            dateKey,
            mealPlan: planForDay,
        };

        setState((prev) => ({ ...prev, sampleDay }));

        const mealTypes = MEAL_ORDER.filter((mealType) => planForDay[mealType]);
        if (!mealTypes.length) {
            setState((prev) => ({ ...prev, firstMealReady: true }));
            firstMealPromiseRef.current?.resolve(true);
            return;
        }

        // Set loading states
        const newLoadingStates: LoadingState = { breakfast: false, lunch: false, dinner: false };
        for (const mealType of mealTypes) {
            newLoadingStates[mealType] = true;
        }
        setState((prev) => ({ ...prev, loadingStates: newLoadingStates }));

        const callMenu = functions.httpsCallable<{ request: MenuRequestPayload }, MenuCallResponse>('generateOpenAIMenu');
        const callRecipes = functions.httpsCallable<{ params: MenuRecipeParams }, MenuRecipesCallResponse>('generateOpenAIRecipe');

        // Parallel meal generation
        const fetchMeal = async (mealType: MenuMealType) => {
            const request = buildMenuRequest(onboardingData, userId, dateKey, dayKey, mealType, onboardingHash);

            try {
                const menuResult = await callMenu({ request });
                const menuData = menuResult.data?.menu;

                if (!menuData?.items?.length) throw new Error('Menü verisi alınamadı');

                const recipeParams: MenuRecipeParams = { ...request, menu: menuData };
                const recipesResult = await callRecipes({ params: recipeParams });
                const recipesData = recipesResult.data?.menuRecipes;

                if (!recipesData?.recipes?.length) throw new Error('Tarif verisi alınamadı');

                const bundle: MenuBundle = { menu: menuData, recipes: recipesData };

                setState((prev) => {
                    const isFirstMeal = !prev.firstMealReady;
                    if (isFirstMeal) {
                        firstMealPromiseRef.current?.resolve(true);
                    }
                    return {
                        ...prev,
                        menuBundles: { ...prev.menuBundles, [mealType]: bundle },
                        loadingStates: { ...prev.loadingStates, [mealType]: false },
                        firstMealReady: true,
                    };
                });
                return;
            } catch (err) {
                console.warn(`Meal ${mealType} generation error:`, err);
            }

            // Fallback: try Firestore
            try {
                const firestoreMenu = await fetchMenuBundle(userId, dateKey, mealType, onboardingHash);
                if (firestoreMenu) {
                    setState((prev) => {
                        const isFirstMeal = !prev.firstMealReady;
                        if (isFirstMeal) {
                            firstMealPromiseRef.current?.resolve(true);
                        }
                        return {
                            ...prev,
                            menuBundles: { ...prev.menuBundles, [mealType]: firestoreMenu },
                            loadingStates: { ...prev.loadingStates, [mealType]: false },
                            firstMealReady: true,
                        };
                    });
                    return;
                }
            } catch (firestoreError) {
                console.warn('Firestore fallback error:', firestoreError);
            }

            // Mark as done (failed)
            setState((prev) => {
                const isFirstMeal = !prev.firstMealReady;
                if (isFirstMeal) {
                    firstMealPromiseRef.current?.resolve(true);
                }
                return {
                    ...prev,
                    loadingStates: { ...prev.loadingStates, [mealType]: false },
                    error: prev.error || getFunctionsErrorMessage(new Error('Öğün yüklenemedi')),
                    firstMealReady: true,
                };
            });
        };

        // Start all meals in parallel
        Promise.all(mealTypes.map(fetchMeal)).catch(console.error);
    }, [state.hasStarted]);

    const waitForFirstMeal = useCallback((): Promise<boolean> => {
        if (state.firstMealReady) return Promise.resolve(true);

        return new Promise((resolve) => {
            firstMealPromiseRef.current = { resolve };

            // Timeout after 20 seconds
            setTimeout(() => {
                if (!state.firstMealReady) {
                    firstMealPromiseRef.current?.resolve(false);
                }
            }, 20000);
        });
    }, [state.firstMealReady]);

    const value: SampleMenuContextType = {
        ...state,
        startLoading,
        waitForFirstMeal,
        reset,
    };

    return (
        <SampleMenuContext.Provider value={value}>
            {children}
        </SampleMenuContext.Provider>
    );
}

export function useSampleMenu() {
    const context = useContext(SampleMenuContext);
    if (!context) {
        throw new Error('useSampleMenu must be used within a SampleMenuProvider');
    }
    return context;
}
