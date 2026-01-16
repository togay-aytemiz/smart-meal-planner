import type { MenuRecipe, MenuRecipeCourse } from './menu-recipes';

/**
 * A recipe saved to the user's cookbook (favorites)
 */
export type SavedRecipe = {
    /** Unique identifier for the saved recipe */
    recipeId: string;
    /** Recipe display name */
    name: string;
    /** Course category (main, side, soup, etc.) */
    course: MenuRecipeCourse;
    /** Short description of the dish */
    brief: string;
    /** Total preparation + cooking time */
    totalTimeMinutes: number;
    /** ISO timestamp when saved */
    savedAt: string;
    /** Optional image URL */
    imageUrl?: string;
    /** Full recipe data for offline access */
    recipe: MenuRecipe;
};

/**
 * Cookbook state for the useCookbook hook
 */
export type CookbookState = {
    favorites: SavedRecipe[];
    isLoading: boolean;
    error: string | null;
};
