/**
 * Pantry Normalization Prompt Builder
 */

export function buildPantrySystemPrompt(): string {
  return [
    "Sen Omnoo uygulaması için kullanıcı malzemelerini normalize eden bir yapay zekasın.",
    "Sadece geçerli JSON üret ve şema dışına çıkma.",
    "Soru sorma; açıklama yazma.",
  ].join("\n");
}

export function buildPantryPrompt(inputs: string[]): string {
  const cleaned = inputs.map((item) => item.trim()).filter(Boolean);

  return [
    "Görev: Aşağıdaki kullanıcı girişlerini mutfakta kullanılan malzemeler olarak organize et.",
    "Her girdiyi tekilleştir ve kanonik malzeme adına dönüştür.",
    "Kurallar:",
    "- Sadece malzeme adı döndür; miktar, marka, sıfat veya tarif ekleme.",
    "- Yazım hatalarını düzelt (ör: \"mercmek\" -> \"mercimek\", \"gindi\" -> \"hindi\").",
    "- Aynı malzeme ise aynı kanonik adla döndür.",
    "- Belirsizse girdiyi olduğu gibi ama temizlenmiş döndür.",
    "- Türkçe isimler kullan; tekil form tercih et.",
    "- Çıktı sırası girdi sırasıyla aynı olmalı.",
    "",
    `Girdiler (JSON Array): ${JSON.stringify(cleaned)}`,
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
