import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, translations, type LanguageCode } from '../localization/translations';

type LanguageState = {
    language: LanguageCode;
    isReady: boolean;
};

type LanguageAction =
    | { type: 'INIT'; payload: LanguageCode }
    | { type: 'SET_LANGUAGE'; payload: LanguageCode };

type TranslationParams = Record<string, string | number>;

type LanguageContextValue = {
    language: LanguageCode;
    locale: string;
    isReady: boolean;
    setLanguage: (language: LanguageCode) => Promise<void>;
    t: (key: string, params?: TranslationParams) => string;
};

const STORAGE_KEY = '@smart_meal_planner:language';
const LOCALE_MAP: Record<LanguageCode, string> = {
    tr: 'tr-TR',
    en: 'en-US',
};

const resolveDefaultLanguage = (): LanguageCode => {
    const regionCode = Localization.getLocales()[0]?.regionCode ?? null;
    if (regionCode === 'TR') {
        return 'tr';
    }
    if (regionCode) {
        return 'en';
    }
    return DEFAULT_LANGUAGE;
};

const languageReducer = (state: LanguageState, action: LanguageAction): LanguageState => {
    switch (action.type) {
        case 'INIT':
            return { language: action.payload, isReady: true };
        case 'SET_LANGUAGE':
            return { ...state, language: action.payload };
        default:
            return state;
    }
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const resolveTranslation = (dictionary: Record<string, unknown>, path: string): string | null => {
    const segments = path.split('.');
    let current: unknown = dictionary;
    for (const segment of segments) {
        if (!current || typeof current !== 'object') {
            return null;
        }
        const record = current as Record<string, unknown>;
        current = record[segment];
    }
    return typeof current === 'string' ? current : null;
};

const interpolate = (value: string, params?: TranslationParams) => {
    if (!params) {
        return value;
    }
    return Object.entries(params).reduce(
        (result, [key, paramValue]) => result.replace(new RegExp(`{{${key}}}`, 'g'), String(paramValue)),
        value
    );
};

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(languageReducer, {
        language: DEFAULT_LANGUAGE,
        isReady: false,
    });

    useEffect(() => {
        const hydrateLanguage = async () => {
            try {
                const stored = await AsyncStorage.getItem(STORAGE_KEY);
                if (stored && SUPPORTED_LANGUAGES.includes(stored as LanguageCode)) {
                    dispatch({ type: 'INIT', payload: stored as LanguageCode });
                    return;
                }
            } catch (error) {
                console.warn('Language load error:', error);
            }
            dispatch({ type: 'INIT', payload: resolveDefaultLanguage() });
        };

        hydrateLanguage();
    }, []);

    const setLanguage = useCallback(async (language: LanguageCode) => {
        if (!SUPPORTED_LANGUAGES.includes(language)) {
            return;
        }
        dispatch({ type: 'SET_LANGUAGE', payload: language });
        try {
            await AsyncStorage.setItem(STORAGE_KEY, language);
        } catch (error) {
            console.warn('Language save error:', error);
        }
    }, []);

    const t = useCallback(
        (key: string, params?: TranslationParams) => {
            const fromCurrent = resolveTranslation(translations[state.language] as Record<string, unknown>, key);
            if (fromCurrent) {
                return interpolate(fromCurrent, params);
            }
            const fromFallback = resolveTranslation(translations[DEFAULT_LANGUAGE] as Record<string, unknown>, key);
            if (fromFallback) {
                return interpolate(fromFallback, params);
            }
            return key;
        },
        [state.language]
    );

    const value = useMemo<LanguageContextValue>(
        () => ({
            language: state.language,
            locale: LOCALE_MAP[state.language],
            isReady: state.isReady,
            setLanguage,
            t,
        }),
        [setLanguage, state.isReady, state.language, t]
    );

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within LanguageProvider');
    }
    return context;
}
