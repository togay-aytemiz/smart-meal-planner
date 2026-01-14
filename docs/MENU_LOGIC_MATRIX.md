# Menu Logic Matrix (Menü Mantık Matrisi)

Bu doküman, menü oluşturma motorunun mutfağa göre doğru öğün yapısını kurmasını ve kültür dışı kombinasyonları (örneğin "sushi yanına mercimek çorbası") engellemesini hedefler.

> Not: MVP kapsamında yalnızca akşam menüsü üretilir. Kahvaltı ve öğle matrisleri sonraki adımlara ertelenmiştir.

## 1. Temel İlke: 3 + 1 Kuralı

Mobil kullanıcı deneyimi için ideal denge:

- **3 Temel Bileşen:** Ana Yemek + Yan Yemek + (Salata/Meze veya Çorba)
- **+1 Opsiyonel:** İçecek veya Tatlı

Bu formül, her mutfakta aynen uygulanmaz. Aşağıdaki "Mutfağa Göre Kategori Dağılımı" tablosu ile esnetilir.
Kahvaltı ve öğle öğünleri için özel mantık matrisi ayrıca uygulanır.

## 2. Mutfağa Göre Kategori Dağılımı

| Mutfak | Öğün Yapısı (Kategoriler) | Örnek Kombinasyon |
| --- | --- | --- |
| Türk Mutfağı | Çorba + Ana Yemek + Yan Yemek + (Salata/Meze) | Mercimek Çorbası + Karnıyarık + Pirinç Pilavı + Cacık |
| İtalyan Mutfağı | Ana Yemek (Pasta/Risotto) + Salata + (Antipasti/Meze) | Lazanya + Roka Salatası + Bruschetta |
| Asya / Japon | Ana Yemek + Yan Yemek + (Çorba) | Teriyaki Tavuk + Buharda Pilav + Miso Çorbası |
| Amerikan | Ana Yemek + Yan Yemek (Side) + (Salata) | Burger / Steak + Fırın Patates + Coleslaw |
| Bowl (Modern) | Tek Tabak (All-in-one) | Izgara Somonlu Kinoa Kasesi (tek kategoride hepsi) |

## 3. Tagging Stratejisi (Cross-Tagging)

Her tarif **en az 3 etiket** içermelidir:

1. **Kategori:** Ana Yemek, Yan Yemek, Salata/Meze, Çorba, İçecek, Tatlı, Tek Tabak
2. **Mutfak:** Turkish, Italian, Japanese, American, Modern vb.
3. **Bağlam (Context):** Kullanıcının durumu ve kullanım senaryosu

Örnek:

- **Zeytinyağlı Fasulye**
  - Kategori: Ana Yemek
  - Mutfak: Turkish
  - Bağlam: Portable/Office, Pratik

### Bağlam (Context) Etiketleri - Öneri Seti

- Portable/Office
- Pratik (Quick)
- Aile (Family-Style)
- Sporcu/High-Protein
- Hafif (Light)
- Budget-Friendly
- Meal-Prep
- Kid-Friendly
- Gluten-Free
- Vegetarian

> Not: Bağlam etiket sayısı ihtiyaca göre artabilir, ancak filtrelerde kullanılacak çekirdek etiketler sade tutulmalıdır.

## 4. AI Filtreleme Mantığı

Kullanıcı şöyle bir istek verdiğinde:

> "Bugün Türk mutfağı istiyorum ve ofise götüreceğim."

AI şu filtreyi çalıştırır:

- **Cuisine:** Turkish
- **Context:** Portable/Office
- **Category:** Ana Yemek

Sonuç örneği:

- **Zeytinyağlı Fasulye** (Türk + taşınabilir + ana yemek)

## 5. Kategori Sayısı Kuralları (Kullanıcıyı Boğmamak İçin)

Akşam yemeğinde **minimum 2, maksimum 4 kategori** seçilir. Kahvaltı ve öğle için aşağıdaki matrisler önceliklidir.

- **Hızlı Öğle Yemeği (Ofis/Okul):** 1 veya 2 kategori
  - Örnek: Ana Yemek veya Ana Yemek + Salata
- **Aile Akşam Yemeği:** 3 veya 4 kategori
  - Örnek: Çorba + Ana + Yan + Salata
- **Sporcu Menüsü:** 2 kategori
  - Örnek: Yüksek Proteinli Ana Yemek + Kompleks Karbonhidratlı Yan Yemek
- **Bowl/Modern Menü:** 1 kategori
  - Örnek: Tek Tabak (All-in-one)

## 6. Kahvaltı Mantık Matrisi (Breakfast Logic)

Kahvaltıda ana değişken, kullanıcının o günkü zaman bütçesidir.

**AI Karar Kuralları**
- Hafta içi (Pzt-Cuma): Kullanıcı "Evden Çalışıyor" veya "Ofise Gidiyor" ise hazırlama süresini max 15 dk tut.
- Hafta sonu (Cmt-Paz): Hazırlama süresini serbest bırak ve daha fazla bileşenli "Geleneksel" menüler öner.

| Senaryo (Context) | Öğün Yapısı | Örnek Kombinasyon |
| --- | --- | --- |
| Hafta İçi / Pratik | 1 Temel Bileşen (Hızlı & Enerjik) | Avokado Tost veya Yulaflı Smoothie |
| Hafta Sonu / Keyif | 3-4 Bileşen (Serpme/Klasik) | Yumurta + Peynir Tabağı + Zeytin + Domates/Salatalık |

## 7. Öğle Yemeği Mantık Matrisi (Lunch Logic)

Öğle yemeğinde ana değişken, yemeğin nerede yeneceğidir.

| Senaryo (Context) | Öğün Yapısı | Örnek Kombinasyon |
| --- | --- | --- |
| Ofise Uygun (Cold-Friendly) | 1 Ana (Soğuk yenebilir) + 1 Yan | Mercimek Köftesi + Mevsim Salata |
| Evde / Taze (Quick Cook) | 1 Pratik Ana + 1 İçecek (+1) | Tavuklu Wrap + Ayran |

> Not: İçecek opsiyonel +1'dir; menü öğeleri listesine dahil edilmez.

## 8. Menü Oluşturma Akışı (Özet)

1. **Mutfak seçimi** yapılır.
2. **Bağlam** (ofis, aile, sporcu vb.) netleştirilir.
3. **Kategori sayısı** bağlama göre belirlenir.
4. **Mutfağa göre kategori seti** tablodan seçilir.
5. **Tarifler**, `Cuisine + Context + Category` filtreleriyle çekilir.
6. **Menü kombinasyonu** tutarlılık kontrolünden geçirilir.
   - Aynı mutfak içinde kalınır.
   - Eşleşmeyen bileşenler elenir.
   - Opsiyonel +1 (içecek/tatlı) sadece uygunsa eklenir.

## 9. Kombinasyon Tutarlılık Kontrolleri

- Farklı mutfaklardan bileşen karıştırılmaz.
- Mutfağa göre zorunlu kategoriler eksik bırakılmaz (Bowl hariç).
- Kategori eşdeğerleriyle esneme yapılabilir:
  - Salata/Meze <-> Çorba (bağlama ve mutfağa göre)
- Servis biçimi uyumsuz kombinasyonlardan kaçınılır (örneğin sushi + mercimek çorbası gibi).

---

Bu matris, AI'nin önce **kategori yapısını**, sonra **tarif seçimini** yapmasını sağlar ve menüleri hem kültürel olarak tutarlı hem de kullanıcı bağlamına uygun hale getirir.
