/**
 * Grocery Categorization Prompt Builder
 * Uses LLM to categorize and deduplicate grocery items
 */

import { buildCategoryListForPrompt, CategoryId, GROCERY_CATEGORIES } from './shared-categories';

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

export function buildGroceryCategorizationSystemPrompt(): string {
    return [
        'Sen Omnoo uygulaması için alışveriş listesi malzemelerini kategorize eden bir yapay zekasın.',
        'Sadece geçerli JSON üret ve şema dışına çıkma.',
        'Soru sorma; açıklama yazma.',
    ].join('\n');
}

export function buildGroceryCategorizationPrompt(items: GroceryInputItem[]): string {
    const categoryList = buildCategoryListForPrompt();
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
        'Görev: Aşağıdaki alışveriş listesi malzemelerini kategorize et ve birleştir.',
        '',
        'Kurallar:',
        '1. Her malzemeyi aşağıdaki kategorilerden birine ata.',
        '2. Aynı malzeme farklı isimlerle yazılmışsa (ör: "havuç" ve "taze havuç") birleştir.',
        '3. Eğer bir malzeme başka malzemeleri içeriyorsa (ör: "sebze karışımı (havuç, brokoli)"), içerikleri zaten ayrı listeleniyorsa ana malzemeyi kaldır.',
        '4. Yazım hatalarını düzelt.',
        '5. Her kelimenin baş harfini büyük yap (Title Case).',
        '6. Miktarları ve yemek bilgilerini koru.',
        '',
        'Kategoriler:',
        categoryList,
        '',
        `Geçerli kategori değerleri: ${categoryIds}`,
        '',
        `Girdiler (JSON Array): ${itemsJson}`,
        '',
        'Çıktı formatı (JSON):',
        '{',
        '  "items": [',
        '    { "name": "Malzeme Adı", "amount": "miktar", "unit": "birim", "meals": ["Pzt Akşam"], "categoryId": "produce" }',
        '  ]',
        '}',
    ].join('\n');
}

export function buildCompleteGroceryCategorizationPrompt(items: GroceryInputItem[]): {
    systemPrompt: string;
    userPrompt: string;
} {
    return {
        systemPrompt: buildGroceryCategorizationSystemPrompt(),
        userPrompt: buildGroceryCategorizationPrompt(items),
    };
}
