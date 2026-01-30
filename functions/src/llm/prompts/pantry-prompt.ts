/**
 * Pantry Normalization Prompt Builder
 * Uses shared categories for consistency with grocery categorization
 */

import { buildCategoryListForPrompt, CategoryId, GROCERY_CATEGORIES } from './shared-categories';
import { LanguageCode } from '../../types/menu';

export interface PantryNormalizedItem {
  input: string;
  canonical: string;
  normalized: string;
  categoryId: CategoryId;
}

export function buildPantrySystemPrompt(language: LanguageCode = "tr"): string {
  const isEnglish = language === "en";
  return [
    isEnglish
      ? "You are an AI that normalizes and categorizes user pantry items for the Omnoo app."
      : "Sen Omnoo uygulaması için kullanıcı malzemelerini normalize eden ve kategorize eden bir yapay zekasın.",
    isEnglish
      ? "Output only valid JSON and stay within the schema."
      : "Sadece geçerli JSON üret ve şema dışına çıkma.",
    isEnglish
      ? "Do not ask questions or provide explanations."
      : "Soru sorma; açıklama yazma.",
  ].join("\n");
}

export function buildPantryPrompt(inputs: string[], language: LanguageCode = "tr"): string {
  const isEnglish = language === "en";
  const cleaned = inputs.map((item) => item.trim()).filter(Boolean);
  const categoryList = buildCategoryListForPrompt(language);
  const categoryIds = GROCERY_CATEGORIES.map((c) => c.id).join(', ');

  return [
    isEnglish
      ? "Task: Organize and categorize the following user inputs as kitchen ingredients."
      : "Görev: Aşağıdaki kullanıcı girişlerini mutfakta kullanılan malzemeler olarak organize et ve kategorize et.",
    isEnglish
      ? "Deduplicate each entry, convert it to a canonical ingredient name, and assign the appropriate category."
      : "Her girdiyi tekilleştir, kanonik malzeme adına dönüştür ve uygun kategoriye ata.",
    "",
    isEnglish ? "Rules:" : "Kurallar:",
    isEnglish
      ? "- Return only the ingredient name; do not include amounts, brands, adjectives, or recipes."
      : "- Sadece malzeme adı döndür; miktar, marka, sıfat veya tarif ekleme.",
    isEnglish
      ? "- Aggressively fix typos (e.g., \"lentl\" -> \"lentil\", \"chiken\" -> \"chicken\", \"strawbery\" -> \"strawberry\")."
      : "- Yazım hatalarını agresif bir şekilde düzelt (ör: \"mercmek\" -> \"mercimek\", \"gindi\" -> \"hindi\", \"çılak\" -> \"çilek\").",
    isEnglish
      ? "- Write ingredients in their simplest, generic form suitable for recipes."
      : "- Malzemeleri genel, tariflerde geçebilecek en yalın haliyle yaz.",
    isEnglish
      ? "- If it is the same ingredient, return the same canonical name."
      : "- Aynı malzeme ise aynı kanonik adla döndür.",
    isEnglish
      ? "- If unclear, return the cleaned input as-is."
      : "- Belirsizse girdiyi olduğu gibi ama temizlenmiş döndür.",
    isEnglish
      ? "- Use English names; prefer singular form."
      : "- Türkçe isimler kullan; tekil form tercih et.",
    isEnglish
      ? "- Capitalize each word (Title Case)."
      : "- Her kelimenin baş harfini BÜYÜK yap (Title Case), geri kalanı küçük olsun (Örn: 'Kuru Fasulye', 'Süt').",
    isEnglish
      ? "- Assign each ingredient to one of the categories below."
      : "- Her malzemeye aşağıdaki kategorilerden birini ata.",
    "",
    isEnglish ? "Categories:" : "Kategoriler:",
    categoryList,
    "",
    `${isEnglish ? "Valid category values" : "Geçerli kategori değerleri"}: ${categoryIds}`,
    "",
    `${isEnglish ? "Inputs" : "Girdiler"} (JSON Array): ${JSON.stringify(cleaned)}`,
    "",
    isEnglish ? "Output format (JSON):" : "Çıktı formatı (JSON):",
    "{",
    "  \"items\": [",
    isEnglish
      ? "    { \"input\": \"user input\", \"canonical\": \"Normalized Name\", \"categoryId\": \"produce\" }"
      : "    { \"input\": \"kullanıcı girişi\", \"canonical\": \"Düzeltilmiş Ad\", \"categoryId\": \"produce\" }",
    "  ]",
    "}",
  ].join("\n");
}

export function buildCompletePantryPrompt(
  inputs: string[],
  language: LanguageCode = "tr"
): {
  systemPrompt: string;
  userPrompt: string;
} {
  return {
    systemPrompt: buildPantrySystemPrompt(language),
    userPrompt: buildPantryPrompt(inputs, language),
  };
}
