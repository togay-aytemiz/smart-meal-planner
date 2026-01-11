/**
 * Dinner Menu Decision Prompt Builder
 */

import { MenuGenerationRequest } from "../../types/menu";
import { MENU_JSON_SCHEMA } from "../schemas/menu-schema";

const MENU_SCHEMA_STRING = JSON.stringify(MENU_JSON_SCHEMA, null, 2);
const DEFAULT_EQUIPMENT = ["ocak", "tencere", "tava", "fırın"];

export function buildMenuSystemPrompt(): string {
  return [
    "Sen Omnoo uygulaması için menü kararı veren bir yapay zekasın.",
    "Kullanıcı bilgileri sistemde mevcuttur ve sana sağlanacaktır.",
    "Soru sorma, açıklama yapma.",
    "Yalnızca geçerli JSON üret ve şema dışına çıkma.",
  ].join("\n");
}

export function buildMenuPrompt(request: MenuGenerationRequest): string {
  const {
    date,
    dayOfWeek,
    dietaryRestrictions,
    allergies,
    cuisinePreferences,
    timePreference,
    skillLevel,
    equipment,
    householdSize,
    routine,
  } = request;

  const calculatedDayOfWeek =
    dayOfWeek ||
    new Date(date).toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();

  const context = {
    date,
    dayOfWeek: calculatedDayOfWeek,
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

  prompt += "Görev: Sadece akşam yemeği menüsünü belirle. Tarif üretme.\n\n";

  prompt += "Kurallar:\n";
  prompt += "- Menü 1 ana yemek + 1 yan yemek + 1 çorba/salata/meze içermeli.\n";
  prompt += "- Extra öğe türü yalnızca soup, salad veya meze olabilir.\n";
  prompt += "- menuType alanı \"dinner\" olmalı.\n";
  prompt += "- cuisine alanı seçilen mutfak türü olmalı (Türkçe).\n";
  prompt += "- Menü öğeleri birbiriyle uyumlu olmalı.\n";
  prompt += "- Mutfak türünü, kullanıcının mutfak tercihlerine göre sen seç.\n";
  prompt += "- Tercih yoksa Türk mutfağı seç.\n";
  prompt += "- Zaman tercihini dikkate al (hızlı/dengeli/zahmetli).\n";
  prompt += "- Yemekler Türkiye'de evde yapılabilir olmalı.\n";
  prompt += "- Malzemeler Türkiye'de kolay bulunan ürünler olmalı.\n";
  prompt += "- Toplam süre yaklaşık 45 dakikayı geçmemeli.\n";
  prompt += "- Aynı yemek, protein veya pişirme yöntemini sık tekrar etme.\n";
  prompt += "- Tüm yemek adları Türkçe olmalı.\n";
  prompt += "- Açıklama, gerekçe, soru veya alternatif verme.\n";
  prompt += "- UI metni, emoji veya sohbet dili kullanma.\n";
  prompt += "- Markdown kullanma.\n";
  prompt += "- Yalnızca JSON çıktısı üret.\n";

  prompt += "\nJSON Schema:\n";
  prompt += `${MENU_SCHEMA_STRING}\n`;

  return prompt;
}

export function buildCompleteMenuPrompt(
  request: MenuGenerationRequest
): { systemPrompt: string; userPrompt: string } {
  return {
    systemPrompt: buildMenuSystemPrompt(),
    userPrompt: buildMenuPrompt(request),
  };
}
