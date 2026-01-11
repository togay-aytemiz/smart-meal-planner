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
  prompt += "- 1 ana yemek, 1 yan yemek, 1 çorba/salata/meze olacak şekilde 3 tarif üret.\n";
  prompt += "- course alanı: main, side, soup/salad/meze olarak doğru atanmalı.\n";
  prompt += `- servings alanı ${householdSize} olmalı.\n`;
  prompt += "- menuType alanı \"dinner\" olmalı.\n";
  prompt += "- Tarifler Türkçe olmalı ve Türk ev mutfağına uygun olmalı.\n";
  prompt += "- cuisine alanı menüdeki cuisine değeri ile aynı olmalı.\n";
  prompt += "- brief alanı kısa ve net Türkçe özet olmalı.\n";
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
