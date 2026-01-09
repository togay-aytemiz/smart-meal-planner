import { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
export interface OnboardingProfile {
    name: string;
    avatarUrl?: string;
}

export interface HouseholdMember {
    id: string;
    name: string;
    role: 'self' | 'spouse' | 'child' | 'parent' | 'nanny' | 'other';
    ageRange?: 'infant' | 'toddler' | 'child' | 'teen' | 'adult' | 'senior';
    routines?: WeeklyRoutine;
}

export interface RoutineDay {
    type: 'office' | 'remote' | 'gym' | 'school' | 'home' | 'off';
    gymTime?: 'morning' | 'afternoon' | 'evening' | 'none';
    officeMealToGo?: 'yes' | 'no';
    officeBreakfastAtHome?: 'yes' | 'no';
    schoolBreakfast?: 'yes' | 'no';
}

export interface WeeklyRoutine {
    monday: RoutineDay;
    tuesday: RoutineDay;
    wednesday: RoutineDay;
    thursday: RoutineDay;
    friday: RoutineDay;
    saturday: RoutineDay;
    sunday: RoutineDay;
}

export interface DietaryInfo {
    restrictions: string[];
    allergies: string[];
}

export interface CuisinePreferences {
    selected: string[];
}

export interface CookingPreferences {
    timePreference: 'quick' | 'balanced' | 'elaborate';
    skillLevel: 'beginner' | 'intermediate' | 'expert';
    equipment: string[];
}

export interface OnboardingData {
    profile: OnboardingProfile;
    householdSize: number;
    members: HouseholdMember[];
    routines: WeeklyRoutine;
    dietary: DietaryInfo;
    cuisine: CuisinePreferences;
    cooking: CookingPreferences;
}

interface OnboardingState {
    currentStep: number;
    isCompleted: boolean;
    data: Partial<OnboardingData>;
}

type OnboardingAction =
    | { type: 'SET_STEP'; payload: number }
    | { type: 'SET_PROFILE'; payload: OnboardingProfile }
    | { type: 'SET_HOUSEHOLD_SIZE'; payload: number }
    | { type: 'SET_MEMBERS'; payload: HouseholdMember[] }
    | { type: 'SET_ROUTINES'; payload: WeeklyRoutine }
    | { type: 'SET_DIETARY'; payload: DietaryInfo }
    | { type: 'SET_CUISINE'; payload: CuisinePreferences }
    | { type: 'SET_COOKING'; payload: CookingPreferences }
    | { type: 'COMPLETE_ONBOARDING' }
    | { type: 'LOAD_STATE'; payload: OnboardingState }
    | { type: 'RESET' };

const STORAGE_KEY = '@smart_meal_planner:onboarding';

const initialState: OnboardingState = {
    currentStep: 1,
    isCompleted: false,
    data: {
        householdSize: 1,
        members: [],
        dietary: { restrictions: [], allergies: [] },
        cuisine: { selected: [] },
        cooking: { timePreference: 'balanced', skillLevel: 'intermediate', equipment: [] },
        routines: {
            monday: { type: 'office', gymTime: 'none' },
            tuesday: { type: 'office', gymTime: 'none' },
            wednesday: { type: 'office', gymTime: 'none' },
            thursday: { type: 'office', gymTime: 'none' },
            friday: { type: 'office', gymTime: 'none' },
            saturday: { type: 'home', gymTime: 'none' },
            sunday: { type: 'home', gymTime: 'none' },
        },
    },
};

function onboardingReducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
    switch (action.type) {
        case 'SET_STEP':
            return { ...state, currentStep: action.payload };
        case 'SET_PROFILE':
            return { ...state, data: { ...state.data, profile: action.payload } };
        case 'SET_HOUSEHOLD_SIZE':
            const newSize = action.payload;
            let currentMembers = state.data.members || [];

            // If new size is smaller than current members list, trim it
            if (currentMembers.length > newSize) {
                currentMembers = currentMembers.slice(0, newSize);
            }

            return {
                ...state,
                data: {
                    ...state.data,
                    householdSize: newSize,
                    members: currentMembers
                }
            };
        case 'SET_MEMBERS':
            return { ...state, data: { ...state.data, members: action.payload } };
        case 'SET_ROUTINES':
            return { ...state, data: { ...state.data, routines: action.payload } };
        case 'SET_DIETARY':
            return { ...state, data: { ...state.data, dietary: action.payload } };
        case 'SET_CUISINE':
            return { ...state, data: { ...state.data, cuisine: action.payload } };
        case 'SET_COOKING':
            return { ...state, data: { ...state.data, cooking: action.payload } };
        case 'COMPLETE_ONBOARDING':
            return { ...state, isCompleted: true };
        case 'LOAD_STATE':
            return action.payload;
        case 'RESET':
            return initialState;
        default:
            return state;
    }
}

interface OnboardingContextType {
    state: OnboardingState;
    dispatch: React.Dispatch<OnboardingAction>;
    nextStep: () => void;
    prevStep: () => void;
    finishOnboarding: () => Promise<void>;
    totalSteps: number;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

// 1. Welcome
// 2. Profile
// 3. Household Size
// 4. Member Roles
// 5. Routines
// 6. Dietary
// 7. Cuisine
// 8. Cooking
// 9. Ready (Review)
// 10. Processing
// 11. Analysis (Reveal)
// 12. Paywall
// 13. Auth
// 14: Kickstart, 15: Scan, 16: Inventory
export const TOTAL_STEPS = 16;

export function OnboardingProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(onboardingReducer, initialState);

    // Load saved state on mount
    useEffect(() => {
        const loadState = async () => {
            try {
                const saved = await AsyncStorage.getItem(STORAGE_KEY);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    dispatch({ type: 'LOAD_STATE', payload: parsed });
                }
            } catch (error) {
                console.error('Failed to load onboarding state:', error);
            }
        };
        loadState();
    }, []);

    // Save state on changes
    useEffect(() => {
        const saveState = async () => {
            try {
                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            } catch (error) {
                console.error('Failed to save onboarding state:', error);
            }
        };
        saveState();
    }, [state]);

    const nextStep = () => {
        if (state.currentStep < TOTAL_STEPS) {
            dispatch({ type: 'SET_STEP', payload: state.currentStep + 1 });
        }
    };

    const prevStep = () => {
        if (state.currentStep > 1) {
            dispatch({ type: 'SET_STEP', payload: state.currentStep - 1 });
        }
    };

    const finishOnboarding = async () => {
        dispatch({ type: 'COMPLETE_ONBOARDING' });
    };

    return (
        <OnboardingContext.Provider value={{ state, dispatch, nextStep, prevStep, finishOnboarding, totalSteps: TOTAL_STEPS }}>
            {children}
        </OnboardingContext.Provider>
    );
}

export function useOnboarding() {
    const context = useContext(OnboardingContext);
    if (!context) {
        throw new Error('useOnboarding must be used within an OnboardingProvider');
    }
    return context;
}
