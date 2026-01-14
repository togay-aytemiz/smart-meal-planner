# Weekly Menu Generation Logic (Haftalik Menu Uretim Mantigi)

Bu dokuman, haftalik aksam menusu planlamasinda cesitliligi artirirken hazirlik suresini azaltmayi hedefleyen kurallari tanimlar.
Kural seti, kullanicinin haftalik rutinine gore planlanan aksam sayisi degisebildigi icin dinamik uygulanir.

## 1. Amac ve Hedef

- Hedef: Hazirlik suresini minimize ederken damak tadi cesitliligini maksimize etmek.
- Haftada 7 aksam menusu icin hedef 4-5 benzersiz tarif.
- Planlanan aksam sayisi azaldikca benzersiz tarif hedefi oransal ayarlanir (yaklasik %60-%70 benzersiz).

## 2. Cook Once, Eat Twice (COET) - Aksam Yemegi Dongusu

**Varsayilan kural:** Aksam yemekleri iki gunluk pisirme mantigi ile planlanir.

- **Ardisik tekrar (default):** Pazartesi pisirilen ana yemek (D1), Sali "Dunden Hazir" etiketiyle tekrar sunulur.
- **Aralikli tekrar (opsiyonel):** Pazartesi D1, Carsamba tekrar edilir. Sali araya "Pratik/Hizli" gecis menusu (D2) girer.
- **Kisit:** Bir ana yemek ardisik en fazla 2 aksam yemegi olarak planlanabilir. 3. gun tekrar yapilmaz.

**COET Esneklik Ayari**
- Kullanici tercihi: "Ayni yemegi ust uste yemeyi severim / nefret ederim".
- "Nefret ederim" secilirse sistem otomatik olarak aralikli tekrar modeline gecis yapar (Pazartesi - Carsamba) veya COET oranini dusurur.

## 3. Aksam Menusu Dagilimi

| Senaryo | Ornek Dagilim | Not |
| --- | --- | --- |
| Ardisik tekrar | D1, D1, D2, D2, D3, D4, D4 | 4-5 benzersiz ana yemek |
| Aralikli tekrar | D1, D2, D1, D3, D2, D4, D4 | Ust uste ayni yemek yok |

## 4. Ingredient Synergy (Malzeme Sinerjisi)

Farkli aksam menuleri uretilse bile ayni hammaddeyi farkli formatlarda kullanarak alisveris ve hazirlik optimize edilir.

**Seasonality (Mevsimsellik) Kisit**
- Mevsime uygun hammaddeler tercih edilir.
- Ornek: Ocak ayinda domates/patlican yerine kok sebze (kereviz, havuc) sinerjisi kurulur.

**Ornek:** Pazartesi aksam "Izgara Tavuk" planlandiysa, Carsamba "Tavuklu Sebze Guvec" gibi ayni hammaddeden yararlanan farkli bir ana yemek secilir.

**Amac:** Kullanici tek seferde aldigi hammaddeyi birden fazla aksam menusu icinde taze sekilde kullanabilsin.

## 5. Weekend Shift (Hafta Sonu ve Ozel Gun Modu)

- Cumartesi aksam daha keyifli ve uzun hazirlikli menuler icin esneklik taninir.
- Pazar aksam genellikle "Haftaya Hazirlik" veya "2 Gunluk Tencere Yemegi" baslangici olarak kurgulanir.

## 6. Etiketler (UI/Planlama)

- **Dunden Hazir:** COET tekrar gunu.
- **Pratik/Hizli:** Araya giren gecis menusu.
- **Haftaya Hazirlik:** Pazar aksam baslangic menusu.
- **Keyif:** Hafta sonu daha uzun hazirlikli menuler.

## 7. Gunluk Reasoning Notu

Gunluk menuler icin olusturulan reasoning metni, bu haftalik mantikla uyumlu olmalidir.

- COET tekrar gunu varsa "Dunden Hazir" mantigi belirtilmeli.
- Ingredient Synergy kullanildiysa sebebi aciklanmali.

**Ornek:** "Dun aksam tavuk planlandigi icin, bugun ayni malzemeyi farkli bir aksam menusunde kullanarak israfi azalttim."

---

Not: Bu dokuman sadece haftalik aksam menusu planlama mantigini tanimlar. LLM promptlarina entegrasyon ayri adimdir.
