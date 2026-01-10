/**
 * Daily Menu Generation Prompt Builder
 * MVP: Single dinner meal per day
 * Future: Full daily menu (breakfast, lunch, dinner, snacks)
 */

import { MenuGenerationRequest } from "../../types/menu";

/**
 * Build system prompt for daily menu generation
 */
export function buildMenuSystemPrompt(): string {
  return `Sen Türkiye'deki kullanıcılar için uzman bir yemek planlama asistanısın. Türk mutfağı, Türkiye'de bulunabilen malzemeler ve Türk kültürü konusunda derin bilgiye sahipsin.

**ÖNEMLİ: Bu uygulama sadece Türkiye için tasarlandı. Tüm çıktılar Türkçe ve Türk mutfağı odaklı olmalı.**

Görevin, kullanıcı tercihleri, diyet kısıtlamaları, rutinler ve pişirme kısıtlamalarına dayalı kişiselleştirilmiş günlük menüler için tam, üretime hazır tarifler oluşturmaktır. Tarifler şunları içermelidir:

**TÜRKİYE ODAKLI GEREKSİNİMLER (KRİTİK):**
1. **Türk Mutfağı**: Tarifler Türk mutfağı ve Türkiye'de popüler mutfaklardan olmalı (Akdeniz, Ege, Karadeniz, vb.)
2. **Türkiye'de Bulunabilir Malzemeler**: Sadece Türkiye'de marketlerde, manavlarda ve aktarlarda bulunabilecek malzemeler kullan
   - Örnek: "yeşil mercimek", "kırmızı mercimek", "bulgur", "yogurt", "zeytinyağı", "biber salçası"
   - Örnek YASAK: "quinoa", "chia seeds", "avokado oil", "sriracha" gibi Türkiye'de nadir bulunan malzemeler
3. **Türkçe Çıktı**: Tüm metinler Türkçe olmalı
   - Tarif adı Türkçe: "Yeşil Mercimek Salatası", "Mercimek Köftesi", "Karnıyarık"
   - Malzeme isimleri Türkçe: "yeşil mercimek", "soğan", "domates", "zeytinyağı"
   - Talimatlar Türkçe: "Mercimeği yıkayın", "Soğanı doğrayın", "Tavada kızartın"
   - Açıklama (reasoning) Türkçe: Tamamen Türkçe, İngilizce kelime YOK

**GENEL GEREKSİNİMLER:**
- Doğru ve gerçekçi (pişirme süreleri, sıcaklıklar, miktarlar)
- Beslenme açısından dengeli ve kullanıcının rutinine uygun (örneğin, spor günleri daha fazla protein gerekir)
- Ölçeklenebilir (malzemeler farklı porsiyonlar için ayarlanabilir)
- Güvenli (listelenen alerjenleri ASLA kullanma - bu kritik)
- Pratik (kullanıcının beceri seviyesi ve mevcut ekipmanına uygun)
- Bağlam odaklı (günün rutinini düşün: ofis günü taşınabilir yemekler, spor günü antrenman sonrası beslenme, vb.)
- Açık bir gerekçe ile açıklanmış (neden bu tarif bu kullanıcı için bu gün)

Özel dikkat etmen gerekenler:
1. **Diyet Kısıtlamaları**: Tüm diyet tercihlerini kesinlikle takip et (vegan, vejetaryen, glutensiz, vb.)
2. **Alerjiler**: Kullanıcının alerjisi olan malzemeleri ASLA kullanma - bu bir güvenlik gereksinimidir
3. **Rutin Bağlamı**: Spor günüyse, protein açısından zengin yemeklere öncelik ver. Ofis günüyse, yemeklerin taşınabilir olduğundan emin ol.
4. **Zaman Kısıtlamaları**: Pişirme süresini kullanıcının zaman tercihine göre ayarla (hızlı vs zahmetli)
5. **Beceri Seviyesi**: Tarif zorluğunu kullanıcının pişirme becerisine göre ayarla
6. **Ekipman**: Sadece kullanıcının mevcut ekipmanını kullan
7. **Açıklama (Reasoning)**: Her zaman bu spesifik kullanıcı için bu spesifik günde neden bu tarifin seçildiğine dair kişiselleştirilmiş bir açıklama sağla

MVP için, bir gün için tek bir akşam yemeği oluşturuyorsun. Yemek şunları içermeli:
- Akşam yemeği zaman dilimi için uygun olmalı
- Günün rutinini düşünmeli (örneğin, spordan sonra hafif yemek, uzaktan çalışma gününde doyurucu yemek)
- Tek başına doyurucu bir akşam yemeği olarak tamamlanmış olmalı
- Tüm gerekli beslenme bilgilerini içermeli
- Tarifin kullanıcının ihtiyaçlarına neden uyduğunu açıklayan net, kişiselleştirilmiş bir gerekçe içermeli

Malzemelere dayalı olarak doğru hesaplanmış detaylı beslenme bilgisi sağlamalısın.
Tüm malzeme miktarları kesin ve ölçeklenebilir olmalı.
Tüm süreler gerçekçi olmalı ve zorluk seviyesiyle eşleşmeli.
Talimatlar açık, numaralandırılmış ve kullanıcının beceri seviyesiyle eşleşmeli olmalı.

**KRİTİK: Açıklama (reasoning) alanı ZORUNLUDUR ve şunları içermelidir:**
- Bu spesifik tarifin NEDEN BU kullanıcı için BU günde seçildiğini açıkla
- Kullanıcının rutini, tercihleri, diyet ihtiyaçları veya gün bağlamına referans ver
- Türkçe yazılmalı, samimi ve dostane ton
- 50-500 karakter uzunluğunda
- Kullanıcının anlaşıldığını ve önemsendiğini hissettirmeli
- Genel veya şablon olmamalı
- **SADECE Türkçe kelimeler kullan - İngilizce kelime YOK ("recovery", "elaborate", "quick", "balanced" gibi)**
- Türkçe karşılıklarını kullan: "toparlanma" (recovery), "zahmetli" (elaborate), "hızlı" (quick), "dengeli" (balanced)

YALNIZCA sağlanan şemayla eşleşen geçerli JSON döndür. JSON nesnesinin dışında herhangi bir metin ekleme.`;
}

