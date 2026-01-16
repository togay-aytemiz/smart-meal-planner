import { useCallback, useEffect, useState } from 'react';
import firestore from '@react-native-firebase/firestore';
import { useUser } from '../contexts/user-context';
import type { MenuRecipe } from '../types/menu-recipes';
import type { SavedRecipe, CookbookState } from '../types/cookbook';

/**
 * Generates a unique recipe ID based on course and name
 */
const generateRecipeId = (recipe: MenuRecipe): string => {
    const normalized = `${recipe.course}-${recipe.name}`
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
    return normalized;
};

/**
 * Hook for managing user's saved recipes (cookbook favorites)
 */
export function useCookbook() {
    const { state: userState } = useUser();
    const userId = userState.user?.uid;

    const [state, setState] = useState<CookbookState>({
        favorites: [],
        isLoading: true,
        error: null,
    });

    // Subscribe to favorites collection
    useEffect(() => {
        if (!userId) {
            setState({ favorites: [], isLoading: false, error: null });
            return;
        }

        const unsubscribe = firestore()
            .collection('Users')
            .doc(userId)
            .collection('favorites')
            .orderBy('savedAt', 'desc')
            .onSnapshot(
                (snapshot) => {
                    const favorites: SavedRecipe[] = snapshot.docs.map((doc) => ({
                        ...(doc.data() as Omit<SavedRecipe, 'recipeId'>),
                        recipeId: doc.id,
                    }));
                    setState({ favorites, isLoading: false, error: null });
                },
                (error) => {
                    console.error('Favorites subscription error:', error);
                    setState((prev) => ({
                        ...prev,
                        isLoading: false,
                        error: 'Favoriler yüklenemedi',
                    }));
                }
            );

        return () => unsubscribe();
    }, [userId]);

    /**
     * Check if a recipe is in favorites
     */
    const isFavorite = useCallback(
        (recipe: MenuRecipe): boolean => {
            const recipeId = generateRecipeId(recipe);
            return state.favorites.some((fav) => fav.recipeId === recipeId);
        },
        [state.favorites]
    );

    /**
     * Toggle a recipe in/out of favorites
     * Returns true if added, false if removed
     */
    const toggleFavorite = useCallback(
        async (recipe: MenuRecipe, imageUrl?: string): Promise<boolean> => {
            if (!userId) {
                console.warn('Cannot toggle favorite: user not authenticated');
                return false;
            }

            const recipeId = generateRecipeId(recipe);
            const favoritesRef = firestore()
                .collection('Users')
                .doc(userId)
                .collection('favorites')
                .doc(recipeId);

            const isCurrentlyFavorite = state.favorites.some(
                (fav) => fav.recipeId === recipeId
            );

            try {
                if (isCurrentlyFavorite) {
                    await favoritesRef.delete();
                    return false;
                } else {
                    const savedRecipe: Omit<SavedRecipe, 'recipeId'> = {
                        name: recipe.name,
                        course: recipe.course,
                        brief: recipe.brief,
                        totalTimeMinutes: recipe.totalTimeMinutes,
                        savedAt: new Date().toISOString(),
                        ...(imageUrl ? { imageUrl } : {}),
                        recipe,
                    };
                    await favoritesRef.set(savedRecipe);
                    return true;
                }
            } catch (error) {
                console.error('Toggle favorite error:', error);
                throw error;
            }
        },
        [userId, state.favorites]
    );

    return {
        favorites: state.favorites,
        isLoading: state.isLoading,
        error: state.error,
        isFavorite,
        toggleFavorite,
    };
}
