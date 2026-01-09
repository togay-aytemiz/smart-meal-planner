# Smart Meal Planner - Agent Guidelines

## Response Format

Her yanıt şu formatta olmalı:

```
### Yapılanlar
- [Türkçe bullet 1]
- [Türkçe bullet 2]
- [Türkçe bullet 3 - opsiyonel]

### Önerilen Sonraki Adımlar (opsiyonel)
- [Öneri 1]
- [Öneri 2]

### Commit
`[English commit message - imperative mood, max 72 chars]`
```

**Örnek:**

```
### Yapılanlar
- Onboarding ekranları için temel layout oluşturuldu
- Welcome screen UI tamamlandı
- Navigation flow ayarlandı


### Commit
`feat(onboarding): add welcome screen with value proposition`
```

---

## Tech Stack Rules

### ✅ Use

| Category         | Technology                                 |
| ---------------- | ------------------------------------------ |
| Framework        | React Native + Expo                        |
| Navigation       | Expo Router                                |
| State Management | Context API + useReducer                   |
| Local Storage    | AsyncStorage                               |
| Styling          | StyleSheet.create()                        |
| Backend          | Firebase (Auth, Firestore, Storage)        |
| AI Integration   | OpenAI / Claude API via Firebase Functions |
| Icons            | expo/vector-icons veya custom SVG          |

### ❌ Don't Use

- ~~Zustand~~ → Context API kullan
- ~~NativeWind / Tailwind~~ → StyleSheet kullan
- ~~Redux~~ → Context + useReducer yeterli
- ~~Styled Components~~ → Native StyleSheet

---

## Design Philosophy

### Core Principles

1. **Minimal** - Her ekranda sadece gerekli olan var
2. **Aesthetic** - Premium hissi veren, göz yormayan tasarım
3. **Cool** - Modern, trendy ama zamansız
4. **Intuitive** - Açıklama gerektirmeyen UX

### Visual Identity

```
┌─────────────────────────────────────────┐
│  RENK PALETİ                            │
├─────────────────────────────────────────┤
│  Background:     #FAFAF9 (Warm White)   │
│  Surface:        #FFFFFF                │
│  Primary:        #2D6A4F (Forest Green) │
│  Primary Light:  #40916C                │
│  Accent:         #E76F51 (Coral)        │
│  Text Primary:   #1F2937                │
│  Text Secondary: #6B7280                │
│  Text Muted:     #9CA3AF                │
│  Border:         #E5E7EB                │
│  Success:        #10B981                │
│  Warning:        #F59E0B                │
│  Error:          #EF4444                │
└─────────────────────────────────────────┘
```

### Typography

```typescript
// fonts.ts
export const typography = {
  // Headings
  h1: { fontSize: 32, fontWeight: "700", lineHeight: 40 },
  h2: { fontSize: 24, fontWeight: "600", lineHeight: 32 },
  h3: { fontSize: 20, fontWeight: "600", lineHeight: 28 },

  // Body
  body: { fontSize: 16, fontWeight: "400", lineHeight: 24 },
  bodySmall: { fontSize: 14, fontWeight: "400", lineHeight: 20 },

  // UI
  button: { fontSize: 16, fontWeight: "600", lineHeight: 24 },
  caption: { fontSize: 12, fontWeight: "500", lineHeight: 16 },
  label: { fontSize: 14, fontWeight: "500", lineHeight: 20 },
};
```

### Spacing System

```typescript
// spacing.ts - 4px base unit
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};
```

### Border Radius

```typescript
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};
```

### Layout Rules

- **Header Spacing**: Navigasyon barı olan sayfalarda `paddingTop` ekleme. Layout zaten boşluk bırakıyor.
- **Content Padding**: `paddingHorizontal: spacing.lg` standarttır.
- **Top Margin**: Sayfa başlıklarında `marginTop` kullanma, `spacing.sm` veya 0 yeterli.

---

## Component Rules

### General

1. **Her component tek dosyada** - styles aynı dosyanın altında
2. **Props interface'i component üstünde** tanımla
3. **Default export** kullan
4. **Atomic design** - ui/ altında base components

### StyleSheet Pattern

```typescript
// ✅ DOĞRU
import { View, Text, StyleSheet } from "react-native";

export default function MyComponent() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#FAFAF9",
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: "#1F2937",
  },
});
```

