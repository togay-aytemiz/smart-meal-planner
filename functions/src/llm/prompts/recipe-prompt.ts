/**
 * Menu Recipe Generation Prompt Builder
 */

import { MenuRecipeGenerationParams } from "../../types/generation-params";
import { LanguageCode } from "../../types/menu";
const compactValue = (value: unknown): unknown => {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }
  if (Array.isArray(value)) {
    const cleaned = value
      .map((item) => compactValue(item))
      .filter((item) => item !== undefined);
    return cleaned.length ? cleaned : undefined;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, val]) => [key, compactValue(val)])
      .filter(([, val]) => val !== undefined);
    return entries.length ? Object.fromEntries(entries) : undefined;
  }
  return value;
};

export function buildSystemPrompt(language: LanguageCode = "tr"): string {
  const isEnglish = language === "en";
  return [
    isEnglish
      ? "You are an AI that generates recipes for the Omnoo app."
      : "Sen Omnoo uygulaması için tarif üreten bir yapay zekasın.",
    isEnglish
      ? "User information and the selected menu are available in the system."
      : "Kullanıcı bilgileri ve seçilen menü sistemde mevcuttur.",
    isEnglish
      ? "Do not ask questions, do not add explanations, and do not give health or diet advice."
      : "Soru sorma, açıklama yapma, sağlık veya diyet tavsiyesi verme.",
    isEnglish
      ? "Output only valid JSON and stay within the schema."
      : "Yalnızca geçerli JSON üret ve şema dışına çıkma.",
  ].join("\n");
}

