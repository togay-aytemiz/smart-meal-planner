# Weekly Menu Generation Logic (Haftalik Menu Uretim Mantigi)

Bu dokuman, haftalik menu planlamasinda cesitliligi artirirken mutfak suresini azaltmayi hedefleyen kurallari tanimlar.
Kural seti, kullanicinin haftalik rutinine gore toplam ogun sayisi degisebildigi icin dinamik uygulanir.

## 1. Amac ve Hedef

- Hedef: Hazirlik suresini minimize ederken damak tadi cesitliligini maksimize etmek.
- 21 ogunluk (3 ogun x 7 gun) haftada hedef 10-12 benzersiz tarif.
- Toplam ogun sayisi degistikce benzersiz tarif hedefi oransal ayarlanir (yaklasik %50-%60 benzersiz).

## 2. Cook Once, Eat Twice (COET) - Aksam Yemegi Dongusu

**Varsayilan kural:** Aksam yemekleri iki gunluk pisirme mantigi ile planlanir.

- **Ardisik tekrar (default):** Pazartesi pisirilen ana yemek (D1), Sali "Dunden Hazir" etiketiyle tekrar sunulur.
- **Aralikli tekrar (opsiyonel):** Pazartesi D1, Carsamba tekrar edilir. Sali araya "Pratik/Hizli" gecis ogunu (D2) girer.
- **Kisit:** Bir ana yemek ardisik en fazla 2 aksam yemegi olarak planlanabilir. 3. gun tekrar yapilmaz.

**COET Esneklik Ayari**
- Kullanici tercihi: "Ayni yemegi ust uste yemeyi severim / nefret ederim".
- "Nefret ederim" secilirse sistem otomatik olarak aralikli tekrar modeline gecis yapar (Pazartesi - Carsamba) veya COET oranini dusurur.

## 3. Ogun Bazli Tekrar Oranlari

| Ogun Tipi | Haftalik Hedef | Tekrar Mantigi |
| --- | --- | --- |
| Kahvalti | 3 Benzersiz Tarif | Hafta ici (A-B-A-B-A), Hafta sonu (C-C) |
| Ogle Yemegi | 3-4 Benzersiz Tarif | "Tasinabilir" odakli, ardisik olmayan tekrarlar |
| Aksam Yemegi | 4-5 Benzersiz Tarif | 2 gun yeme kurali (D1, D1, D2, D2, D3, D4, D4) |

## 4. Ingredient Synergy (Malzeme Sinerjisi)

Farkli yemekler uretilse bile ayni hammaddeyi farkli formatlarda kullanarak alisveris ve hazirlik optimize edilir.

**Seasonality (Mevsimsellik) Kisit**
- Mevsime uygun hammaddeler tercih edilir.
- Ornek: Ocak ayinda domates/patlican yerine kok sebze (kereviz, havuc) sinerjisi kurulur.

**Ornek:** Pazartesi aksam "Izgara Tavuk" planlandiysa, Sali ogle "Tavuklu Sezar Salata" gibi taze ama ayni hammaddeden yararlanan bir secenek planlanir.

**Amac:** Kullanici tek seferde aldigi 1 kg tavugu iki farkli ogunde (biri sicak/aksam, biri soguk/ogle) taze olarak bitirebilsin.

## 5. Weekend Shift (Hafta Sonu ve Ozel Gun Modu)

- **Kahvalti:** Cumartesi ve Pazar "Keyif/Serpme" etiketiyle daha cok bilesenli ve hazirlik suresi uzun menuler.
- **Aksam:** Pazar aksami genellikle "Haftaya Hazirlik" veya "2 Gunluk Tencere Yemegi" baslangici olarak kurgulanir.

## 6. Etiketler (UI/Planlama)

- **Dunden Hazir:** COET tekrar gunu.
- **Pratik/Hizli:** Araya giren gecis ogunu.
- **Keyif/Serpme:** Hafta sonu kahvalti.
- **Tasinabilir:** Ogle ogunlerinde ofis/school senaryolari.

## 7. Gunluk Reasoning Notu

Gunluk menuler icin olusturulan reasoning metni, bu haftalik mantikla uyumlu olmalidir.

- COET tekrar gunu varsa "Dunden Hazir" mantigi belirtilmeli.
- Ingredient Synergy kullanildiysa sebebi aciklanmali.

**Ornek:** "Dun aksam tavuk planlandigi icin, bugun ogle icin tavuklu salata secerek malzeme israfini azalttim."

---

Not: Bu dokuman sadece haftalik menu planlama mantigini tanimlar. LLM promptlarina entegrasyon ayri adimdir.
