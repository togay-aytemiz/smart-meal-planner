# Smart Meal Planner - LLM Architecture & Implementation Plan

## 📋 Genel Bakış

Bu doküman, Smart Meal Planner uygulamasında LLM entegrasyonu, recipe generation, cost optimization ve multi-provider yönetimi için detaylı mimari planı içerir.

**Tarih:** 2024-01-10  
**Status:** Planning → Implementation

---

## 🎯 Hedefler

1. **Multi-LLM Support**: OpenAI (GPT-4o-mini) ve Gemini (1.5 Pro) desteği
2. **Cost Optimization**: Recipe caching ve deduplication ile %70+ cost savings
3. **Scalable Architecture**: Yeni LLM provider'lar kolayca eklenebilir
4. **Secure Secret Management**: Firebase Functions Secrets Manager
5. **Rich Recipe Data**: Servings scaling, nutrition (macros), image generation
6. **Onboarding Integration**: Kullanıcı onboarding verilerini recipe generation'a entegre et

---

## 🏗️ Mimari Yapı

### 1. Firebase Cloud Functions Yapısı

```
functions/
├── src/
│   ├── index.ts                    # Main entry point - HTTP callable functions
│   ├── config/
│   │   └── secrets.ts              # Secrets management
│   ├── types/
│   │   ├── recipe.ts               # Recipe types (comprehensive schema)
│   │   ├── onboarding.ts           # Onboarding data types
│   │   └── generation-params.ts    # Recipe generation parameters
│   ├── llm/
│   │   ├── base-llm-provider.ts    # LLMProvider interface
│   │   ├── openai-provider.ts      # OpenAI implementation
│   │   ├── gemini-provider.ts      # Gemini implementation
│   │   ├── provider-factory.ts     # Factory pattern for LLM selection
│   │   ├── schemas/
│   │   │   └── recipe-schema.ts    # JSON schema for LLM responses
│   │   └── prompts/
│   │       └── recipe-prompt.ts    # Prompt builder
│   ├── services/
│   │   ├── recipe-service.ts       # Main recipe generation service
│   │   ├── recipe-cache-service.ts # Cache lookup and storage
│   │   ├── image-service.ts        # Image generation and storage
│   │   ├── cost-tracking-service.ts # Cost tracking and analytics
│   │   └── nutrition-calculator.ts # Nutrition calculation utilities
│   ├── utils/
│   │   ├── recipe-hash.ts          # Recipe deduplication hashing
│   │   ├── ingredient-normalizer.ts # Ingredient name normalization
│   │   └── recipe-scaler.ts        # Servings scaling utilities
│   └── firestore/
│       └── collections.ts          # Firestore collection helpers
├── package.json
├── tsconfig.json
└── .secret.local                   # Local development secrets (gitignored)
```

---

## 🔐 Secret Management Stratejisi

### Firebase Functions Secrets Manager (v2)

**Production:**

```bash
firebase functions:secrets:set OPENAI_API_KEY
firebase functions:secrets:set GEMINI_API_KEY
```

**Development:**

```bash
# .secret.local dosyası (gitignored)
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
```

**Kullanım:**

```typescript
import * as functions from "firebase-functions/v2";

const secrets = {
  OPENAI_API_KEY: functions.defineSecret("OPENAI_API_KEY"),
  GEMINI_API_KEY: functions.defineSecret("GEMINI_API_KEY"),
};
```

**✅ Checklist:**

- [ ] Firebase CLI kurulu ve authenticated
- [ ] Secrets production'da set edildi
- [ ] .secret.local development için oluşturuldu
- [ ] .gitignore'a .secret.local eklendi

---

## 🤖 Multi-LLM Provider Pattern

### Provider Interface

```typescript
interface LLMProvider {
  generateRecipe(params: RecipeGenerationParams): Promise<Recipe>;
  generateImage(prompt: string): Promise<string>; // base64
  getCostEstimate(params: RecipeGenerationParams): number;
}
```

### Implemented Providers

1. **OpenAI Provider**

   - Recipe: `gpt-4o-mini` (JSON schema mode)
   - Image: `dall-e-3`
   - Cost: ~$0.00015/1K input tokens

2. **Gemini Provider**

   - Recipe: `gemini-1.5-pro` (JSON mode)
   - Image: Not supported (fallback to OpenAI)
   - Cost: ~$0.000125/1K input tokens

3. **Provider Factory**
   - Recipe generation: Configurable (default: Gemini - cheaper)
   - Image generation: OpenAI (DALL-E best quality)

**✅ Checklist:**