/**
 * Build user prompt for daily menu generation
 * MVP: Generates single dinner meal
 */
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
    mealType,
  } = request;

  // Calculate day of week from date if not provided
  const calculatedDayOfWeek =
    dayOfWeek ||
    new Date(date).toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();

  let prompt = `Bu uygulama sadece Türkiye için tasarlandı. Tüm çıktılar Türkçe ve Türk mutfağı odaklı olmalı.\n\n`;
  prompt += `${date} (${calculatedDayOfWeek}) günü için kişiselleştirilmiş ${mealType} menüsü oluştur:\n\n`;

  // === TÜRKİYE ODAKLI GEREKSİNİMLER (KRİTİK) ===
  prompt += `## TÜRKİYE ODAKLI GEREKSİNİMLER (KRİTİK - ZORUNLU)\n`;
  prompt += `- **Tarif Adı**: Türkçe olmalı (örn: "Yeşil Mercimek Salatası", "Mercimek Köftesi", "Karnıyarık", "İmam Bayıldı")\n`;
  prompt += `- **Malzemeler**: Sadece Türkiye'de marketlerde, manavlarda ve aktarlarda bulunabilecek malzemeler kullan\n`;
  prompt += `  * ✅ Kullanılabilir: yeşil mercimek, kırmızı mercimek, bulgur, nohut, fasulye, pirinç, makarna, \n`;
  prompt += `     zeytinyağı, ayçiçek yağı, domates, salça, soğan, sarımsak, maydanoz, nane, \n`;
  prompt += `     yoğurt, peynir, yumurta, et, tavuk, balık, sebzeler (patlıcan, biber, kabak, vb.)\n`;
  prompt += `  * ❌ Kullanılamaz: quinoa, chia seeds, avokado oil, sriracha, coconut aminos, \n`;
  prompt += `     tahini (eğer özel aktardan bulunması gerekiyorsa), nadir bulunan exotic malzemeler\n`;
  prompt += `- **Türk Mutfağı Odaklı**: Tarifler Türk mutfağı veya Türkiye'de popüler mutfaklardan olmalı\n`;
  prompt += `  * Türk mutfağı (Anadolu, Ege, Akdeniz, Karadeniz, Güneydoğu, vb.)\n`;
  prompt += `  * Akdeniz mutfağı (Türkiye'de popüler)\n`;
  prompt += `  * Orta Doğu mutfağı (Türkiye'de bulunan malzemelerle)\n`;
  prompt += `- **Türkçe Metin**: Tüm çıktılar Türkçe olmalı\n`;
  prompt += `  * Tarif adı: Türkçe\n`;
  prompt += `  * Malzeme isimleri: Türkçe (örn: "yeşil mercimek", "zeytinyağı", "biber salçası")\n`;
  prompt += `  * Talimatlar: Türkçe (örn: "Mercimeği yıkayın", "Soğanı doğrayın", "Tavada kızartın")\n`;
  prompt += `  * Açıklama (reasoning): Tamamen Türkçe, İngilizce kelime YOK\n`;
  prompt += `- **Türkiye'de Bulunabilir Ekipman**: Sadece Türkiye'de standart mutfaklarda bulunan ekipmanlar\n`;
  prompt += `  * ✅ Kullanılabilir: fırın, ocak, tencere, tava, blender, mikser, mutfak robotu\n`;
  prompt += `  * ❌ Kullanılamaz: sous vide, air fryer (nadir), özel professional ekipmanlar\n`;
  prompt += `\n`;

  // === USER PROFILE ===
  prompt += `## KULLANICI PROFİLİ\n`;
  prompt += `- Hane Halkı: ${householdSize} kişi\n`;
  prompt += `- Diyet Tercihleri: ${dietaryRestrictions.length > 0 ? dietaryRestrictions.join(", ") : "Yok"}\n`;
  prompt += `- Mutfak Tercihleri: ${cuisinePreferences.length > 0 ? cuisinePreferences.join(", ") : "Türk mutfağı (varsayılan)"}\n`;
  if (cuisinePreferences.length === 0) {
    prompt += `  * Not: Kullanıcı spesifik mutfak seçmedi, Türk mutfağı odaklı tarifler öner\n`;
  }
  prompt += `- Zaman Tercihi: ${timePreference === "quick" ? "hızlı" : timePreference === "balanced" ? "dengeli" : "zahmetli"}\n`;
  prompt += `- Pişirme Beceri Seviyesi: ${skillLevel === "beginner" ? "başlangıç" : skillLevel === "intermediate" ? "orta" : "ileri"}\n`;
  prompt += `- Mevcut Ekipman: ${equipment.length > 0 ? equipment.join(", ") : "Temel mutfak ekipmanları (ocak, fırın, temel mutfak aletleri)"}\n`;
  prompt += `\n`;

  // === DIETARY RESTRICTIONS (STRICT - CRITICAL) ===
  prompt += `## DIETARY RESTRICTIONS (STRICT - MUST FOLLOW)\n`;
  if (dietaryRestrictions.length > 0) {
    prompt += `- Dietary Preferences: ${dietaryRestrictions.join(", ")}\n`;
    prompt += `  * Recipe MUST comply with these preferences\n`;
    if (dietaryRestrictions.includes("vegan")) {
      prompt += `  * ⚠️ VEGAN: No animal products (meat, dairy, eggs, honey, etc.)\n`;
    }
    if (dietaryRestrictions.includes("vegetarian")) {
      prompt += `  * ⚠️ VEGETARIAN: No meat or fish, but dairy and eggs are OK\n`;
    }
    if (dietaryRestrictions.includes("gluten-free")) {
      prompt += `  * ⚠️ GLUTEN-FREE: No wheat, barley, rye, or gluten-containing ingredients\n`;
    }
  }
  prompt += `\n`;

  // === ALLERGIES (CRITICAL - NEVER INCLUDE) ===
  if (allergies.length > 0) {
    prompt += `## ⚠️ ALLERGIES (CRITICAL - NEVER INCLUDE)\n`;
    prompt += `- Life-threatening allergens: ${allergies.join(", ")}\n`;
    prompt += `- **SAFETY REQUIREMENT**: Do NOT use these ingredients in ANY form\n`;
    prompt += `- Check all ingredient names, derivatives, and processed foods\n`;
    prompt += `- For example, if user is allergic to nuts, avoid: peanuts, tree nuts, nut oils, nut butters, etc.\n`;
    prompt += `- If user is allergic to dairy, avoid: milk, cheese, butter, cream, yogurt, etc.\n`;
    prompt += `- This is a safety-critical requirement - never suggest recipes with allergens\n`;
  } else {
    prompt += `## ALLERGIES\n`;
    prompt += `- No known allergies\n`;
  }
  prompt += `\n`;

  // === DAY-SPECIFIC CONTEXT ===
  if (routine) {
    prompt += `## DAY-SPECIFIC CONTEXT (${calculatedDayOfWeek.toUpperCase()})\n`;
    prompt += `- Day Type: ${routine.type}\n`;
    prompt += `\n`;

    // Gym Day Context
    if (routine.type === "gym") {
      if (routine.gymTime === "evening" && mealType === "dinner") {
        prompt += `- ⚠️ POST-WORKOUT DINNER: This is a gym day with evening workout\n`;
        prompt += `  * Prioritize protein-rich meal for muscle recovery\n`;
        prompt += `  * Include good balance of protein (30-40g) and carbs for recovery\n`;
        prompt += `  * Meal should be substantial but not too heavy\n`;
        prompt += `  * Consider timing - dinner should be after workout\n`;
      } else if (routine.gymTime === "morning" || routine.gymTime === "afternoon") {
        prompt += `- Gym day (workout: ${routine.gymTime})\n`;
        prompt += `  * Dinner should be balanced and nutritious\n`;
        prompt += `  * Recovery-focused meal\n`;
      }
    }

    // Office Day Context
    if (routine.type === "office") {
      if (routine.remoteMeals?.includes("dinner") || mealType === "dinner") {
        prompt += `- Office day\n`;
        prompt += `  * Consider that user might be tired after work\n`;
        prompt += `  * Quick or balanced meal preferred (avoid elaborate unless timePreference is elaborate)\n`;
        prompt += `  * If user works late, consider lighter dinner\n`;
      }
    }

    // Remote Day Context
    if (routine.type === "remote") {
      prompt += `- Working from home\n`;
      prompt += `  * Can prepare more elaborate meals if timePreference allows\n`;
      prompt += `  * More flexibility with cooking time\n`;
      prompt += `  * Can use more equipment and take breaks for cooking\n`;
    }

    // Day Off Context
    if (routine.type === "off") {
      prompt += `- Day off / Weekend\n`;
      prompt += `  * Can take more time for elaborate cooking\n`;
      prompt += `  * Can try more complex recipes if skill level allows\n`;
      prompt += `  * Can prepare more time-consuming meals\n`;
    }

    if (routine.excludeFromPlan) {
      prompt += `- ⚠️ EXCLUDED FROM PLAN: User may skip this meal\n`;
      prompt += `  * Generate a lighter, optional meal\n`;
    }
    prompt += `\n`;
  } else {
    prompt += `## DAY CONTEXT\n`;
    prompt += `- No specific routine information available\n`;
    prompt += `- Generate a balanced ${mealType} meal appropriate for ${calculatedDayOfWeek}\n`;
    prompt += `\n`;
  }

  // === MEAL TYPE SPECIFIC REQUIREMENTS ===
  if (mealType === "dinner") {
    prompt += `## DINNER REQUIREMENTS (MVP)\n`;
    prompt += `- Generate a complete dinner meal (main course)\n`;
    prompt += `- Dinner should be satisfying and substantial\n`;
    prompt += `- Consider typical dinner time (evening)\n`;
    prompt += `- Balance of protein, carbs, and vegetables\n`;
    if (routine?.type === "gym" && routine.gymTime === "evening") {
      prompt += `- Post-workout dinner: Higher protein content needed for recovery\n`;
    }
    prompt += `\n`;
  }

  // === TIME CONSTRAINTS ===
  prompt += `## TIME CONSTRAINTS\n`;
  prompt += `- Time Preference: ${timePreference}\n`;
  if (timePreference === "quick") {
    prompt += `  * Total time (prep + cook) should be < 30 minutes\n`;
    prompt += `  * Prioritize simple, fast recipes\n`;
  } else if (timePreference === "balanced") {
    prompt += `  * Total time (prep + cook) can be 30-60 minutes\n`;
    prompt += `  * Moderate complexity is OK\n`;
  } else {
    prompt += `  * Total time (prep + cook) can be 60+ minutes\n`;
    prompt += `  * Elaborate recipes are allowed\n`;
  }
  if (maxPrepTime) {
    prompt += `- Maximum Prep Time: ${maxPrepTime} minutes (HARD LIMIT)\n`;
  }
  if (maxCookTime) {
    prompt += `- Maximum Cook Time: ${maxCookTime} minutes (HARD LIMIT)\n`;
  }
  prompt += `\n`;

  // === SKILL LEVEL ===
  prompt += `## SKILL LEVEL REQUIREMENTS\n`;
  prompt += `- User Skill Level: ${skillLevel}\n`;
  if (skillLevel === "beginner") {
    prompt += `  * Instructions must be very detailed and step-by-step\n`;
    prompt += `  * Use simple cooking techniques\n`;
    prompt += `  * Avoid complex methods (sous vide, fermentation, etc.)\n`;
    prompt += `  * Difficulty: "easy" only\n`;
    prompt += `  * Clear explanations for each step\n`;
  } else if (skillLevel === "intermediate") {
    prompt += `  * Instructions can be moderately detailed\n`;
    prompt += `  * Can include some advanced techniques\n`;
    prompt += `  * Difficulty: "easy" or "medium"\n`;
  } else {
    prompt += `  * Instructions can be concise\n`;
    prompt += `  * Advanced techniques allowed\n`;
    prompt += `  * Difficulty: "easy", "medium", or "hard"\n`;
  }
  prompt += `\n`;

  // === EQUIPMENT ===
  if (equipment.length > 0) {
    prompt += `## MEVCUT EKİPMAN\n`;
    prompt += `- Mevcut Ekipman: ${equipment.join(", ")}\n`;
    prompt += `- Tarif SADECE bu ekipmanları kullanmalı\n`;
    prompt += `- Tarif listede olmayan ekipman gerektiriyorsa, alternatif öner veya sadeleştir\n`;
    prompt += `- Ekipman isimleri Türkçe olmalı: 'fırın', 'ocak', 'tencere', 'tava', 'blender', 'mutfak robotu'\n`;
  } else {
    prompt += `## EKİPMAN (Türkiye'de Standart Mutfak)\n`;
    prompt += `- Temel mutfak ekipmanları (ocak, fırın, temel mutfak aletleri, tencere, tava)\n`;
    prompt += `- Türkiye'de standart mutfaklarda bulunan ekipmanlar\n`;
    prompt += `- Özel ekipmanlardan kaçın (sous vide, air fryer gibi nadir bulunanlar)\n`;
    prompt += `- Ekipman listesi Türkçe olmalı: ['fırın', 'ocak', 'tencere', 'tava']\n`;
  }
  prompt += `\n`;

  // === MUTFAK TERCIHLERİ ===
  if (cuisinePreferences.length > 0) {
    prompt += `## MUTFAK TERCIHLERİ\n`;
    prompt += `- Tercih Edilen Mutfaklar: ${cuisinePreferences.join(", ")}\n`;
    prompt += `- Tarif bu mutfakların pişirme stilini, lezzetlerini ve malzemelerini yansıtmalı\n`;
    prompt += `- Ancak **SADECE Türkiye'de bulunabilen malzemelerle** (otantik ama erişilebilir)\n`;
    prompt += `- İstenen mutfakların lezzet profili ve pişirme yöntemleriyle eşleşmeli\n`;
    prompt += `- Örnek: Akdeniz mutfağı dersen, zeytinyağı, sebzeler, balık gibi Türkiye'de bulunan Akdeniz malzemeleri kullan\n`;
    prompt += `- Örnek: Türk mutfağı dersen, mercimek, bulgur, salça, yoğurt gibi geleneksel Türk malzemeleri kullan\n`;
  } else {
    prompt += `## MUTFAK (Varsayılan: Türk Mutfağı)\n`;
    prompt += `- Spesifik mutfak tercihi belirtilmemiş\n`;
    prompt += `- **Varsayılan**: Türk mutfağı odaklı tarifler öner\n`;
    prompt += `- Türk mutfağından geleneksel veya modern yorumlu tarifler\n`;
    prompt += `- Türkiye'de popüler, erişilebilir ve sevilen yemekler\n`;
    prompt += `- Dengeli ve çeşitli lezzetler (Anadolu, Ege, Akdeniz, Karadeniz mutfaklarından)\n`;
    prompt += `- Geleneksel Türk malzemeleri kullan: mercimek, bulgur, nohut, salça, yoğurt, zeytinyağı\n`;
  }
  prompt += `\n`;

  // === PANTRY OPTIMIZATION ===
  if (existingPantry && existingPantry.length > 0) {
    prompt += `## COST OPTIMIZATION - EXISTING PANTRY\n`;
    prompt += `- User Already Has: ${existingPantry.join(", ")}\n`;
    prompt += `- **PRIORITIZE**: Use these ingredients to reduce grocery costs\n`;
    prompt += `- Include these ingredients in the recipe when possible\n`;
    prompt += `- Only add new ingredients that are essential for the recipe\n`;
    prompt += `- This helps reduce food waste and grocery expenses\n`;
    prompt += `\n`;
  }

  // === AVOID INGREDIENTS ===
  if (avoidIngredients && avoidIngredients.length > 0) {
    prompt += `## AVOID INGREDIENTS\n`;
    prompt += `- Do NOT include: ${avoidIngredients.join(", ")}\n`;
    prompt += `- Use alternative ingredients instead\n`;
    prompt += `- These are user dislikes or preferences to avoid\n`;
    prompt += `\n`;
  }

  // === USER FEEDBACK (Future - Post-MVP) ===
  if (previousPreferences) {
    prompt += `## USER PREFERENCES (Learned from Feedback)\n`;
    if (previousPreferences.likedRecipes && previousPreferences.likedRecipes.length > 0) {
      prompt += `- User liked these recipe types/styles (use as reference for similar recipes)\n`;
      prompt += `- Consider similar flavor profiles, cooking methods, or ingredient combinations\n`;
    }
    if (previousPreferences.dislikedRecipes && previousPreferences.dislikedRecipes.length > 0) {
      prompt += `- User disliked these recipe types (avoid similar recipes)\n`;
      prompt += `- Avoid similar flavor profiles, cooking methods, or ingredient combinations\n`;
    }
    if (previousPreferences.avoidIngredients && previousPreferences.avoidIngredients.length > 0) {
      prompt += `- Additional avoid ingredients (from feedback): ${previousPreferences.avoidIngredients.join(", ")}\n`;
    }
    if (previousPreferences.preferredCuisines && previousPreferences.preferredCuisines.length > 0) {
      prompt += `- Learned cuisine preferences (from feedback): ${previousPreferences.preferredCuisines.join(", ")}\n`;
    }
    prompt += `\n`;
  }

  // === NUTRITION REQUIREMENTS ===
  prompt += `## NUTRITION REQUIREMENTS\n`;
  prompt += `You must provide accurate, detailed nutrition information:\n`;
  prompt += `\n`;
  prompt += `1. Per 100g (standardized):\n`;
  prompt += `   - Calculate based on total recipe weight\n`;
  prompt += `   - Standardized for comparison across recipes\n`;
  prompt += `\n`;
  prompt += `2. Per Serving (for ${householdSize} servings):\n`;
  prompt += `   - Total recipe nutrition divided by ${householdSize}\n`;
  prompt += `   - Include serving size in grams\n`;
  prompt += `   - This is what one person gets\n`;
  prompt += `\n`;
  prompt += `3. Total Recipe (all ${householdSize} servings combined):\n`;
  prompt += `   - Total nutrition for entire recipe\n`;
  prompt += `   - Include total weight in grams\n`;
  prompt += `   - Sum of all ingredients' nutrition\n`;
  prompt += `\n`;
  prompt += `Required nutrition fields:\n`;
  prompt += `- Calories (kcal)\n`;
  prompt += `- Protein (grams) - **Important for gym days**\n`;
  prompt += `- Carbs (grams)\n`;
  prompt += `- Fat (grams)\n`;
  prompt += `- Fiber (grams) - preferred\n`;
  prompt += `- Sugar (grams) - preferred\n`;
  prompt += `- Sodium (mg) - preferred\n`;
  prompt += `\n`;

  // Special nutrition requirements based on routine
  if (routine?.type === "gym" && routine.gymTime === "evening") {
    prompt += `**POST-WORKOUT DINNER NUTRITION TARGETS:**\n`;
    prompt += `- Protein: 30-40g per serving (for muscle recovery)\n`;
    prompt += `- Carbs: Moderate (for glycogen replenishment)\n`;
    prompt += `- Balance is key - substantial but not too heavy\n`;
    prompt += `\n`;
  }

  prompt += `All nutrition values must be realistic numbers based on the ingredients used.\n`;
  prompt += `Do not provide null or 0 values for required fields.\n`;
  prompt += `\n`;

  // === TARIF YAPISI GEREKSİNİMLERİ ===
  prompt += `## TARIF YAPISI GEREKSİNİMLERİ\n`;
  prompt += `\n`;
  prompt += `Tam bir akşam yemeği tarifi oluştur (${householdSize} kişilik):\n`;
  prompt += `\n`;
  prompt += `### Malzemeler:\n`;
  prompt += `- ${householdSize} porsiyon için gerekli TÜM malzemeleri listele\n`;
  prompt += `- **SADECE Türkiye'de marketlerde, manavlarda ve aktarlarda bulunabilecek malzemeler** kullan\n`;
  prompt += `- ✅ Kullanılabilir örnekler: yeşil mercimek, kırmızı mercimek, bulgur, nohut, fasulye, pirinç, makarna,\n`;
  prompt += `   zeytinyağı, ayçiçek yağı, domates, biber salçası, domates salçası, soğan, sarımsak, maydanoz, nane,\n`;
  prompt += `   yoğurt, beyaz peynir, kaşar peyniri, yumurta, kıyma, tavuk, balık, sebzeler (patlıcan, biber, kabak, vb.),\n`;
  prompt += `   baharatlar (kırmızıbiber, karabiber, kimyon, vb.)\n`;
  prompt += `- ❌ Kullanılamaz örnekler: quinoa, chia seeds, avokado oil, sriracha, coconut aminos, tahini (özel aktardan bulunması gerekiyorsa)\n`;
  prompt += `- Metrik birimler (g, kg, ml, L) veya Türk birimleri (yemek kaşığı, su bardağı, çay kaşığı, vb.) kullan\n`;
  prompt += `- Miktarlar ${householdSize} porsiyon için kesin olmalı\n`;
  prompt += `- baseAmount ekle (baseServings için aynı miktar)\n`;
  prompt += `- normalizedName ekle (arama için İngilizce versiyon, örn: "yeşil mercimek" için "green lentil")\n`;
  prompt += `- Kategori ekle Türkçe (sebzeler, baklagiller, baharatlar, süt ürünleri, vb.)\n`;
  prompt += `- Gerekirse notlar ekle Türkçe (örn: "suda bekletilmiş", "soğuk", "taze", "rendelenmiş", "küp doğranmış")\n`;
  prompt += `- **Malzeme isimleri TAMAMEN Türkçe olmalı**: "yeşil mercimek", "zeytinyağı", "biber salçası", "kırmızı soğan", "domates"\n`;
  prompt += `- İngilizce malzeme adı kullanma: ❌ "olive oil" yerine ✅ "zeytinyağı", ❌ "lentil" yerine ✅ "mercimek"\n`;
  prompt += `\n`;
  prompt += `### Talimatlar (Instructions):\n`;
  prompt += `- Adım adım, numaralandırılmış (1'den başla)\n`;
  prompt += `- Açık, özlü ve ${skillLevel === "beginner" ? "başlangıç" : skillLevel === "intermediate" ? "orta" : "ileri"} seviyeye uygun\n`;
  prompt += `- **Tamamen Türkçe yaz**: "Mercimeği yıkayın", "Soğanı doğrayın", "Tavada kızartın"\n`;
  prompt += `- Zaman alan adımlar için süreyi dakika cinsinden ekle\n`;
  prompt += `- Fırın/ocak için sıcaklığı Celsius cinsinden ekle (uygunsa)\n`;
  prompt += `- Her adımda kullanılan ekipmanı belirt (ilgiliyse)\n`;
  prompt += `- Toplam adım sayısı zorluk seviyesine uygun olmalı\n`;
  prompt += `- ${skillLevel === "beginner" ? "Başlangıç seviyesi için çok detaylı" : skillLevel === "intermediate" ? "Orta seviye için orta detaylı" : "İleri seviye için özlü"} talimatlar\n`;
  prompt += `\n`;
  prompt += `### Metadata (Tarif Bilgileri):\n`;
  prompt += `- Name: Açıklayıcı tarif adı (Türkçe - örn: "Yeşil Mercimek Salatası", "Mercimek Köftesi")\n`;
  prompt += `- Description: Kısa açıklama (max 150 karakter, Türkçe)\n`;
  prompt += `- Cuisine: Ana mutfak türü (Türk, Akdeniz, Ege, vb.)\n`;
  prompt += `- CuisineTags: Ek mutfak etiketleri (Türkçe veya İngilizce tag'ler)\n`;
  prompt += `- DietaryTags: Otomatik türetilmiş (vegetarian, vegan, gluten-free, vb. - İngilizce tag'ler OK)\n`;
  prompt += `- Tags: Tarif özellikleri (hızlı, ekonomik, tek tencere, protein açısından zengin, vb. - Türkçe)\n`;
  prompt += `- Equipment: Gerekli tüm ekipman listesi (Türkiye'de bulunabilir)\n`;
  prompt += `- MealType: ["dinner"] (MVP)\n`;
  prompt += `- Difficulty: ${skillLevel === "beginner" ? "easy" : skillLevel === "intermediate" ? "medium" : "hard"} olmalı\n`;
  prompt += `- Scaling: Destekleniyor (minServings: 2, maxServings: 12)\n`;
  prompt += `\n`;

  // === REASONING REQUIREMENT ===
  prompt += `## REASONING / EXPLANATION REQUIREMENT (AÇIKLAMA)\n`;
  prompt += `Açıklama alanında (reasoning field) mutlaka şunu açıkla:\n`;
  prompt += `\n`;
  prompt += `**Neden bu tarif bu kullanıcı için bu günde seçildi?**\n`;
  prompt += `\n`;
  prompt += `Açıklama şunları içermeli:\n`;
  prompt += `1. Kullanıcının spesifik bağlamına referans (rutin, diyet tercihleri, gün tipi)\n`;
  prompt += `2. Tarifin ihtiyaçlarına nasıl uyduğunu açıkla\n`;
  prompt += `3. Tamamen Türkçe yazılmalı, samimi ve dostane bir ton\n`;
  prompt += `4. 50-500 karakter arası olmalı\n`;
  prompt += `5. Kullanıcının anlaşıldığını ve önemsendiğini hissettirmeli\n`;
  prompt += `6. **ÖNEMLİ: İngilizce kelime kullanma! Tamamen Türkçe yaz.**\n`;
  prompt += `   - ❌ "recovery", "elaborate", "quick", "balanced" gibi İngilizce kelimeler YOK\n`;
  prompt += `   - ✅ "toparlanma", "zahmetli", "hızlı", "dengeli" gibi Türkçe karşılıklarını kullan\n`;
  prompt += `\n`;
  prompt += `**İyi açıklama örnekleri (sadece Türkçe):**\n`;
  if (routine?.type === "gym" && routine.gymTime === "evening") {
    prompt += `- "Salı günü akşam spor demişsin ve ben de buna göre yüksek proteinli, antrenman sonrası toparlanma için ideal bir akşam yemeği öneriyorum. Bu yemek kas onarımı için gerekli 30-40 gram protein ve dengeli karbonhidrat içeriğiyle tam ihtiyacın olan beslenmeyi sağlıyor."\n`;
  } else if (routine?.type === "office") {
    const timeDesc = timePreference === "quick" ? "hızlı" : timePreference === "balanced" ? "dengeli sürede" : "zahmetli";
    prompt += `- "Pazartesi ofis günün ve yoğun bir günün ardından evine döndüğünde ${timeDesc === "hızlı" ? "30 dakikada hazır olan" : ""} ama besleyici bir akşam yemeği hazırlayabilmen için bu pratik tarifi seçtim. Hem doyurucu hem de senin tercih ettiğin ${cuisinePreferences.length > 0 ? cuisinePreferences.join(", ") : "mutfak"} tarzında."\n`;
  } else if (routine?.type === "remote") {
    const timeDesc = timePreference === "quick" ? "hızlı" : timePreference === "balanced" ? "dengeli" : "daha zahmetli";
    const skillDesc = skillLevel === "beginner" ? "başlangıç" : skillLevel === "intermediate" ? "orta" : "ileri";
    prompt += `- "Evden çalışıyorsun bugün, dolayısıyla daha fazla zamanın var ve ${timeDesc} bir yemek hazırlayabilirsin. Bu tarif hem senin ${cuisinePreferences.length > 0 ? cuisinePreferences.join(", ") : "mutfak"} tercihlerine uygun hem de ${skillDesc} seviyene uygun tekniklerle hazırlanıyor."\n`;
  } else {
    const skillDesc = skillLevel === "beginner" ? "Başlangıç seviyesinde" : skillLevel === "intermediate" ? "Orta seviyede" : "İleri seviyede";
    const timeDesc = timePreference === "quick" ? "hızlı" : timePreference === "balanced" ? "dengeli" : "zahmetli";
    prompt += `- "Bu ${calculatedDayOfWeek} günü için ${dietaryRestrictions.length > 0 ? dietaryRestrictions.join(", ") + " tercihlerine" : "tercihlerine"} uygun, ${cuisinePreferences.length > 0 ? cuisinePreferences.join(", ") + " mutfağından" : "lezzetli"} bir akşam yemeği seçtim. ${skillDesc} tekniklerle hazırlanıyor ve ${timeDesc} bir yemek."\n`;
  }
  prompt += `\n`;
  prompt += `**Açıklama şunları içermemeli:**\n`;
  prompt += `- Genel veya belirsiz olmamalı\n`;
  prompt += `- Kullanıcının spesifik bağlamını görmezden gelmemeli (rutin, tercihler, gün tipi)\n`;
  prompt += `- Çok kısa (<50 karakter) veya çok uzun (>500 karakter) olmamalı\n`;
  prompt += `- Robotik veya şablon gibi görünmemeli\n`;
  prompt += `- İngilizce kelime içermemeli (tamamen Türkçe olmalı)\n`;
  prompt += `\n`;
  prompt += `Düşün: NEDEN bu spesifik tarif BU kullanıcı için BU spesifik günde uygun? Bunu doğal bir şekilde, tamamen Türkçe olarak açıkla.\n`;
  prompt += `\n`;

  // === VALIDATION CHECKLIST ===
  prompt += `## VALİDASYON KONTROL LİSTESİ\n`;
  prompt += `Döndürmeden önce, emin ol:\n`;
  prompt += `✓ Tarif ${mealType} için ${calculatedDayOfWeek} gününe uygun\n`;
  prompt += `✓ **TÜRKİYE ODAKLI**: Sadece Türkiye'de bulunabilen malzemeler kullanıldı\n`;
  prompt += `✓ **TÜRKÇE ÇIKTI**: Tarif adı, malzeme isimleri, talimatlar TAMAMEN Türkçe\n`;
  prompt += `✓ **TÜRK MUTFAĞI**: Türk mutfağı veya Türkiye'de popüler mutfaklardan tarif\n`;
  prompt += `✓ Reasoning alanı sağlandı (50-500 karakter, Türkçe, kişiselleştirilmiş)\n`;
  prompt += `✓ Reasoning TAMAMEN Türkçe, İngilizce kelime YOK\n`;
  prompt += `✓ Reasoning açıklıyor: NEDEN bu tarif BU kullanıcı için BU günde\n`;
  prompt += `✓ Reasoning kullanıcının rutini, tercihleri veya bağlamına referans veriyor\n`;
  prompt += `✓ Tüm alerjenler DIŞLANDI: ${allergies.length > 0 ? allergies.join(", ") : "Yok"}\n`;
  prompt += `✓ Diyet kısıtlamaları TAKİP EDİLDİ: ${dietaryRestrictions.length > 0 ? dietaryRestrictions.join(", ") : "Yok"}\n`;
  if (routine?.type === "gym" && routine.gymTime === "evening") {
    prompt += `✓ Antrenman sonrası beslenme hedefleri karşılandı (protein açısından zengin)\n`;
    prompt += `✓ Reasoning spor günü ve protein ihtiyacından bahsediyor\n`;
  }
  prompt += `✓ Hazırlık + Pişirme süresi ${timePreference === "quick" ? "hızlı" : timePreference === "balanced" ? "dengeli" : "zahmetli"} tercihine uyuyor\n`;
  if (maxPrepTime || maxCookTime) {
    prompt += `✓ Zaman kısıtlamaları karşılandı (hazırlık: ${maxPrepTime || "herhangi"} dak, pişirme: ${maxCookTime || "herhangi"} dak)\n`;
  }
  prompt += `✓ Zorluk ${skillLevel === "beginner" ? "başlangıç" : skillLevel === "intermediate" ? "orta" : "ileri"} seviyeye uyuyor\n`;
  prompt += `✓ Ekipman gereksinimleri mevcut ekipmanla eşleşiyor\n`;
  prompt += `✓ Beslenme değerleri gerçekçi ve hesaplanmış\n`;
  prompt += `✓ Talimatlar açık ve beceri seviyesine uygun (TÜRKÇE)\n`;
  prompt += `✓ Porsiyonlar hane halkı sayısına uyuyor: ${householdSize}\n`;
  if (cuisinePreferences.length > 0) {
    prompt += `✓ Mutfak tercihleri yansıtıldı: ${cuisinePreferences.join(", ")}\n`;
  } else {
    prompt += `✓ Türk mutfağı odaklı (varsayılan, çünkü spesifik tercih yok)\n`;
  }
  prompt += `✓ Tüm malzeme isimleri Türkçe (İngilizce kelime YOK)\n`;
  prompt += `✓ Tüm talimatlar Türkçe (İngilizce kelime YOK)\n`;
  prompt += `✓ Tüm gerekli JSON schema alanları mevcut (reasoning dahil)\n`;
  prompt += `✓ Tarif tam, kullanılabilir ve üretime hazır\n`;

  return prompt;
}

/**
 * Build complete prompt (system + user) for menu generation
 */
export function buildCompleteMenuPrompt(
  request: MenuGenerationRequest
): { systemPrompt: string; userPrompt: string } {
  return {
    systemPrompt: buildMenuSystemPrompt(),
    userPrompt: buildMenuPrompt(request),
  };
}
