# Yayın (Publish) Roadmap — En Basit Anlatım

Bu doküman **hiç bilmeyen biri** için yazıldı. Bir uygulamayı mağazalara (Apple App Store ve Google Play) **sıfırdan yayınlamak** için hangi adımları, hangi sırayla yapacağını anlatır.

Amaç: Hiç bilmeyen birinin bile adım adım ilerleyip **yayına çıkabilmesi**.

---

## 0) Genel mantık (çok kısa)

- **Uygulama**: Senin yaptığın React Native/Expo uygulaması.
- **Mağazalar**: iOS için **App Store**, Android için **Google Play**.
- **Ödeme**: Abonelik ücretini mağazalar toplar, sana ödeme yapar.
- **RevenueCat**: Ödeme/abonelik yönetimini kolaylaştıran servis.
- **EAS**: Expo’nun build ve mağazaya gönderme aracı.

---

## 1) Gerekli hesapları aç (zorunlu)

### 1.1 Apple Developer hesabı
- App Store’a çıkmak için **Apple Developer Program** üyeliği şart.
- “Individual” (bireysel) veya “Organization” (şirket) seçebilirsin.
- Organization için **D‑U‑N‑S** numarası gerekir (şirket kaydı).

### 1.2 App Store Connect hesabı
- Apple Developer hesabın olunca **App Store Connect**’e girersin.
- Uygulama oluşturma, fiyat, ekran görüntüsü, yayınlama burada yapılır.

### 1.3 Google Play Console hesabı
- Android’e çıkmak için **Play Console** hesabı şart.
- Kayıt sırasında tek seferlik ücret istenir (ekranda görürsün).

---

## 2) Ödeme alabilmek için “para ayarları”

### 2.1 Apple (App Store Connect)
- “Agreements, Tax, and Banking” bölümüne git.
- **Paid Apps Agreement** kabul et.
- **Banka hesabı** ve **vergi bilgilerini** doldur.

### 2.2 Google (Play Console)
- “Payments profile” oluştur.
- **Banka hesabı** ve gerekli bilgileri gir.

Bu adımlar yapılmadan mağaza sana para göndermez.

---

## 3) Mağazalarda uygulamayı oluştur (çok temel)

### 3.1 iOS için uygulama oluştur (App Store Connect)
- “My Apps” → “New App”.
- Uygulama adı, **bundle id**, dil, kategori seç.
- Bundle id bizde: `studio.agent.smart-meal-planner`

### 3.2 Android için uygulama oluştur (Play Console)
- “All apps” → “Create app”.
- Uygulama adı, dil, kategori seç.
- Paket adı bizde: `studio.agent.smart_meal_planner.android`

---

## 4) Ürün (abonelik) oluştur ve fiyatı burada ayarla

> **Önemli:** Fiyat RevenueCat’te değil, **mağazada** ayarlanır.

### 4.1 iOS (App Store Connect)
- “Subscriptions” bölümünde yeni ürün oluştur.
- Ürün adı, grup, süre (weekly/monthly) ve fiyat seç.

### 4.2 Android (Play Console)
- “Subscriptions” bölümünde yeni ürün oluştur.
- Base plan oluştur, fiyatı gir.

---

## 5) RevenueCat kurulumu

### 5.1 RevenueCat’te app oluştur
- “New app configuration” seç.
- **iOS app** ekle (bundle id yaz).
- **Android app** ekle (package name yaz).

### 5.2 Mağaza bağlantılarını yap
- Apple ve Google mağaza bilgilerini RevenueCat’e bağla.
- Bu sayede RevenueCat mağazada oluşturduğun ürünleri görebilir.

### 5.3 Ürünleri RevenueCat’e import et
- App Store / Play Console ürünlerini “Import Products” ile getir.
- Offering ve Entitlement eşleştir.

### 5.4 RevenueCat prod key al
- RevenueCat → Project Settings → API Keys.
- **iOS public SDK key** ve **Android public SDK key** kopyala.

---

## 6) Uygulamada prod key’leri ayarla

- EAS prod ortamına bu key’leri koyacağız.
- Bu key’ler uygulamanın yayınlanan sürümünde kullanılacak.

Komutlar (prod key gelince):
- `eas env:set --environment production EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`
- `eas env:set --environment production EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`

> Test key ile **yayınlama yapma**.

---

## 7) EAS ile build al

### 7.1 EAS hesabı
- Expo hesabı açıldıysa `eas login` ile giriş yapılır.

### 7.2 Build
- iOS için: `eas build --profile production --platform ios`
- Android için: `eas build --profile production --platform android`

EAS build bitince sana download linki verir.

---

## 8) Mağazaya gönderme (submit)

### 8.1 iOS (App Store Connect)
- `eas submit --profile production --platform ios`
- App Store Connect’te “TestFlight” veya “Release” olarak görürsün.

### 8.2 Android (Play Console)
- `eas submit --profile production --platform android`
- Play Console’da üretim (Production) kanalına gönder.

---

## 9) Store içeriğini doldur

Her iki mağazada da şunlar gerekir:
- Uygulama açıklaması
- Ekran görüntüleri (farklı cihaz boyutları)
- İkon
- Gizlilik politikası linki
- “Contains Ads” ve “Data Safety” gibi formlar

---

## 10) Review ve yayın

- **Apple**: İnceleme (review) süreci olur, onaylanınca yayınlanır.
- **Google**: Production kanalında yayınlanır (inceleme olabilir).

---

## 11) Yayın sonrası kontrol

- Abonelik akışı çalışıyor mu?
- RevenueCat entitlements doğru mu?
- Crash/analytics kayıt geliyor mu?
- Ücretlendirme ve ödeme sorunları var mı?

---

## Sık yapılan hatalar (kısa)

- Test key ile prod yayınlamak (yanlış)
- Mağazada ürün oluşturmayı unutmak
- Ödeme bilgilerini doldurmadan beklemek
- Store listing (ekran görüntüsü, açıklama) eksik bırakmak

---

## Bizim proje için kısa özet

- iOS bundle id: `studio.agent.smart-meal-planner`
- Android package: `studio.agent.smart_meal_planner.android`
- RevenueCat prod key’leri gelince EAS prod env’e yazılacak.
- EAS prod build ve submit ile mağazalara gönderilecek.