### Component Structure

```
components/
├── ui/                    # Base components
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Input.tsx
│   └── index.ts
├── onboarding/           # Feature-specific
│   ├── WelcomeScreen.tsx
│   └── DietaryTags.tsx
└── index.ts
```

---

## Context API Pattern

```typescript
// contexts/MealPlanContext.tsx
import { createContext, useContext, useReducer, ReactNode } from "react";

interface State {
  // state type
}

type Action = { type: "SET_MEALS"; payload: Meal[] } | { type: "CLEAR" };

const MealPlanContext = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
} | null>(null);

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_MEALS":
      return { ...state, meals: action.payload };
    default:
      return state;
  }
}

export function MealPlanProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <MealPlanContext.Provider value={{ state, dispatch }}>
      {children}
    </MealPlanContext.Provider>
  );
}

export function useMealPlan() {
  const context = useContext(MealPlanContext);
  if (!context) throw new Error("useMealPlan must be used within provider");
  return context;
}
```

---

## UI/UX Rules

### Do's ✅

- **Çok boşluk bırak** - Elemanlar arasında nefes alsın
- **Subtle shadows** - shadowOpacity: 0.05-0.08
- **Soft corners** - borderRadius: 12-16
- **Haptic feedback** - Önemli aksiyonlarda
- **Smooth transitions** - 200-300ms animasyonlar
- **Large touch targets** - Min 44x44 px
- **Clear hierarchy** - Bir ana CTA per ekran

### Don'ts ❌

- Harsh renkler (pure black #000, pure white #FFF)
- Çok fazla bilgi tek ekranda
- Tiny touch targets
- Jarring transitions
- Multiple competing CTAs
- Placeholder images - Her zaman gerçek veya generated
- **Emoji kullanımı** - Welcome ekranında ve genel UI tasarımında emoji yerine profesyonel ikonlar (vector-icons) kullanılmalı.

### Animation Guidelines

```typescript
// Önerilen animasyon değerleri
const ANIMATION = {
  duration: {
    fast: 150,
    normal: 250,
    slow: 400,
  },
  easing: {
    default: "ease-out",
    spring: { damping: 15, stiffness: 150 },
  },
};
```

---

## File Naming

| Type       | Convention                | Example              |
| ---------- | ------------------------- | -------------------- |
| Components | kebab-case                | `welcome-screen.tsx` |
| Hooks      | kebab-case + use prefix   | `use-onboarding.ts`  |
| Contexts   | kebab-case + context      | `auth-context.tsx`   |
| Utils      | kebab-case                | `format-date.ts`     |
| Types      | kebab-case                | `types/meal.ts`      |
| Constants  | SCREAMING_SNAKE (in file) | `API_URL`            |
| Folders    | kebab-case                | `components/ui/`     |

---

## Firebase Structure

```
firestore/
├── users/{userId}
│   ├── profile: { name, email, createdAt }
│   ├── preferences: { dietary, goals, cookingLevel }
│   └── members/{memberId}: { name, role, age, prefs }
│
├── mealPlans/{planId}
│   ├── userId, weekStart, weekEnd
│   └── days: { mon: { breakfast, lunch, dinner }, ... }
│
├── recipes/{recipeId}
│   ├── name, ingredients[], instructions[]
│   └── metadata: { prepTime, difficulty, tags[] }
│
└── groceryLists/{listId}
    ├── userId, weekOf
    └── items: [{ name, qty, checked }]
```

---

## Git Commit Convention

```
type(scope): description

Types:
- feat:     Yeni özellik
- fix:      Bug fix
- refactor: Kod değişikliği (davranış aynı)
- style:    Formatting, styling
- docs:     Dokümantasyon
- chore:    Build, config, dependencies
```

**Examples:**

```
feat(onboarding): add dietary requirements screen
fix(calendar): resolve date picker crash on Android
refactor(context): migrate meal state to useReducer
style(button): update primary button hover state
```

---

## Code Quality

1. **TypeScript strict mode** - `"strict": true`
2. **No `any`** - Her zaman proper type
3. **Meaningful variable names** - `isLoading` not `flag`
4. **Early returns** - Nested if'lerden kaçın
5. **Single responsibility** - Bir function bir iş yapar
