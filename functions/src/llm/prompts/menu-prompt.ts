/**
 * Dinner Menu Decision Prompt Builder
 */

import { MenuGenerationRequest, LanguageCode } from "../../types/menu";

const CUISINE_LABELS_TR: Record<string, string> = {
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

const CUISINE_LABELS_EN: Record<string, string> = {
  turkish: "Turkish",
  mediterranean: "Mediterranean",
  italian: "Italian",
  asian: "Asian",
  "middle-eastern": "Middle Eastern",
  mexican: "Mexican",
  indian: "Indian",
  french: "French",
  japanese: "Japanese",
  chinese: "Chinese",
  thai: "Thai",
  american: "American",
};

const getCuisineLabels = (language: LanguageCode) =>
  language === "en" ? CUISINE_LABELS_EN : CUISINE_LABELS_TR;

const normalizeCuisinePreferences = (values: string[], language: LanguageCode) => {
  const labels = getCuisineLabels(language);
  return values
    .map((value) => labels[value] ?? value)
    .filter((value) => Boolean(value));
};

const hasNonTurkishCuisine = (values: string[]) =>
  values.some((value) => value !== "turkish");

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

export function buildMenuSystemPrompt(language: LanguageCode = "tr"): string {
  const isEnglish = language === "en";
  return [
    isEnglish
      ? "You are an AI that decides menus for the Omnoo app."
      : "Sen Omnoo uygulaması için menü kararı veren bir yapay zekasın.",
    isEnglish
      ? "User information is available in the system and will be provided to you."
      : "Kullanıcı bilgileri sistemde mevcuttur ve sana sağlanacaktır.",
    isEnglish
      ? "Do not ask questions; provide explanation only in the reasoning field."
      : "Soru sorma; açıklamayı yalnızca reasoning alanında ver.",
    isEnglish
      ? "Output only valid JSON and stay within the schema."
      : "Yalnızca geçerli JSON üret ve şema dışına çıkma.",
  ].join("\n");
}

export function buildMenuPrompt(request: MenuGenerationRequest): string {
  const language = request.language ?? "tr";
  const isEnglish = language === "en";
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
    cuisinePriority,
  } = request;

  const calculatedDayOfWeek =
    dayOfWeek ||
    new Date(date).toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  const resolvedMealType = mealType ?? "dinner";
  const mealLabel =
    resolvedMealType === "breakfast"
      ? (isEnglish ? "breakfast" : "kahvaltı")
      : resolvedMealType === "lunch"
        ? (isEnglish ? "lunch" : "öğle")
        : (isEnglish ? "dinner" : "akşam");

  const resolvedCuisinePreferences = normalizeCuisinePreferences(cuisinePreferences, language);
  const prefersNonTurkishCuisine = hasNonTurkishCuisine(cuisinePreferences);

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
      cuisinePriority: cuisinePriority ?? undefined,
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

  let prompt = `${isEnglish ? "User context" : "Kullanıcı bağlamı"} (JSON):\n${JSON.stringify(
    context,
    null,
    2
  )}\n\n`;

  prompt += isEnglish
    ? `Task: Decide only the ${mealLabel} menu. Do not generate recipes.\n\n`
    : `Görev: Sadece ${mealLabel} menüsünü belirle. Tarif üretme.\n\n`;

  const rules: string[] = isEnglish
    ? [
        "- Use onboarding and day context as the source of truth; do not ask questions.",
        "- Build a coherent combination aligned with the Menu Logic Matrix.",
        "- The items field must be an array of 1-4 items with { course, name, timeMinutes, calories }.",
        "- Dish names must be in English.",
        "- Do not violate dietary restrictions, allergies, or the avoidIngredients list.",
        "- Prioritize existingPantry if provided.",
        "- Respect time preference and maxPrepTime/maxCookTime limits.",
        "- If no equipment list is provided, assume basic kitchen equipment.",
        "- timeMinutes is the prep+cook estimate per item (minutes).",
        "- calories is the per-serving kcal estimate for each item.",
      ]
    : [
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
    rules.push(
      isEnglish
        ? "- Use at least one ingredient from requiredIngredients in the menu."
        : "- requiredIngredients listesinden en az birini menüde mutlaka kullan."
    );
    rules.push(
      isEnglish
        ? "- If possible, include requiredIngredients in the main dish."
        : "- Mümkünse requiredIngredients ana yemekte yer alsın."
    );
  }

  if (pantryOnly && existingPantry?.length) {
    rules.push(
      isEnglish
        ? "- Use ONLY the ingredients in existingPantry; do not go outside the list."
        : "- SADECE existingPantry listesindeki malzemeleri kullan; liste dışına çıkma."
    );
  }

  if (avoidItemNames && avoidItemNames.length > 0) {
    rules.push(
      isEnglish
        ? `- VARIETY: Do not repeat or suggest variants of dishes used this week: ${avoidItemNames.join(
            ", "
          )}.`
        : `- ÇEŞİTLİLİK: Bu hafta kullanılan yemekleri tekrar etme veya türevini önermeme: ${avoidItemNames.join(
            ", "
          )}.`
    );
  }
  if (resolvedMealType === "dinner") {
    rules.push(
      isEnglish
        ? "- Dinner menu: produce 2-4 items; at least 1 must be main."
        : "- Akşam menüsü: 2-4 öğe üret; en az 1 main olmalı."
    );
    rules.push(
      isEnglish
        ? "- Extra can only be soup, salad, meze, dessert, or pastry."
        : "- Extra yalnızca soup, salad, meze, dessert veya pastry olabilir."
    );
    rules.push(
      isEnglish
        ? "- Side and extra are optional; no required combination."
        : "- Side ve extra eklemek serbest; zorunlu kombinasyon yok."
    );
  }

  rules.push(
    isEnglish
      ? "- Category mapping: Soup -> soup, Salad -> salad, Meze -> meze, Dessert -> dessert, Pastry -> pastry."
      : "- Kategori eşlemesi: Çorba -> soup, Salata -> salad, Meze -> meze, Tatlı -> dessert, Hamur İşi -> pastry."
  );
  rules.push(
    isEnglish
      ? "- Cuisine selection: If the user has cuisine preferences, choose one of them; otherwise choose Turkish cuisine."
      : "- Mutfak seçimi: Kullanıcının mutfak tercihleri varsa onlardan birini seç; yoksa Türk mutfağı seç."
  );
  if (resolvedCuisinePreferences.length >= 1 && cuisinePriority === "high") {
    const preferredCuisine = resolvedCuisinePreferences[0];
    const anchorCount = resolvedMealType === "dinner" ? 2 : 1;
    rules.push(
      isEnglish
        ? `- CUISINE PRIORITY: "${preferredCuisine}". Menu items must strongly relate to this cuisine (name/technique/ingredients).`
        : `- MUTFAK ÖNCELİĞİ: "${preferredCuisine}". Menü öğeleri bu mutfakla güçlü ilişki taşımalı (isim/teknik/ingredient).`
    );
    rules.push(
      isEnglish
        ? `- At least ${anchorCount} items must clearly belong to the selected cuisine.`
        : `- Menüdeki öğelerin en az ${anchorCount} tanesi seçilen mutfağa açıkça ait olmalı.`
    );
    rules.push(
      isEnglish
        ? "- Avoid generic home-cooking or ambiguous cuisine suggestions."
        : "- Genel/yerel ev yemeği veya belirsiz mutfak önerilerinden kaçın."
    );
    if (resolvedCuisinePreferences.length > 1) {
      rules.push(
        isEnglish
          ? "- If multiple cuisines are selected, choose one and stay consistent throughout the menu."
          : "- Birden fazla mutfak seçildiyse tek birini seç ve menü boyunca aynı mutfak çizgisinde kal."
      );
    }
  }
  if (prefersNonTurkishCuisine) {
    rules.push(
      isEnglish
        ? "- If preferences include a non-Turkish option, pick one of those; do not fall back to Turkish cuisine."
        : "- Tercihler içinde Türk olmayan bir seçenek varsa mutlaka onlardan birini seç; Türk mutfağına dönme."
    );
  }
  rules.push(
    isEnglish
      ? "- Cuisine-category alignment: Turkish (soup/salad/meze), Italian (pasta/risotto), Chinese (wok/stir-fry + rice/noodles), American (grill/roast + side), Modern/Bowl (main-focused, light sides)."
      : "- Mutfak-kategori uyumu: Türk (çorba/salata/meze), İtalyan (pasta/risotto), Çin (wok/stir-fry + pirinç/erişte), Amerikan (grill/roast + side), Modern/Bowl (ana odaklı, hafif eşlikçi)."
  );
  rules.push(
    isEnglish
      ? "- If weeklyContext is provided, apply repeatMode/ingredientSynergyFrom/seasonalityHint cues."
      : "- weeklyContext varsa repeatMode/ingredientSynergyFrom/seasonalityHint ipuçlarını uygula."
  );
  rules.push(
    isEnglish
      ? "- If previousPreferences exists, prioritize liked items."
      : "- previousPreferences varsa beğenilenleri önceliklendir."
  );
  if (weeklyContext?.seasonalityHint) {
    rules.push(
      isEnglish
        ? "- If seasonalityHint exists, favor seasonal ingredients."
        : "- seasonalityHint varsa mevsime uygun malzemelere ağırlık ver."
    );
  }
  if (weeklyContext?.reasoningHint) {
    rules.push(
      isEnglish
        ? "- Reflect the reasoningHint tone in the menu selection."
        : "- reasoningHint tonu menü seçiminde hissettir."
    );
    rules.push(
      isEnglish
        ? "- For wow/modern goals, avoid simple single-ingredient salads (arugula salad, green salad, shepherd salad)."
        : "- Wow/modern hedefinde basit tek malzemeli salata (roka salatası, yeşil salata, çoban salata) önerme."
    );
  }
  if (weeklyContext?.ingredientSynergyFrom) {
    rules.push(
      isEnglish
        ? "- If ingredientSynergyFrom exists, briefly mention the synergy in reasoning (do not use dish names)."
        : "- ingredientSynergyFrom varsa reasoning içinde sinerjiyi kısaca belirt (yemek adı kullanma)."
    );
  }

  if (weeklyContext?.leftoverMainDish) {
    rules.push(
      isEnglish
        ? `- REQUIRED MAIN DISH: "${weeklyContext.leftoverMainDish}".`
        : `- ZORUNLU ANA YEMEK: "${weeklyContext.leftoverMainDish}".`
    );
    rules.push(
      isEnglish
        ? "- This dish must be main; side and extra must be different."
        : "- Bu yemek main olmalı; yan ve extra farklı olmalı."
    );
    rules.push(
      isEnglish
        ? "- If COET exists, mention it briefly in reasoning; do not say the whole menu is a repeat."
        : "- COET varsa reasoning bunu kısaca belirt; tüm menünün tekrar olduğunu söyleme."
    );
  }

  rules.push(
    isEnglish
      ? `- menuType field must be \"${resolvedMealType}\".`
      : `- menuType alanı \"${resolvedMealType}\" olmalı.`
  );
  rules.push(
    isEnglish
      ? "- cuisine field must be the selected cuisine (in English)."
      : "- cuisine alanı seçilen mutfak türü olmalı (Türkçe)."
  );
  rules.push(
    isEnglish ? "- Menu items must be coherent together." : "- Menü öğeleri birbiriyle uyumlu olmalı."
  );
  rules.push(
    isEnglish ? "- reasoning must be a single sentence." : "- reasoning tek cümle olmalı."
  );
  rules.push(
    isEnglish
      ? "- reasoning must not include dish or ingredient names."
      : "- reasoning yemek adı veya malzeme adı içermemeli."
  );
  rules.push(
    isEnglish
      ? "- reasoning should only explain the selection rationale/context."
      : "- reasoning yalnızca seçim nedeni/bağlamı anlatmalı."
  );
  rules.push(
    isEnglish
      ? "- reasoning should address the user directly (\"you\"/\"your\")."
      : "- reasoning kullanıcıya doğrudan hitap etmeli (\"sen\"/\"sana\")."
  );
  rules.push(
    isEnglish
      ? "- reasoning must be entirely in English; avoid Turkish words/labels."
      : "- reasoning tamamen Türkçe olmalı; İngilizce kelime/etiket kullanma."
  );
  rules.push(
    isEnglish
      ? "- Provide explanation only in the reasoning field; do not output extra text."
      : "- Açıklama yalnızca reasoning alanında olsun; başka metin üretme."
  );
  rules.push(
    isEnglish ? "- Do not use Markdown/emojis; output only JSON." : "- Markdown/emoji kullanma; yalnızca JSON üret."
  );

  prompt += isEnglish ? "Rules:\n" : "Kurallar:\n";
  prompt += rules.join("\n");
  prompt += isEnglish ? "\n\nOutput format (JSON example):\n" : "\n\nÇıktı formatı (JSON örneği):\n";
  prompt += isEnglish
    ? '{ "menuType": "dinner", "cuisine": "Turkish", "totalTimeMinutes": 30, "reasoning": "...", "items": [ { "course": "main", "name": "..." } ] }\n'
    : '{ "menuType": "dinner", "cuisine": "Türk", "totalTimeMinutes": 30, "reasoning": "...", "items": [ { "course": "main", "name": "..." } ] }\n';

  return prompt;
}

export function buildCompleteMenuPrompt(
  request: MenuGenerationRequest
): { systemPrompt: string; userPrompt: string } {
  return {
    systemPrompt: buildMenuSystemPrompt(request.language ?? "tr"),
    userPrompt: buildMenuPrompt(request),
  };
}
