/**
 * Grocery Categorization Prompt Builder
 * Uses LLM to categorize and deduplicate grocery items
 */

import { buildCategoryListForPrompt, CategoryId, GROCERY_CATEGORIES } from './shared-categories';
import { LanguageCode } from '../../types/menu';

export interface GroceryInputItem {
    name: string;
    amount?: string;
    unit?: string;
    meals: string[];
}

export interface CategorizedGroceryItem {
    name: string;
    amount?: string;
    unit?: string;
    meals: string[];
    categoryId: CategoryId;
}

export interface CategorizedGroceryResponse {
    items: CategorizedGroceryItem[];
}

export function buildGroceryCategorizationSystemPrompt(language: LanguageCode = 'tr'): string {
    const isEnglish = language === 'en';
    return [
        isEnglish
            ? 'You are an AI that categorizes grocery list items for the Omnoo app.'
            : 'Sen Omnoo uygulaması için alışveriş listesi malzemelerini kategorize eden bir yapay zekasın.',
        isEnglish
            ? 'Output only valid JSON and stay within the schema.'
            : 'Sadece geçerli JSON üret ve şema dışına çıkma.',
        isEnglish
            ? 'Do not ask questions or provide explanations.'
            : 'Soru sorma; açıklama yazma.',
    ].join('\n');
}

export function buildGroceryCategorizationPrompt(items: GroceryInputItem[], language: LanguageCode = 'tr'): string {
    const isEnglish = language === 'en';
    const categoryList = buildCategoryListForPrompt(language);
    const categoryIds = GROCERY_CATEGORIES.map((c) => c.id).join(', ');

    const itemsJson = JSON.stringify(
        items.map((item) => ({
            name: item.name,
            amount: item.amount,
            unit: item.unit,
            meals: item.meals,
        }))
    );

    return [
        isEnglish
            ? 'Task: Categorize and merge the grocery list items below.'
            : 'Görev: Aşağıdaki alışveriş listesi malzemelerini kategorize et ve birleştir.',
        '',
        isEnglish ? 'Rules:' : 'Kurallar:',
        isEnglish
            ? '1. Assign each item to one of the categories below.'
            : '1. Her malzemeyi aşağıdaki kategorilerden birine ata.',
        isEnglish
            ? '2. If the same item is written with different names (e.g., "carrot" and "fresh carrot"), merge them.'
            : '2. Aynı malzeme farklı isimlerle yazılmışsa (ör: "havuç" ve "taze havuç") birleştir.',
        isEnglish
            ? '3. If an item contains other items (e.g., "mixed vegetables (carrot, broccoli)"), and those contents are already listed, remove the parent item.'
            : '3. Eğer bir malzeme başka malzemeleri içeriyorsa (ör: "sebze karışımı (havuç, brokoli)"), içerikleri zaten ayrı listeleniyorsa ana malzemeyi kaldır.',
        isEnglish ? '4. Fix typos.' : '4. Yazım hatalarını düzelt.',
        isEnglish ? '5. Capitalize each word (Title Case).' : '5. Her kelimenin baş harfini büyük yap (Title Case).',
        isEnglish ? '6. Preserve amounts and meal info.' : '6. Miktarları ve yemek bilgilerini koru.',
        '',
        isEnglish ? 'Categories:' : 'Kategoriler:',
        categoryList,
        '',
        `${isEnglish ? 'Valid category values' : 'Geçerli kategori değerleri'}: ${categoryIds}`,
        '',
        `${isEnglish ? 'Inputs' : 'Girdiler'} (JSON Array): ${itemsJson}`,
        '',
        isEnglish ? 'Output format (JSON):' : 'Çıktı formatı (JSON):',
        '{',
        '  "items": [',
        isEnglish
            ? '    { "name": "Item Name", "amount": "amount", "unit": "unit", "meals": ["Mon Dinner"], "categoryId": "produce" }'
            : '    { "name": "Malzeme Adı", "amount": "miktar", "unit": "birim", "meals": ["Pzt Akşam"], "categoryId": "produce" }',
        '  ]',
        '}',
    ].join('\n');
}

export function buildCompleteGroceryCategorizationPrompt(
    items: GroceryInputItem[],
    language: LanguageCode = 'tr'
): {
    systemPrompt: string;
    userPrompt: string;
} {
    return {
        systemPrompt: buildGroceryCategorizationSystemPrompt(language),
        userPrompt: buildGroceryCategorizationPrompt(items, language),
    };
}
