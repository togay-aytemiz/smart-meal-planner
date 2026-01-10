# Smart Meal Planner

Minimal, aesthetic ve modern bir yemek planlama uygulaması.

## 🚀 Başlangıç

### Ön Gereksinimler

- Node.js (v18 veya üzeri)
- npm veya yarn
- iOS Simulator için: Xcode (macOS'ta)
- Android Emulator için: Android Studio
- Fiziksel cihaz için: Expo Go uygulaması (sadece native modül yoksa) veya Development Build

### Kurulum

1. Bağımlılıkları yükleyin:

```bash
npm install
```

2. Firebase yapılandırması kontrol edin:
   - `google-services.json` (Android) ve `GoogleService-Info.plist` (iOS) dosyalarının mevcut olduğundan emin olun

### Development Build (Önerilen)

Bu proje Firebase native modülleri kullandığı için development build gereklidir.

#### iOS için:

```bash
npm run ios
# veya
npx expo run:ios
```

#### Android için:

```bash
npm run android
# veya
npx expo run:android
```

### Expo Development Server

Development build'i ilk kez çalıştırdıktan sonra, sadece development server'ı başlatmak için:

```bash
npm start
# veya
npx expo start
```

Sonra terminaldeki QR kodunu tarayarak veya simulator/emulator'da uygulamayı açabilirsiniz.

### Web'de Çalıştırma (Sınırlı)

Not: Firebase native modülleri web'de çalışmaz, sadece UI geliştirmesi için:

```bash
npm run web
```

## 📱 Platform Seçenekleri

### iOS Simulator

```bash
npx expo start --ios
```

### Android Emulator

```bash
npx expo start --android
```

### Fiziksel Cihaz (Development Build ile)

1. Development build yükleyin: `npm run ios` veya `npm run android`
2. Development server başlatın: `npm start`
3. QR kodunu tarayın veya manuel olarak bağlanın

## 🛠️ Yaygın Komutlar

```bash
# Development server başlat
npm start

# iOS için build ve çalıştır
npm run ios

# Android için build ve çalıştır
npm run android

# Web'de çalıştır (UI testi için)
npm run web

# Lint kontrol
npm run lint

# Development ortamını sıfırla
npm run reset
```

## 📁 Proje Yapısı

```
src/
├── app/                  # Expo Router routes
├── components/
│   ├── ui/               # Base components
│   └── onboarding/       # Feature components
├── contexts/             # Context API providers
├── hooks/                # Custom hooks
├── theme/                # Design system
├── types/                # TypeScript types
└── utils/                # Utility functions
```

## 🔥 Firebase Yapılandırması

1. Firebase projesi oluşturun
2. iOS ve Android uygulamalarını ekleyin
3. `google-services.json` ve `GoogleService-Info.plist` dosyalarını indirin
4. Proje root'una yerleştirin (zaten mevcut)

## 🎨 Design System

- **Renkler**: `src/theme/colors.ts`
- **Typography**: `src/theme/typography.ts`
- **Spacing**: `src/theme/spacing.ts`

## 📝 Notlar

- Bu proje Expo SDK 54 kullanıyor
- React Native 0.81.5
- Firebase native modülleri için development build gereklidir
- Expo Go uygulaması bu proje ile çalışmaz (native modüller nedeniyle)
