/**
 * Shared Category Configuration
 * Used by both Pantry and Grocery categorization
 */

import { LanguageCode } from "../../types/menu";

export type CategoryId =
    | 'produce'
    | 'proteins'
    | 'dairy'
    | 'grains'
    | 'spices'
    | 'sauces'
    | 'bakery'
    | 'frozen'
    | 'beverages'
    | 'other';

export interface CategoryConfig {
    id: CategoryId;
    title: string;
    description: string;
    examples: string[];
}

export const GROCERY_CATEGORIES: CategoryConfig[] = [
    {
        id: 'produce',
        title: 'Meyve & Sebze',
        description: 'Taze meyve ve sebzeler',
        examples: ['domates', 'salatalık', 'elma', 'muz', 'brokoli', 'havuç', 'biber', 'soğan', 'patates', 'limon'],
    },
    {
        id: 'proteins',
        title: 'Et & Protein',
        description: 'Et, balık, yumurta ve protein kaynakları',
        examples: ['tavuk göğsü', 'kıyma', 'dana eti', 'somon', 'yumurta', 'hindi', 'kuzu eti'],
    },
    {
        id: 'dairy',
        title: 'Süt Ürünleri',
        description: 'Süt, peynir, yoğurt ve süt bazlı ürünler',
        examples: ['süt', 'yoğurt', 'beyaz peynir', 'kaşar peyniri', 'tereyağı', 'krema', 'lor peyniri'],
    },
    {
        id: 'grains',
        title: 'Tahıllar & Bakliyat',
        description: 'Pirinç, makarna, bakliyat ve tahıl ürünleri',
        examples: ['pirinç', 'bulgur', 'makarna', 'mercimek', 'nohut', 'fasulye', 'un', 'yulaf'],
    },
    {
        id: 'spices',
        title: 'Baharatlar',
        description: 'Baharatlar, otlar ve kurutulmuş çeşniler',
        examples: ['tuz', 'karabiber', 'pul biber', 'kimyon', 'kekik', 'nane', 'tarçın', 'zerdeçal', 'defne yaprağı'],
    },
    {
        id: 'sauces',
        title: 'Sos & Çeşni',
        description: 'Soslar, yağlar ve çeşniler',
        examples: ['zeytinyağı', 'soya sosu', 'ketçap', 'mayonez', 'sirke', 'salça', 'hardal'],
    },
    {
        id: 'bakery',
        title: 'Fırın & Ekmek',
        description: 'Ekmek ve fırın ürünleri',
        examples: ['ekmek', 'lavaş', 'simit', 'pide', 'bazlama'],
    },
    {
        id: 'frozen',
        title: 'Dondurulmuş',
        description: 'Dondurulmuş gıdalar',
        examples: ['dondurulmuş bezelye', 'dondurulmuş sebze karışımı', 'dondurucu'],
    },
    {
        id: 'beverages',
        title: 'İçecekler',
        description: 'Su, meyve suyu ve içecekler',
        examples: ['su', 'maden suyu', 'portakal suyu', 'çay', 'kahve'],
    },
    {
        id: 'other',
        title: 'Diğer',
        description: 'Diğer kategorilere uymayan ürünler',
        examples: [],
    },
];

export const GROCERY_CATEGORIES_EN: CategoryConfig[] = [
    {
        id: 'produce',
        title: 'Produce',
        description: 'Fresh fruits and vegetables',
        examples: ['tomato', 'cucumber', 'apple', 'banana', 'broccoli', 'carrot', 'pepper', 'onion', 'potato', 'lemon'],
    },
    {
        id: 'proteins',
        title: 'Meat & Protein',
        description: 'Meat, fish, eggs, and protein sources',
        examples: ['chicken breast', 'ground beef', 'beef', 'salmon', 'eggs', 'turkey', 'lamb'],
    },
    {
        id: 'dairy',
        title: 'Dairy',
        description: 'Milk, cheese, yogurt, and dairy products',
        examples: ['milk', 'yogurt', 'feta', 'cheddar', 'butter', 'cream', 'ricotta'],
    },
    {
        id: 'grains',
        title: 'Grains & Legumes',
        description: 'Rice, pasta, legumes, and grains',
        examples: ['rice', 'bulgur', 'pasta', 'lentils', 'chickpeas', 'beans', 'flour', 'oats'],
    },
    {
        id: 'spices',
        title: 'Spices',
        description: 'Spices, herbs, and dried seasonings',
        examples: ['salt', 'black pepper', 'chili flakes', 'cumin', 'oregano', 'mint', 'cinnamon', 'turmeric', 'bay leaf'],
    },
    {
        id: 'sauces',
        title: 'Sauces & Condiments',
        description: 'Sauces, oils, and condiments',
        examples: ['olive oil', 'soy sauce', 'ketchup', 'mayonnaise', 'vinegar', 'tomato paste', 'mustard'],
    },
    {
        id: 'bakery',
        title: 'Bakery & Bread',
        description: 'Bread and bakery items',
        examples: ['bread', 'wraps', 'bagel', 'pita', 'flatbread'],
    },
    {
        id: 'frozen',
        title: 'Frozen',
        description: 'Frozen foods',
        examples: ['frozen peas', 'frozen mixed vegetables', 'frozen berries'],
    },
    {
        id: 'beverages',
        title: 'Beverages',
        description: 'Water, juice, and drinks',
        examples: ['water', 'sparkling water', 'orange juice', 'tea', 'coffee'],
    },
    {
        id: 'other',
        title: 'Other',
        description: 'Items that do not fit other categories',
        examples: [],
    },
];

export const getGroceryCategories = (language: LanguageCode = "tr"): CategoryConfig[] =>
    language === "en" ? GROCERY_CATEGORIES_EN : GROCERY_CATEGORIES;

export const getCategoryById = (id: CategoryId): CategoryConfig | undefined =>
    GROCERY_CATEGORIES.find((cat) => cat.id === id);

export const getCategoryTitles = (): Record<CategoryId, string> =>
    GROCERY_CATEGORIES.reduce(
        (acc, cat) => ({ ...acc, [cat.id]: cat.title }),
        {} as Record<CategoryId, string>
    );

export const buildCategoryListForPrompt = (language: LanguageCode = "tr"): string => {
    const exampleLabel = language === "en" ? "Examples" : "Örnekler";
    return getGroceryCategories(language)
        .map((cat) => `- ${cat.id}: ${cat.title} (${cat.description}). ${exampleLabel}: ${cat.examples.join(', ')}`)
        .join('\n');
};