- [ ] Base LLMProvider interface oluşturuldu
- [ ] OpenAI provider implementasyonu
- [ ] Gemini provider implementasyonu
- [ ] Provider factory oluşturuldu
- [ ] Config'den provider selection

---

## 🍽️ Recipe Schema (Comprehensive)

### Core Recipe Structure

```typescript
interface Recipe {
  // Basic
  id: string;
  name: string;
  description?: string;

  // Servings & Scalability
  baseServings: number; // Original LLM servings (e.g., 4)
  servings: number; // Active servings (user can adjust)

  // Ingredients (scalable)
  ingredients: RecipeIngredient[];

  // Instructions
  instructions: RecipeInstruction[];

  // Time & Difficulty
  prepTime: number; // minutes
  cookTime: number;
  totalTime: number;
  difficulty: "easy" | "medium" | "hard";

  // Cuisine & Dietary
  cuisine: string;
  cuisineTags: string[];
  dietaryTags: string[];

  // Nutrition (3 levels)
  nutrition: {
    per100g: NutritionInfo; // Standardized per 100g
    perServing: NutritionInfo; // For baseServings
    total: NutritionInfo; // Total recipe
  };

  // Image
  imageUrl?: string;
  imageHash?: string;

  // LLM Metadata
  generatedBy: "openai" | "gemini";
  generatedAt: Date;
  generationCost: number;
  model: string;
  promptHash?: string;

  // Scaling Support
  scalingSupported: boolean;
  minServings?: number;
  maxServings?: number;

  // Statistics
  usageCount: number;
  lastSuggestedAt?: Date;
  averageRating?: number;

  // Deduplication
  hash: string;
  searchTokens: string[];
  normalizedName: string;
}
```

### Nutrition Info Structure

```typescript
interface NutritionInfo {
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
  fiber?: number; // grams
  sugar?: number; // grams
  sodium?: number; // mg
  servingSize?: number; // grams (for perServing)
  totalWeight?: number; // grams (for total)
}
```

**✅ Checklist:**

- [ ] Recipe type definitions oluşturuldu
- [ ] Nutrition calculator utilities
- [ ] Servings scaler utilities
- [ ] JSON schema for LLM (recipe-schema.ts)

---

## 🗄️ Firestore Database Structure

### Collections

#### 1. `recipes/{recipeId}` - Main Recipe Cache

