/**
 * Dinner Menu Decision Prompt Builder
 */

import { MenuGenerationRequest } from "../../types/menu";
const CUISINE_LABELS: Record<string, string> = {
  turkish: "Türk",
  mediterranean: "Akdeniz",
  italian: "İtalyan",
  asian: "Asya",
  "middle-eastern": "Ortadoğu",
  mexican: "Meksika",
  indian: "Hint",
  french: "Fransız",
  japanese: "Japon",
  chinese: "Çin",
  thai: "Tayland",
  american: "Amerikan",
};

const normalizeCuisinePreferences = (values: string[]) =>
  values
    .map((value) => CUISINE_LABELS[value] ?? value)
    .filter((value) => Boolean(value));

const hasNonTurkishCuisine = (values: string[]) =>
  values.some((value) => {
    const normalized = value.toLocaleLowerCase("tr-TR");
    return normalized !== "türk" && normalized !== "turk";
  });

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
    pantryOnly,
    requiredIngredients,
    avoidIngredients,
    avoidItemNames,
    maxPrepTime,
    maxCookTime,
    previousPreferences,
    mealType,
    weeklyContext,
  } = request;

  const calculatedDayOfWeek =
    dayOfWeek ||
    new Date(date).toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  const resolvedMealType = mealType ?? "dinner";
  const mealLabel =
    resolvedMealType === "breakfast"
      ? "kahvaltı"
      : resolvedMealType === "lunch"
        ? "öğle"
        : "akşam";

  const resolvedCuisinePreferences = normalizeCuisinePreferences(cuisinePreferences);
  const prefersNonTurkishCuisine = hasNonTurkishCuisine(resolvedCuisinePreferences);

  const routineContext = routine
    ? compactValue({
        type: routine.type,
        gymTime: routine.gymTime,
        officeMealToGo: routine.officeMealToGo,
        officeBreakfastAtHome: routine.officeBreakfastAtHome,
        schoolBreakfast: routine.schoolBreakfast,
        remoteMeals: routine.remoteMeals?.length ? routine.remoteMeals : undefined,
        excludeFromPlan: routine.excludeFromPlan ? true : undefined,
      })
    : undefined;

  const weeklyContextValue = weeklyContext
    ? compactValue({
        repeatMode: weeklyContext.repeatMode,
        ingredientSynergyFrom: weeklyContext.ingredientSynergyFrom
          ? compactValue({
              mealType: weeklyContext.ingredientSynergyFrom.mealType,
              date: weeklyContext.ingredientSynergyFrom.date,
              mainDishName: weeklyContext.ingredientSynergyFrom.mainDishName,
            })
          : undefined,
        seasonalityHint: weeklyContext.seasonalityHint,
        reasoningHint: weeklyContext.reasoningHint,
        leftoverMainDish: weeklyContext.leftoverMainDish,
      })
    : undefined;

  const context =
    (compactValue({
      date,
      dayOfWeek: calculatedDayOfWeek,
      mealType: resolvedMealType,
      householdSize,
      dietaryRestrictions: dietaryRestrictions?.length ? dietaryRestrictions : undefined,
      allergies: allergies?.length ? allergies : undefined,
      cuisinePreferences: resolvedCuisinePreferences.length
        ? resolvedCuisinePreferences
        : undefined,
      timePreference,
      skillLevel,
      equipment: equipment.length > 0 ? equipment : undefined,
      routine: routineContext ?? undefined,
      existingPantry: existingPantry?.length ? existingPantry : undefined,
      pantryOnly: pantryOnly ? true : undefined,
      requiredIngredients: requiredIngredients?.length ? requiredIngredients : undefined,
      avoidIngredients: avoidIngredients?.length ? avoidIngredients : undefined,
      maxPrepTime,
      maxCookTime,
      previousPreferences: previousPreferences ?? undefined,
      weeklyContext: weeklyContextValue ?? undefined,
    }) as Record<string, unknown>) ?? {};

  let prompt = `Kullanıcı bağlamı (JSON):\n${JSON.stringify(context, null, 2)}\n\n`;

  prompt += `Görev: Sadece ${mealLabel} menüsünü belirle. Tarif üretme.\n\n`;

  const rules: string[] = [
    "- Onboarding ve gün bağlamı esas; soru sorma.",
    "- Menü Mantık Matrisi'ne uygun, uyumlu kombinasyon kur.",
    "- items alanı { course, name, timeMinutes, calories } içeren 1-4 öğelik bir dizi olmalı.",
    "- Yemek adları Türkçe olmalı.",
    "- Diyet kısıtları, alerjiler ve avoidIngredients listesi ihlal edilmemeli.",
    "- existingPantry verilmişse önceliklendir.",
    "- Zaman tercihini ve maxPrepTime/maxCookTime sınırlarını dikkate al.",
    "- Ekipman listesi yoksa temel mutfak ekipmanlarını varsay.",
    "- timeMinutes her öğe için tek başına hazırlanma+pişirme tahminidir (dakika).",
    "- calories her öğe için kişi başı kcal tahminidir.",
  ];

  if (requiredIngredients?.length) {
    rules.push("- requiredIngredients listesinden en az birini menüde mutlaka kullan.");
    rules.push("- Mümkünse requiredIngredients ana yemekte yer alsın.");
  }

  if (pantryOnly && existingPantry?.length) {
    rules.push("- SADECE existingPantry listesindeki malzemeleri kullan; liste dışına çıkma.");
  }

  if (avoidItemNames && avoidItemNames.length > 0) {
    rules.push(
      `- ÇEŞİTLİLİK: Bu hafta kullanılan yemekleri tekrar etme veya türevini önermeme: ${avoidItemNames.join(
        ", "
      )}.`
    );
  }
  if (resolvedMealType === "dinner") {
    rules.push(
      "- Akşam menüsü: 2-4 öğe üret; en az 1 main olmalı."
    );
    rules.push(
      "- Extra yalnızca soup, salad, meze, dessert veya pastry olabilir."
    );
    rules.push(
      "- Side ve extra eklemek serbest; zorunlu kombinasyon yok."
    );
  }

  rules.push(
    "- Kategori eşlemesi: Çorba -> soup, Salata -> salad, Meze -> meze, Tatlı -> dessert, Hamur İşi -> pastry."
  );
  rules.push(
    "- Mutfak seçimi: Kullanıcının mutfak tercihleri varsa onlardan birini seç; yoksa Türk mutfağı seç."
  );
  if (resolvedCuisinePreferences.length === 1) {
    rules.push(
      `- ZORUNLU MUTFAK: "${resolvedCuisinePreferences[0]}". Başka mutfak önerme.`
    );
    rules.push("- Ana yemek ve yan/extra, seçilen mutfağa uygun olmalı.");
  }
  if (prefersNonTurkishCuisine) {
    rules.push(
      "- Tercihler içinde Türk olmayan bir seçenek varsa mutlaka onlardan birini seç; Türk mutfağına dönme."
    );
  }
  rules.push(
    "- Mutfak-kategori uyumu: Türk (çorba/salata/meze), İtalyan (pasta/risotto + salata), Asya (pirinç/erişte + çorba), Amerikan (side + salata), Modern/Bowl (ana odaklı, hafif eşlikçi)."
  );
  rules.push(
    "- weeklyContext varsa repeatMode/ingredientSynergyFrom/seasonalityHint ipuçlarını uygula."
  );
  rules.push("- previousPreferences varsa beğenilenleri önceliklendir.");
  if (weeklyContext?.seasonalityHint) {
    rules.push("- seasonalityHint varsa mevsime uygun malzemelere ağırlık ver.");
  }
  if (weeklyContext?.reasoningHint) {
    rules.push("- reasoningHint tonu menü seçiminde hissettir.");
    rules.push(
      "- Wow/modern hedefinde basit tek malzemeli salata (roka salatası, yeşil salata, çoban salata) önerme."
    );
  }
  if (weeklyContext?.ingredientSynergyFrom) {
    rules.push(
      "- ingredientSynergyFrom varsa reasoning içinde sinerjiyi kısaca belirt (yemek adı kullanma)."
    );
  }

  if (weeklyContext?.leftoverMainDish) {
    rules.push(`- ZORUNLU ANA YEMEK: "${weeklyContext.leftoverMainDish}".`);
    rules.push("- Bu yemek main olmalı; yan ve extra farklı olmalı.");
    rules.push(
      "- COET varsa reasoning bunu kısaca belirt; tüm menünün tekrar olduğunu söyleme."
    );
  }

  rules.push(`- menuType alanı \"${resolvedMealType}\" olmalı.`);
  rules.push("- cuisine alanı seçilen mutfak türü olmalı (Türkçe).");
  rules.push("- Menü öğeleri birbiriyle uyumlu olmalı.");
  rules.push("- reasoning tek cümle olmalı.");
  rules.push("- reasoning yemek adı veya malzeme adı içermemeli.");
  rules.push("- reasoning yalnızca seçim nedeni/bağlamı anlatmalı.");
  rules.push("- reasoning kullanıcıya doğrudan hitap etmeli (\"sen\"/\"sana\").");
  rules.push("- reasoning tamamen Türkçe olmalı; İngilizce kelime/etiket kullanma.");
  rules.push("- Açıklama yalnızca reasoning alanında olsun; başka metin üretme.");
  rules.push("- Markdown/emoji kullanma; yalnızca JSON üret.");

  prompt += "Kurallar:\n";
  prompt += rules.join("\n");
  prompt += "\n\nÇıktı formatı (JSON örneği):\n";
  prompt +=
    '{ "menuType": "dinner", "cuisine": "Türk", "totalTimeMinutes": 30, "reasoning": "...", "items": [ { "course": "main", "name": "..." } ] }\n';

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
