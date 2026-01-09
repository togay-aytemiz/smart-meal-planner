import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useStorage<T>(key: string, initialValue: T) {
    const [storedValue, setStoredValue] = useState<T>(initialValue);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadValue = async () => {
            try {
                const item = await AsyncStorage.getItem(key);
                if (item !== null) {
                    setStoredValue(JSON.parse(item));
                }
            } catch (error) {
                console.error(`Error loading ${key} from storage:`, error);
            } finally {
                setLoading(false);
            }
        };

        loadValue();
    }, [key]);

    const setValue = async (value: T | ((val: T) => T)) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            await AsyncStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.error(`Error saving ${key} to storage:`, error);
        }
    };

    const removeValue = async () => {
        try {
            await AsyncStorage.removeItem(key);
            setStoredValue(initialValue);
        } catch (error) {
            console.error(`Error removing ${key} from storage:`, error);
        }
    };

    return { value: storedValue, setValue, removeValue, loading };
}