```typescript
{
  id: string;
  name: string;
  normalizedName: string;        // lowercase for search
  hash: string;                  // SHA256 for deduplication
  baseServings: number;
  servings: number;
  ingredients: Array<{
    name: string;
    normalizedName: string;      // "green lentil"
    amount: number;
    unit: string;
    baseAmount: number;
    notes?: string;
    category?: string;
  }>;
  instructions: Array<{
    step: number;
    text: string;
    duration?: number;
    temperature?: number;
    equipment?: string[];
  }>;
  prepTime: number;
  cookTime: number;
  totalTime: number;
  difficulty: string;
  cuisine: string;
  cuisineTags: string[];
  dietaryTags: string[];
  nutrition: {
    per100g: NutritionInfo;
    perServing: NutritionInfo;
    total: NutritionInfo;
  };
  imageUrl?: string;
  imageHash?: string;
  generatedBy: string;
  generatedAt: Timestamp;
  generationCost: number;
  model: string;
  imageGeneratedBy?: string;
  imageGenerationCost?: number;
  scalingSupported: boolean;
  minServings?: number;
  maxServings?: number;
  tags: string[];
  equipment: string[];
  mealType: string[];
  usageCount: number;
  lastSuggestedAt?: Timestamp;
  averageRating?: number;
  searchTokens: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### 2. `recipeLookups/{hash}` - Hash Index

```typescript
{
  hash: string; // SHA256 hash
  recipeId: string; // Reference to recipes/{recipeId}
  createdAt: Timestamp;
}
```

#### 3. `mealPlans/{planId}` - User Meal Plans

```typescript
{
  id: string;
  userId: string;
  weekStart: Timestamp;
  weekEnd: Timestamp;
  days: {
    monday: {
      breakfast?: { recipeId: string, servings: number },
      lunch?: { recipeId: string, servings: number },
      dinner?: { recipeId: string, servings: number }
    },
    // ... other days
  };
  generatedAt: Timestamp;
  totalCost: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### 4. `recipeSuggestions/{suggestionId}` - User Query Cache

```typescript
{
  id: string;
  userId: string;
  queryHash: string;             // User preferences hash
  recipeIds: string[];           // Suggested recipe IDs
  suggestedAt: Timestamp;
  expiresAt: Timestamp;          // 7 days
}
```

#### 5. `costTracking/{trackingId}` - Daily Cost Analytics

```typescript
{
  date: string; // YYYY-MM-DD
  totalCost: number;
  recipeGenerationCount: number;
  imageGenerationCount: number;
  openaiCost: number;
  geminiCost: number;
  cacheHits: number;
  cacheMisses: number;
  createdAt: Timestamp;
}
```

#### 6. `users/{userId}` - Updated User Document

```typescript
{
  profile: { ... },
  onboarding: { ... },
  preferences: { ... },
  stats: {
    recipesGenerated: number;
    recipesReused: number;       // Cache hits
    totalAICost: number;
    averageCostPerRecipe: number;
  }
}
```

**✅ Checklist:**

- [ ] Firestore collections yapısı tasarlandı
- [ ] Security rules yazıldı
- [ ] Indexes tanımlandı (hash, normalizedName, searchTokens)
- [ ] Collection helpers oluşturuldu

---

## 🔄 Recipe Generation Flow

### Flow Diagram

```
1. Client Request
   ↓
2. Generate Recipe Hash (from name + cuisine + dietary)
   ↓
3. Check Recipe Lookup Index
   ├─→ Found? Return cached recipe + update usageCount
   └─→ Not Found? Continue
   ↓
4. Build Generation Prompt (from onboarding data)
   ↓
5. Select LLM Provider (config-based: Gemini for recipes)
   ↓
6. Generate Recipe via LLM (JSON schema mode)
   ↓
7. Calculate Final Hash (with ingredients)
   ↓
8. Check for Hash Collision
   ├─→ Collision? Return existing recipe
   └─→ Unique? Continue
   ↓
9. Generate Image (optional, OpenAI DALL-E)
   ↓
10. Upload Image to Firebase Storage
   ↓
11. Calculate Nutrition (if LLM didn't provide accurate)
   ↓
12. Save Recipe to Firestore
   ↓
13. Create Recipe Lookup Index Entry
   ↓
14. Track Costs (recipe + image generation)
   ↓
15. Update User Stats
   ↓
16. Return Recipe to Client
```

### Key Functions

1. **`generateOrGetRecipe()`** - Main entry point
2. **`findRecipeByHash()`** - Cache lookup
3. **`generateRecipeWithLLM()`** - LLM generation
4. **`generateRecipeImage()`** - Image generation
5. **`saveRecipeToFirestore()`** - Persistence
6. **`trackGenerationCost()`** - Cost tracking

**✅ Checklist:**

- [ ] Main generation flow implementasyonu
- [ ] Cache lookup logic
- [ ] Hash collision handling
- [ ] Image generation flow
- [ ] Cost tracking integration

---

## 🎨 Image Generation & Storage

### Strategy

1. **Generation**: OpenAI DALL-E 3 (best quality)
2. **Format**: Base64 → Firebase Storage (JPEG)
3. **Naming**: `recipes/{recipeHash}.jpg`
4. **Deduplication**: Image content hash (optional)
5. **Caching**: Same recipe = same image

### Storage Structure

```
firebase-storage/
└── recipes/
    ├── {hash1}.jpg
    ├── {hash2}.jpg
    └── ...
```

**✅ Checklist:**

- [ ] Image generation service
- [ ] Base64 to Storage upload
- [ ] Image hash calculation
- [ ] Image caching logic

---

## 💰 Cost Optimization Strategies

### 1. Recipe Deduplication (Hash-based)

- **Impact**: %60-70 cost reduction
- **Method**: SHA256 hash of normalized recipe
- **Storage**: `recipeLookups` collection

### 2. Query Caching

- **Impact**: %20-30 cost reduction
- **Method**: User preferences hash → cached suggestions
- **Storage**: `recipeSuggestions` collection
- **TTL**: 7 days

### 3. Provider Selection

- **Recipes**: Gemini (cheaper: $0.000125 vs $0.00015 per 1K tokens)
- **Images**: OpenAI (best quality, but cache heavily)

### 4. Batch Generation

- **Future**: Weekly meal plans için batch generation
- **Impact**: %10-15 cost reduction

### Expected Cost Savings

- **Without Optimization**: $0.05-0.10 per recipe generation
- **With Optimization**: $0.01-0.03 per recipe generation
- **Savings**: ~70% reduction

**✅ Checklist:**

- [ ] Cost tracking service
- [ ] Analytics dashboard (optional)
- [ ] Cost alerts (optional)

---

## 🔗 Onboarding Integration

### Onboarding Data → Recipe Parameters

```typescript
OnboardingData {
  profile: { name }
  householdSize: number        → servings
  dietary: { restrictions, allergies }
  cuisine: { selected }
  cooking: { timePreference, skillLevel, equipment }
  routines: WeeklyRoutine      → day-specific context
}
```

### Context Extraction

1. **Dietary Constraints**: `dietary.restrictions + dietary.allergies`
2. **Cuisine Preferences**: `cuisine.selected`
3. **Time Constraints**: `cooking.timePreference + routines[day].type`
4. **Skill Level**: `cooking.skillLevel`
5. **Equipment**: `cooking.equipment`
6. **Routine Context**: `routines[dayOfWeek]` → portable meals, gym days, etc.

**✅ Checklist:**

- [ ] Onboarding to recipe params converter
- [ ] Prompt builder with onboarding context
- [ ] Routine-aware recipe generation

---

## 📝 Implementation Steps

### Phase 1: Foundation Setup ✅

- [ ] Firebase Functions folder structure
- [ ] Package.json and dependencies
- [ ] TypeScript configuration
- [ ] Secrets management setup
- [ ] Firestore structure documentation

### Phase 2: Core Types & Schemas ✅

- [x] Recipe type definitions
- [x] Onboarding type integration
- [x] JSON schema for LLM (recipe-schema.ts)
- [x] Generation parameters types
- [x] Prompt builder with onboarding context integration

### Phase 3: LLM Providers

- [ ] Base LLMProvider interface
- [ ] OpenAI provider implementation
- [ ] Gemini provider implementation
- [ ] Provider factory
- [ ] Cost calculation utilities

### Phase 4: Recipe Services

- [ ] Recipe hash utilities
- [ ] Ingredient normalizer
- [ ] Recipe cache service
- [ ] Main recipe generation service
- [ ] Nutrition calculator

### Phase 5: Image Generation

- [ ] Image generation service (OpenAI)
- [ ] Base64 to Storage upload
- [ ] Image hash calculation
- [ ] Image caching logic

### Phase 6: Cost Tracking

- [ ] Cost tracking service
- [ ] Daily cost aggregation
- [ ] User stats updates
- [ ] Analytics helpers

### Phase 7: Integration

- [ ] HTTP callable functions
- [ ] Client-side API utilities
- [ ] Error handling
- [ ] Logging

### Phase 8: Testing & Optimization

- [ ] Unit tests (critical functions)
- [ ] Integration tests
- [ ] Cost optimization validation
- [ ] Performance tuning

### Phase 9: Deployment

- [ ] Firestore security rules
- [ ] Functions deployment
- [ ] Secrets configuration
- [ ] Monitoring setup

---

## 🔒 Security Considerations

### Firestore Security Rules

```javascript
// recipes - read-only for authenticated users
// recipeLookups - read-only
// mealPlans - user-specific
// users - user-specific
// costTracking - admin only (Functions)
```

### API Security

- All Functions: Authentication required
- User context validation
- Input sanitization
- Rate limiting (future)

**✅ Checklist:**

- [ ] Security rules implemented
- [ ] Authentication checks
- [ ] Input validation
- [ ] Error handling (no secret leaks)

---

## 📊 Monitoring & Analytics

### Key Metrics

1. **Cost Metrics**

   - Daily total cost
   - Cost per recipe generation
   - Cost per user
   - Provider cost breakdown

2. **Usage Metrics**

   - Recipes generated per day
   - Cache hit rate
   - Average recipes per user
   - Most requested recipes

3. **Performance Metrics**
   - LLM response time
   - Image generation time
   - Cache lookup time
   - Firestore write time

**✅ Checklist:**

- [ ] Cost tracking implementation
- [ ] Usage analytics (optional)
- [ ] Performance monitoring (optional)

---

## 🚀 Next Steps

1. **Immediate**: Functions folder structure ve base setup
2. **Short-term**: Core types ve LLM providers
3. **Medium-term**: Recipe generation service ve caching
4. **Long-term**: Image generation, optimization, monitoring

---

## 📚 Resources

- [Firebase Functions Secrets](https://firebase.google.com/docs/functions/config-env)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)

---

## ✅ Progress Tracking

**Last Updated:** 2024-01-10  
**Current Phase:** Phase 2 - Core Types & Schemas ✅  
**Next Milestone:** Phase 3 - LLM Providers Implementation

### Recent Updates

- ✅ Added reasoning/explanation field to recipe schema and types
- ✅ Updated prompt builder to request personalized reasoning from LLM
- ✅ MVP: Default to Monday routine from onboarding for testing (can be overridden)
- ✅ Reasoning field: 50-500 characters, Turkish, conversational tone
- ✅ Reasoning explains: Why this recipe for this user on this specific day

---

**Notlar:**

- Bu plan dokümanı implementation sırasında güncellenecek
- Her phase tamamlandığında ✅ işaretlenecek
- Blockers ve önemli notlar buraya eklenebilir
