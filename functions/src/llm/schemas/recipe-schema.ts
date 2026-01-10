/**
 * JSON Schema for LLM Recipe Generation
 * Used by OpenAI (JSON mode) and Gemini (JSON mode)
 */

export const RECIPE_JSON_SCHEMA = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "Tarif adı Türkçe olmalı. Örnek: 'Yeşil Mercimek Salatası', 'Mercimek Köftesi', 'Karnıyarık', 'İmam Bayıldı'. Türkiye'de bilinen, Türk mutfağı tarifleri. İngilizce tarif adı kullanma.",
    },
    description: {
      type: "string",
      description: "Tarifin kısa açıklaması (max 150 karakter, Türkçe). Türkçe yazılmalı, İngilizce kelime kullanma.",
      maxLength: 150,
    },
    reasoning: {
      type: "string",
      description: "Açıklama - Neden bu tarif bu kullanıcı için bu günde seçildi? Tamamen Türkçe yazılmalı, samimi ve dostane ton. İngilizce kelime kullanma (örnek: recovery, elaborate, quick, balanced YOK; bunun yerine: toparlanma, zahmetli, hızlı, dengeli). Örnek: 'Salı günü akşam spor demişsin ve ben de buna göre yüksek proteinli, antrenman sonrası toparlanma için ideal bir akşam yemeği öneriyorum. Bu yemek kas onarımı için gerekli protein ve karbonhidrat dengesini sağlıyor.'",
      minLength: 50,
      maxLength: 500,
    },
    baseServings: {
      type: "integer",
      minimum: 1,
      maximum: 12,
      description: "Number of servings this recipe makes (typically 4)",
    },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Malzeme adı TÜRKÇE olmalı. SADECE Türkiye'de marketlerde, manavlarda ve aktarlarda bulunabilecek malzemeler. Örnekler: 'yeşil mercimek', 'kırmızı mercimek', 'bulgur', 'nohut', 'fasulye', 'zeytinyağı', 'ayçiçek yağı', 'domates', 'biber salçası', 'domates salçası', 'soğan', 'sarımsak', 'maydanoz', 'nane', 'yoğurt', 'peynir', 'yumurta', 'kıyma', 'tavuk', 'balık', 'patlıcan', 'biber', 'kabak'. İNGİLİZCE malzeme adı kullanma (örnek: 'olive oil' yerine 'zeytinyağı', 'lentil' yerine 'mercimek').",
          },
        normalizedName: {
          type: "string",
          description: "Arama için normalize edilmiş malzeme adı (İngilizce). Örnek: 'yeşil mercimek' için 'green lentil'. Sadece arama/indeksleme için kullanılır, kullanıcıya gösterilmez.",
        },
        amount: {
          type: "number",
          minimum: 0,
          description: "Malzeme miktarı",
        },
        unit: {
          type: "string",
          enum: [
            "g",
            "kg",
            "ml",
            "L",
            "adet",
            "tane",
            "yemek kaşığı",
            "tatlı kaşığı",
            "çay kaşığı",
            "su bardağı",
            "fincan",
            "bağ",
            "demet",
            "yaprak",
            "diş",
          ],
          description: "Ölçü birimi. Metrik birimler (g, kg, ml, L) veya Türk mutfak birimleri (yemek kaşığı, su bardağı, vb.) kullan",
        },
        baseAmount: {
          type: "number",
          minimum: 0,
          description: "baseServings için orijinal miktar (baseServings varsayılan ise amount ile aynı)",
        },
        notes: {
          type: "string",
          description: "Ek notlar Türkçe. Örnek: 'suda bekletilmiş', 'soğuk', 'taze', 'rendelenmiş', 'küp doğranmış'",
        },
        category: {
          type: "string",
          enum: [
            "sebzeler",
            "meyveler",
            "baklagiller",
            "et",
            "deniz ürünleri",
            "süt ürünleri",
            "tahıllar",
            "baharatlar",
            "yağlar",
            "kuruyemiş",
            "diğer",
          ],
          description: "Malzeme kategorisi Türkçe. Örnek: 'sebzeler', 'baklagiller', 'baharatlar', 'süt ürünleri'",
        },
        nutritionPer100g: {
          type: "object",
          properties: {
            calories: { type: "number", minimum: 0 },
            protein: { type: "number", minimum: 0 },
            carbs: { type: "number", minimum: 0 },
            fat: { type: "number", minimum: 0 },
          },
          required: ["calories", "protein", "carbs", "fat"],
          description: "100g başına beslenme (opsiyonel, beslenme hesaplaması için)",
        },
      },
      },
      required: ["name", "amount", "unit"],
      minItems: 2,
      description: "baseServings için kesin miktarlarla malzeme listesi. SADECE Türkiye'de bulunabilen malzemeler. Tüm malzeme isimleri Türkçe olmalı.",
    },
    instructions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          step: {
            type: "integer",
            minimum: 1,
            description: "Adım numarası",
          },
          text: {
            type: "string",
            description: "Adım talimat metni TAMAMEN TÜRKÇE olmalı. Örnekler: 'Mercimeği yıkayın ve süzün', 'Soğanı küp küp doğrayın', 'Tavada zeytinyağını ısıtın', 'Domatesleri rendeleyin', 'Fırında 180 derecede 30 dakika pişirin'. İngilizce kelime veya cümle kullanma. Tamamen Türkçe yazılmalı.",
          },
          duration: {
            type: "number",
            minimum: 0,
            description: "Süre dakika cinsinden (opsiyonel)",
          },
          temperature: {
            type: "number",
            minimum: 0,
            description: "Sıcaklık Celsius cinsinden (opsiyonel, fırın/ocak için)",
          },
          equipment: {
            type: "array",
            items: { type: "string" },
            description: "Bu adımda kullanılan ekipman Türkçe (opsiyonel). Örnek: 'fırın', 'tava', 'tencere', 'blender'",
          },
        },
        required: ["step", "text"],
      },
      minItems: 3,
      description: "Adım adım pişirme talimatları. Tüm talimatlar Türkçe olmalı. Örnek: 'Mercimeği yıkayın', 'Soğanı doğrayın', 'Tavada kızartın'. İngilizce talimat kullanma.",
    },
    prepTime: {
      type: "integer",
      minimum: 0,
      description: "Hazırlık süresi dakika cinsinden",
    },
    cookTime: {
      type: "integer",
      minimum: 0,
      description: "Pişirme süresi dakika cinsinden",
    },
    difficulty: {
      type: "string",
      enum: ["easy", "medium", "hard"],
      description: "Zorluk seviyesi İngilizce (enum değerleri: easy, medium, hard). Ama tarif açıklamasında ve reasoning'de Türkçe kullan: 'kolay', 'orta', 'zor'",
    },
    cuisine: {
      type: "string",
      description: "Ana mutfak türü Türkçe. Örnek: 'Türk', 'Akdeniz', 'Ege', 'Karadeniz', 'Anadolu'. Türkiye'de popüler mutfaklardan biri olmalı.",
      examples: ["Türk", "Akdeniz", "Ege", "Karadeniz", "Anadolu", "Güneydoğu"],
    },
    cuisineTags: {
      type: "array",
      items: { type: "string" },
      description: "Ek mutfak etiketleri Türkçe veya İngilizce tag'ler. Örnek: 'Anadolu', 'Geleneksel Türk', 'Akdeniz', 'Ege Mutfağı'",
    },
    dietaryTags: {
      type: "array",
      items: {
        type: "string",
        enum: [
          "vegetarian",
          "vegan",
          "gluten-free",
          "dairy-free",
          "nut-free",
          "egg-free",
          "halal",
          "kosher",
          "low-carb",
          "keto",
          "paleo",
          "pescatarian",
        ],
      },
      description: "Dietary tags (automatically derived from ingredients and restrictions)",
    },
    nutrition: {
      type: "object",
      properties: {
        per100g: {
          type: "object",
          properties: {
            calories: { type: "number", minimum: 0 },
            protein: { type: "number", minimum: 0 },
            carbs: { type: "number", minimum: 0 },
            fat: { type: "number", minimum: 0 },
            fiber: { type: "number", minimum: 0 },
            sugar: { type: "number", minimum: 0 },
            sodium: { type: "number", minimum: 0 },
          },
          required: ["calories", "protein", "carbs", "fat"],
          description: "Nutrition per 100g (standardized)",
        },
        perServing: {
          type: "object",
          properties: {
            calories: { type: "number", minimum: 0 },
            protein: { type: "number", minimum: 0 },
            carbs: { type: "number", minimum: 0 },
            fat: { type: "number", minimum: 0 },
            fiber: { type: "number", minimum: 0 },
            sugar: { type: "number", minimum: 0 },
            servingSize: {
              type: "number",
              minimum: 0,
              description: "Serving size in grams",
            },
          },
          required: ["calories", "protein", "carbs", "fat", "servingSize"],
          description: "Nutrition per serving (for baseServings)",
        },
        total: {
          type: "object",
          properties: {
            calories: { type: "number", minimum: 0 },
            protein: { type: "number", minimum: 0 },
            carbs: { type: "number", minimum: 0 },
            fat: { type: "number", minimum: 0 },
            totalWeight: {
              type: "number",
              minimum: 0,
              description: "Total recipe weight in grams",
            },
          },
          required: ["calories", "protein", "carbs", "fat", "totalWeight"],
          description: "Total nutrition for entire recipe (all baseServings)",
        },
      },
      required: ["per100g", "perServing", "total"],
      description: "Complete nutrition information (per100g, perServing, total)",
    },
    tags: {
      type: "array",
      items: {
        type: "string",
        enum: [
          "hızlı",
          "ekonomik",
          "tek tencere",
          "önceden hazırlanabilir",
          "dondurucuda saklanabilir",
          "çocuk dostu",
          "özel gün",
          "rahatlatıcı",
          "hafif",
          "protein açısından zengin",
          "lif açısından zengin",
          "düşük kalorili",
          "yüksek protein",
        ],
      },
      description: "Tarif etiketleri Türkçe. Örnek: 'hızlı', 'ekonomik', 'tek tencere', 'protein açısından zengin'. Tüm etiketler Türkçe olmalı.",
    },
    equipment: {
      type: "array",
      items: {
        type: "string",
        enum: [
          "fırın",
          "ocak",
          "blender",
          "mutfak robotu",
          "mikser",
          "tencere",
          "tava",
          "mikrodalga",
          "yok",
        ],
      },
      description: "Gerekli ekipman Türkçe. Örnek: 'fırın', 'ocak', 'blender', 'mutfak robotu', 'tencere', 'tava'. SADECE Türkiye'de standart mutfaklarda bulunan ekipmanlar.",
    },
    mealType: {
      type: "array",
      items: {
        type: "string",
        enum: ["breakfast", "lunch", "dinner", "snack"],
      },
      minItems: 1,
      description: "Suitable meal types",
    },
    scalingSupported: {
      type: "boolean",
      description: "Whether recipe can be scaled up/down (typically true)",
      default: true,
    },
    minServings: {
      type: "integer",
      minimum: 1,
      description: "Minimum servings if scaling supported (typically 2)",
    },
    maxServings: {
      type: "integer",
      minimum: 1,
      description: "Maximum servings if scaling supported (typically 12)",
    },
  },
  required: [
    "name",
    "reasoning",
    "baseServings",
    "ingredients",
    "instructions",
    "prepTime",
    "cookTime",
    "difficulty",
    "cuisine",
    "dietaryTags",
    "nutrition",
    "tags",
    "equipment",
    "mealType",
  ],
  additionalProperties: false,
} as const;

/**
 * OpenAI-specific JSON schema format
 */
export function getOpenAIRecipeSchema() {
  return {
    type: "json_schema",
    json_schema: {
      name: "recipe_schema",
      description: "Complete recipe with ingredients, instructions, and nutrition",
      schema: RECIPE_JSON_SCHEMA,
      strict: true, // Reject extra properties
    },
  };
}

/**
 * Gemini-specific JSON schema format
 */
export function getGeminiRecipeSchema() {
  // Gemini uses response_mime_type and response_schema
  return {
    responseMimeType: "application/json",
    responseSchema: RECIPE_JSON_SCHEMA,
  } as const;
}