export function buildRecipePrompt(params: MenuRecipeGenerationParams): string {
  const language = params.language ?? "tr";
  const isEnglish = language === "en";
  const {
    menu,
    dietaryRestrictions,
    allergies,
    cuisinePreferences,
    timePreference,
    skillLevel,
    equipment,
    householdSize,
    routine,
  } = params;
  const menuType = menu.menuType ?? "dinner";
  const menuItems = Array.isArray(menu.items) ? menu.items : [];

  const context =
    (compactValue({
      householdSize,
      dietaryRestrictions: dietaryRestrictions?.length ? dietaryRestrictions : undefined,
      allergies: allergies?.length ? allergies : undefined,
      cuisinePreferences: cuisinePreferences?.length ? cuisinePreferences : undefined,
      timePreference,
      skillLevel,
      equipment: equipment.length > 0 ? equipment : undefined,
      routine: routine ?? undefined,
    }) as Record<string, unknown>) ?? {};

  let prompt = `${isEnglish ? "User context" : "Kullanıcı bağlamı"} (JSON):\n${JSON.stringify(
    context,
    null,
    2
  )}\n\n`;
  prompt += `${isEnglish ? "Selected menu" : "Seçilen menü"} (JSON):\n${JSON.stringify(menu, null, 2)}\n\n`;

  prompt += isEnglish
    ? "Task: Generate recipes for all dishes in the selected menu.\n\n"
    : "Görev: Seçilen menüye ait tüm yemeklerin tariflerini üret.\n\n";

  prompt += isEnglish ? "Rules:\n" : "Kurallar:\n";
  prompt += isEnglish
    ? "- Do not change dish names; use them exactly.\n"
    : "- Menüdeki yemek adlarını değiştirme, aynen kullan.\n";
  prompt += isEnglish
    ? "- Generate 1 recipe per menu item; the number of recipes must equal menu.items.length.\n"
    : "- Menüdeki her öğe için 1 tarif üret; ürettiğin tarif sayısı menu.items.length ile aynı olmalı.\n";
  prompt += isEnglish
    ? "- Each recipe's name and course must match the corresponding menu item exactly.\n"
    : "- Her tarifin name ve course değeri menu.items içindeki öğe ile birebir aynı olmalı.\n";
  if (menuItems.length) {
    prompt += isEnglish
      ? `- This menu has ${menuItems.length} items; generate exactly ${menuItems.length} recipes.\n`
      : `- Bu menüde ${menuItems.length} öğe var; tam ${menuItems.length} tarif üret.\n`;
  }
  prompt += isEnglish
    ? "- course must be one of: main, side, soup, salad, meze, dessert, pastry.\n"
    : "- course alanı: main, side, soup, salad, meze, dessert, pastry olarak doğru atanmalı.\n";
  prompt += isEnglish
    ? "- Category mapping: Main -> main, Side -> side, Soup -> soup, Salad -> salad, Meze -> meze, Dessert -> dessert, Pastry -> pastry.\n"
    : "- Kategori eşlemesi: Ana Yemek -> main, Yan Yemek -> side, Çorba -> soup, Salata -> salad, Meze -> meze, Tatlı -> dessert, Hamur İşi -> pastry.\n";
  prompt += isEnglish
    ? `- servings must be ${householdSize}.\n`
    : `- servings alanı ${householdSize} olmalı.\n`;
  prompt += isEnglish
    ? `- menuType must be \"${menuType}\".\n`
    : `- menuType alanı \"${menuType}\" olmalı.\n`;
  prompt += isEnglish
    ? "- Recipes must be in English and suitable for home cooking.\n"
    : "- Tarifler Türkçe olmalı ve ev mutfağına uygun olmalı.\n";
  prompt += isEnglish
    ? "- cuisine must match the menu's cuisine value.\n"
    : "- cuisine alanı menüdeki cuisine değeri ile aynı olmalı.\n";
  prompt += isEnglish
    ? "- brief should be a 2-3 sentence, inviting and clear English summary (120-180 characters).\n"
    : "- brief alanı 2-3 cümlelik, davetkar ve net bir Türkçe özet olmalı (120-180 karakter).\n";
  prompt += isEnglish
    ? "- Respect time preference (quick/balanced/elaborate).\n"
    : "- Zaman tercihini dikkate al (hızlı/dengeli/zahmetli).\n";
  prompt += isEnglish
    ? "- If no equipment list is provided, assume basic kitchen equipment.\n"
    : "- Ekipman listesi yoksa temel mutfak ekipmanlarını varsay.\n";
  prompt += isEnglish
    ? "- Ingredients should be easy to find in typical grocery stores.\n"
    : "- Malzemeler Türkiye'de kolay bulunan ürünler olmalı.\n";
  prompt += isEnglish
    ? "- Use common kitchen measurement units.\n"
    : "- Malzeme ölçüleri Türk mutfak birimleriyle olmalı.\n";
  prompt += isEnglish
    ? "- ingredient unit values must match the schema enum.\n"
    : "- Malzeme unit değerleri şemadaki enum ile aynı olmalı.\n";
  prompt += isEnglish
    ? "- Each ingredient must include a notes field; use an empty string \"\" if none.\n"
    : "- ingredients içindeki notes alanı her zaman olmalı; yoksa boş string \"\" yaz.\n";
  prompt += isEnglish
    ? "- Instructions must be numbered step-by-step (start at 1).\n"
    : "- Talimatlar numaralı ve adım adım olmalı (1'den başlamalı).\n";
  prompt += isEnglish
    ? "- instructions.durationMinutes must always exist; use 0 if none.\n"
    : "- instructions içindeki durationMinutes alanı her zaman olmalı; yoksa 0 yaz.\n";
  prompt += isEnglish
    ? "- Prep, cook, and total times must be in minutes.\n"
    : "- Hazırlık, pişirme ve toplam süre dakika cinsinden verilmeli.\n";
  prompt += isEnglish
    ? "- totalTimeMinutes = prepTimeMinutes + cookTimeMinutes.\n"
    : "- totalTimeMinutes = prepTimeMinutes + cookTimeMinutes olmalı.\n";
  prompt += isEnglish
    ? "- Macros should be approximate per serving.\n"
    : "- Makrolar porsiyon başına yaklaşık değerler olmalı.\n";
  prompt += isEnglish
    ? "- Macros must be numeric; do not use text or ranges.\n"
    : "- Makrolar sayısal olmalı; metin veya aralık kullanma.\n";
  prompt += isEnglish
    ? "- Total menu time should not exceed ~45 minutes.\n"
    : "- Toplam menü süresi yaklaşık 45 dakikayı geçmemeli.\n";
  prompt += isEnglish
    ? "- totalTimeMinutes should represent the total menu time.\n"
    : "- totalTimeMinutes alanı menünün toplam süresini göstermeli.\n";
  prompt += isEnglish
    ? "- Do not provide diet or health advice.\n"
    : "- Diyet veya sağlık tavsiyesi verme.\n";
  prompt += isEnglish
    ? "- Do not provide explanations, reasoning, questions, or alternatives.\n"
    : "- Açıklama, gerekçe, soru veya alternatif verme.\n";
  prompt += isEnglish
    ? "- Do not use UI copy, emojis, or chatty language.\n"
    : "- UI metni, emoji veya sohbet dili kullanma.\n";
  prompt += isEnglish ? "- Do not use Markdown.\n" : "- Markdown kullanma.\n";
  prompt += isEnglish ? "- Output only JSON.\n" : "- Yalnızca JSON çıktısı üret.\n";
  prompt += isEnglish
    ? '\nOutput format (JSON): { "menuType": "dinner", "cuisine": "...", "totalTimeMinutes": 30, "recipes": [ { "course": "main", "name": "...", "brief": "...", "servings": 2, "prepTimeMinutes": 10, "cookTimeMinutes": 20, "totalTimeMinutes": 30, "ingredients": [], "instructions": [], "macrosPerServing": { "calories": 0, "protein": 0, "carbs": 0, "fat": 0 } } ] }'
    : '\nÇıktı formatı (JSON): { "menuType": "dinner", "cuisine": "...", "totalTimeMinutes": 30, "recipes": [ { "course": "main", "name": "...", "brief": "...", "servings": 2, "prepTimeMinutes": 10, "cookTimeMinutes": 20, "totalTimeMinutes": 30, "ingredients": [], "instructions": [], "macrosPerServing": { "calories": 0, "protein": 0, "carbs": 0, "fat": 0 } } ] }';

  return prompt;
}

export function buildCompletePrompt(params: MenuRecipeGenerationParams): {
  systemPrompt: string;
  userPrompt: string;
} {
  return {
    systemPrompt: buildSystemPrompt(params.language ?? "tr"),
    userPrompt: buildRecipePrompt(params),
  };
}
