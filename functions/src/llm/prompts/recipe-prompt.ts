/**
 * Menu Recipe Generation Prompt Builder
 */

import { MenuRecipeGenerationParams } from "../../types/generation-params";
import { RECIPE_JSON_SCHEMA } from "../schemas/recipe-schema";

const RECIPE_SCHEMA_STRING = JSON.stringify(RECIPE_JSON_SCHEMA, null, 2);
const DEFAULT_EQUIPMENT = ["ocak", "tencere", "tava", "fırın"];

export function buildSystemPrompt(): string {
  return [
    "Sen Omnoo uygulaması için tarif üreten bir yapay zekasın.",
    "Kullanıcı bilgileri ve seçilen menü sistemde mevcuttur.",
    "Soru sorma, açıklama yapma, sağlık veya diyet tavsiyesi verme.",
    "Yalnızca geçerli JSON üret ve şema dışına çıkma.",
  ].join("\n");
}

export function buildRecipePrompt(params: MenuRecipeGenerationParams): string {
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

  const context = {
    householdSize,
    dietaryRestrictions,
    allergies,
    cuisinePreferences,
    timePreference,
    skillLevel,
    equipment: equipment.length > 0 ? equipment : DEFAULT_EQUIPMENT,
    routine: routine ?? null,
  };

  let prompt = `Kullanıcı bağlamı (JSON):\n${JSON.stringify(context, null, 2)}\n\n`;
  prompt += `Seçilen menü (JSON):\n${JSON.stringify(menu, null, 2)}\n\n`;

  prompt += "Görev: Seçilen menüye ait tüm yemeklerin tariflerini üret.\n\n";

  prompt += "Kurallar:\n";
  prompt += "- Menüdeki yemek adlarını değiştirme, aynen kullan.\n";
  prompt += "- Menüdeki her öğe için 1 tarif üret; ürettiğin tarif sayısı menu.items.length ile aynı olmalı.\n";
  prompt += "- Her tarifin name ve course değeri menu.items içindeki öğe ile birebir aynı olmalı.\n";
  if (menuItems.length) {
    prompt += `- Bu menüde ${menuItems.length} öğe var; tam ${menuItems.length} tarif üret.\n`;
  }
  prompt += "- course alanı: main, side, soup, salad, meze, dessert, pastry olarak doğru atanmalı.\n";
  prompt += "- Kategori eşlemesi: Ana Yemek -> main, Yan Yemek -> side, Çorba -> soup, Salata -> salad, Meze -> meze, Tatlı -> dessert, Hamur İşi -> pastry.\n";
  prompt += `- servings alanı ${householdSize} olmalı.\n`;
  prompt += `- menuType alanı \"${menuType}\" olmalı.\n`;
  prompt += "- Tarifler Türkçe olmalı ve Türk ev mutfağına uygun olmalı.\n";
  prompt += "- cuisine alanı menüdeki cuisine değeri ile aynı olmalı.\n";
  prompt += "- brief alanı 2-3 cümlelik, davetkar ve net bir Türkçe özet olmalı (120-180 karakter).\n";
  prompt += "- Zaman tercihini dikkate al (hızlı/dengeli/zahmetli).\n";
  prompt += "- Malzemeler Türkiye'de kolay bulunan ürünler olmalı.\n";
  prompt += "- Malzeme ölçüleri Türk mutfak birimleriyle olmalı.\n";
  prompt += "- Malzeme unit değerleri şemadaki enum ile aynı olmalı.\n";
  prompt += "- ingredients içindeki notes alanı her zaman olmalı; yoksa boş string \"\" yaz.\n";
  prompt += "- Talimatlar numaralı ve adım adım olmalı (1'den başlamalı).\n";
  prompt += "- instructions içindeki durationMinutes alanı her zaman olmalı; yoksa 0 yaz.\n";
  prompt += "- Hazırlık, pişirme ve toplam süre dakika cinsinden verilmeli.\n";
  prompt += "- totalTimeMinutes = prepTimeMinutes + cookTimeMinutes olmalı.\n";
  prompt += "- Makrolar porsiyon başına yaklaşık değerler olmalı.\n";
  prompt += "- Makrolar sayısal olmalı; metin veya aralık kullanma.\n";
  prompt += "- Toplam menü süresi yaklaşık 45 dakikayı geçmemeli.\n";
  prompt += "- totalTimeMinutes alanı menünün toplam süresini göstermeli.\n";
  prompt += "- Diyet veya sağlık tavsiyesi verme.\n";
  prompt += "- Açıklama, gerekçe, soru veya alternatif verme.\n";
  prompt += "- UI metni, emoji veya sohbet dili kullanma.\n";
  prompt += "- Markdown kullanma.\n";
  prompt += "- Yalnızca JSON çıktısı üret.\n";

  prompt += "\nJSON Schema:\n";
  prompt += `${RECIPE_SCHEMA_STRING}\n`;

  return prompt;
}

export function buildCompletePrompt(params: MenuRecipeGenerationParams): {
  systemPrompt: string;
  userPrompt: string;
} {
  return {
    systemPrompt: buildSystemPrompt(),
    userPrompt: buildRecipePrompt(params),
  };
}
