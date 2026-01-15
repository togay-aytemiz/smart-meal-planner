/**
 * Pantry Normalization Prompt Builder
 * Uses shared categories for consistency with grocery categorization
 */

import { buildCategoryListForPrompt, CategoryId, GROCERY_CATEGORIES } from './shared-categories';

export interface PantryNormalizedItem {
  input: string;
  canonical: string;
  normalized: string;
  categoryId: CategoryId;
}

export function buildPantrySystemPrompt(): string {
  return [
    "Sen Omnoo uygulaması için kullanıcı malzemelerini normalize eden ve kategorize eden bir yapay zekasın.",
    "Sadece geçerli JSON üret ve şema dışına çıkma.",
    "Soru sorma; açıklama yazma.",
  ].join("\n");
}

export function buildPantryPrompt(inputs: string[]): string {
  const cleaned = inputs.map((item) => item.trim()).filter(Boolean);
  const categoryList = buildCategoryListForPrompt();
  const categoryIds = GROCERY_CATEGORIES.map((c) => c.id).join(', ');

  return [
    "Görev: Aşağıdaki kullanıcı girişlerini mutfakta kullanılan malzemeler olarak organize et ve kategorize et.",
    "Her girdiyi tekilleştir, kanonik malzeme adına dönüştür ve uygun kategoriye ata.",
    "",
    "Kurallar:",
    "- Sadece malzeme adı döndür; miktar, marka, sıfat veya tarif ekleme.",
    "- Yazım hatalarını agresif bir şekilde düzelt (ör: \"mercmek\" -> \"mercimek\", \"gindi\" -> \"hindi\", \"çılak\" -> \"çilek\").",
    "- Malzemeleri genel, tariflerde geçebilecek en yalın haliyle yaz.",
    "- Aynı malzeme ise aynı kanonik adla döndür.",
    "- Belirsizse girdiyi olduğu gibi ama temizlenmiş döndür.",
    "- Türkçe isimler kullan; tekil form tercih et.",
    "- Her kelimenin baş harfini BÜYÜK yap (Title Case), geri kalanı küçük olsun (Örn: 'Kuru Fasulye', 'Süt').",
    "- Her malzemeye aşağıdaki kategorilerden birini ata.",
    "",
    "Kategoriler:",
    categoryList,
    "",
    `Geçerli kategori değerleri: ${categoryIds}`,
    "",
    `Girdiler (JSON Array): ${JSON.stringify(cleaned)}`,
    "",
    "Çıktı formatı (JSON):",
    "{",
    "  \"items\": [",
    "    { \"input\": \"kullanıcı girişi\", \"canonical\": \"Düzeltilmiş Ad\", \"categoryId\": \"produce\" }",
    "  ]",
    "}",
  ].join("\n");
}

export function buildCompletePantryPrompt(inputs: string[]): {
  systemPrompt: string;
  userPrompt: string;
} {
  return {
    systemPrompt: buildPantrySystemPrompt(),
    userPrompt: buildPantryPrompt(inputs),
  };
}
