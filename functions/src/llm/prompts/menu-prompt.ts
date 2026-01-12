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
    "Soru sorma; açıklamayı yalnızca reasoning alanında ver.",
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
    existingPantry,
    avoidIngredients,
    maxPrepTime,
    maxCookTime,
    previousPreferences,
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
    existingPantry: existingPantry ?? null,
    avoidIngredients: avoidIngredients ?? null,
    maxPrepTime: maxPrepTime ?? null,
    maxCookTime: maxCookTime ?? null,
    previousPreferences: previousPreferences ?? null,
  };

  let prompt = `Kullanıcı bağlamı (JSON):\n${JSON.stringify(context, null, 2)}\n\n`;

  prompt += "Görev: Sadece akşam yemeği menüsünü belirle. Tarif üretme.\n\n";

  prompt += "Kurallar:\n";
  prompt += "- Onboarding ve gün bazlı bağlam verilerini kullan; soru sorma.\n";
  prompt += "- Menü Mantık Matrisi'ni uygula: mutfağa göre doğru öğün yapısı kur ve kültür dışı kombinasyonlardan kaçın.\n";
  prompt += "- 3 + 1 kuralı: Ana yemek + yan yemek + (salata/meze veya çorba). Bu şema 3 öğe beklediği için yalnızca bu 3 bileşeni üret; içecek gibi opsiyonel +1'i ekleme.\n";
  prompt += "- Menü 1 ana yemek + 1 yan yemek + 1 extra içerir.\n";
  prompt += "- Extra öğe türü yalnızca soup, salad, meze, dessert veya pastry olabilir.\n";
  prompt += "- Kategori eşlemesi: Çorba -> soup, Salata -> salad, Meze -> meze, Tatlı -> dessert, Hamur İşi -> pastry.\n";
  prompt += "- Mutfak seçimi: Kullanıcının mutfak tercihleri varsa onlardan birini seç; yoksa Türk mutfağı seç.\n";
  prompt += "- Mutfak-kategori uyumu:\n";
  prompt += "  - Türk: Ana + Yan + (Çorba veya Salata/Meze). Ofis/gym bağlamında salata/meze önceliklendir.\n";
  prompt += "  - İtalyan: Ana (pasta/risotto) + Yan (fırın/ızgara sebze veya ekmek) + (Salata veya Antipasti/Meze).\n";
  prompt += "  - Asya/Japon: Ana + Yan (pirinç/erişte/ızgara sebze) + (Çorba).\n";
  prompt += "  - Amerikan: Ana + Yan (side) + (Salata). Tatlı yalnızca uygun bağlamda ve zaman uygunsa.\n";
  prompt += "  - Bowl/Modern: Ana tabak \"tek tabak\" gibi kurgula; yan ve extra hafif tamamlayıcı olsun.\n";
  prompt += "- Seçim yaparken her tarifin Kategori + Mutfak + Bağlam etiketleri varmış gibi filtrele.\n";
  prompt += "- Bağlamı rutin tipinden çıkar: office/school -> Portable/Office, gym -> High-Protein, off/remote -> Family/Elaborate olabilir.\n";
  prompt += "- Hızlı öğünlerde daha pratik ve taşınabilir seçenekler kullan; ağır/dağınık servislerden kaçın.\n";
  prompt += "- Sporcu/gym günlerinde yüksek proteinli ana yemek ve kompleks karbonhidratlı yan yemek tercih et.\n";
  prompt += "- Diyet kısıtları, alerjiler ve avoidIngredients listesi ihlal edilmemeli.\n";
  prompt += "- existingPantry verilmişse içindeki malzemeleri önceliklendir.\n";
  prompt += "- previousPreferences varsa beğenilenleri önceliklendir, beğenilmeyenlerden kaçın.\n";
  prompt += "- menuType alanı \"dinner\" olmalı.\n";
  prompt += "- cuisine alanı seçilen mutfak türü olmalı (Türkçe).\n";
  prompt += "- Menü öğeleri birbiriyle uyumlu olmalı.\n";
  prompt += "- reasoning alanı 1-2 cümlelik, doğal Türkçe bir açıklama olmalı.\n";
  prompt += "- reasoning kullanıcıya doğrudan hitap etmeli (\"sen\"/\"sana\" dili). \"Kullanıcı\" veya üçüncü şahıs kullanma.\n";
  prompt += "- reasoning yalnızca kullanıcı bağlamına ve rutinine dayanmalı; varsayım ekleme.\n";
  prompt += "- reasoning tamamen Türkçe olmalı; İngilizce kelime/etiket kullanma.\n";
  prompt += "- dietaryRestrictions/allergies İngilizce gelse bile reasoning içinde Türkçe karşılıklarını kullan (örn: dairy free -> sütsüz/laktozsuz, fish allergy -> balık alerjisi).\n";
  prompt += "- Kısıt/alerji bilgisi yoksa reasoning içinde bunlardan bahsetme.\n";
  prompt += "- reasoning içinde officeMealToGo/officeBreakfastAtHome/schoolBreakfast gibi rutin detaylarını dikkate al.\n";
  prompt += "- Zaman tercihini dikkate al (hızlı/dengeli/zahmetli).\n";
  prompt += "- maxPrepTime/maxCookTime varsa aşma; yoksa toplam süre yaklaşık 45 dakikayı geçmesin.\n";
  prompt += "- Yemekler Türkiye'de evde yapılabilir olmalı.\n";
  prompt += "- Malzemeler Türkiye'de kolay bulunan ürünler olmalı.\n";
  prompt += "- Aynı yemek, protein veya pişirme yöntemini sık tekrar etme.\n";
  prompt += "- Tüm yemek adları Türkçe olmalı.\n";
  prompt += "- Açıklama/gerekçeyi yalnızca reasoning alanında ver; onun dışında metin yazma.\n";
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
