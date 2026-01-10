import { createContext, useContext, useEffect, useReducer, ReactNode } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore, { doc, getDoc, setDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { OnboardingData } from './onboarding-context';

interface UserState {
    user: FirebaseAuthTypes.User | null;
    isLoading: boolean;
    onboardingCompleted: boolean;
}

type UserAction =
    | { type: 'SET_USER'; payload: FirebaseAuthTypes.User | null }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_ONBOARDING_COMPLETED'; payload: boolean };

const initialState: UserState = {
    user: null,
    isLoading: true,
    onboardingCompleted: false,
};

function userReducer(state: UserState, action: UserAction): UserState {
    switch (action.type) {
        case 'SET_USER':
            return { ...state, user: action.payload };
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };
        case 'SET_ONBOARDING_COMPLETED':
            return { ...state, onboardingCompleted: action.payload };
        default:
            return state;
    }
}

interface UserContextType {
    state: UserState;
    completeOnboarding: (data: Partial<OnboardingData>) => Promise<void>;
}

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(userReducer, initialState);

    useEffect(() => {
        const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
            if (!firebaseUser) {
                dispatch({ type: 'SET_LOADING', payload: true });
                try {
                    await auth().signInAnonymously();
                } catch (error) {
                    console.error('Failed to sign in anonymously:', error);
                    dispatch({ type: 'SET_LOADING', payload: false });
                }
                return;
            }

            dispatch({ type: 'SET_USER', payload: firebaseUser });
            dispatch({ type: 'SET_LOADING', payload: true });

            try {
                const userDocRef = doc(firestore(), 'Users', firebaseUser.uid);
                const userDoc = await getDoc(userDocRef);
                const userData = userDoc.data();
                dispatch({
                    type: 'SET_ONBOARDING_COMPLETED',
                    payload: Boolean(userData?.onboardingCompleted),
                });
            } catch (error) {
                console.error('Failed to load user data:', error);
                dispatch({ type: 'SET_ONBOARDING_COMPLETED', payload: false });
            } finally {
                dispatch({ type: 'SET_LOADING', payload: false });
            }
        });

        return unsubscribe;
    }, []);

    const completeOnboarding = async (data: Partial<OnboardingData>) => {
        const firebaseUser = auth().currentUser;
        if (!firebaseUser) {
            throw new Error('User is not authenticated');
        }

        const sanitizedData = removeUndefined(data);

        const userDocRef = doc(firestore(), 'Users', firebaseUser.uid);
        await setDoc(
            userDocRef,
            {
                onboardingCompleted: true,
                onboarding: sanitizedData,
                updatedAt: serverTimestamp(),
                createdAt: serverTimestamp(),
            },
            { merge: true }
        );

        dispatch({ type: 'SET_ONBOARDING_COMPLETED', payload: true });
    };

    return (
        <UserContext.Provider value={{ state, completeOnboarding }}>
            {children}
        </UserContext.Provider>
    );
}

function removeUndefined<T>(value: T): T {
    if (Array.isArray(value)) {
        return value.map((item) => removeUndefined(item)) as T;
    }

    if (value && typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>)
            .filter(([, entryValue]) => entryValue !== undefined)
            .map(([key, entryValue]) => [key, removeUndefined(entryValue)]);
        return Object.fromEntries(entries) as T;
    }

    return value;
}

export function useUser() {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}
