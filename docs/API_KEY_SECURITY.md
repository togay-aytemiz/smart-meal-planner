# 🔒 API Key Güvenliği - Acil Durum Talimatları

## ⚠️ PROBLEM: API Key Expose Oldu

Eğer API key'inizi yanlışlıkla commit ettiyseniz (`.secret.local.example` dosyasında), **derhal** şu adımları izleyin:

## 🚨 Hemen Yapılması Gerekenler

### 1. API Key'i İptal Edin ve Yenisini Oluşturun

**Google AI Studio'ya gidin:**
1. https://aistudio.google.com/app/apikey adresine gidin
2. Expose olan API key'i bulun ve **ÖNEMLİ** butonuna tıklayın
3. "Delete API key" seçeneğini seçin
4. Yeni bir API key oluşturun
5. Yeni key'i **sadece** `.secret.local` dosyasına ekleyin (`.example` dosyasına DEĞİL!)

### 2. Git History'den API Key'i Temizleyin

⚠️ **UYARI**: Bu işlem Git history'i değiştirir. Eğer başkaları da bu repository'de çalışıyorsa, onlarla koordine olun.

#### Seçenek A: BFG Repo-Cleaner (Önerilen - Kolay)

```bash
# BFG'yi yükleyin (macOS)
brew install bfg

# Bir yedek alın
cd /Users/togay/Desktop
cp -r smart-meal-planner smart-meal-planner-backup

# API key'i tüm history'den silin
cd smart-meal-planner
bfg --replace-text <(echo 'AIzaSyCmNQS3xd2WfK2BSqefdNNmdVpbgzLcRMk==>***REMOVED***')

# Değişiklikleri uygulayın
git reflog expire --expire=now --all && git gc --prune=now --aggressive

# Remote'a force push (dikkatli!)
git push --force
```

#### Seçenek B: git filter-branch (Manuel)

```bash
# Bir yedek alın
cd /Users/togay/Desktop
cp -r smart-meal-planner smart-meal-planner-backup

cd smart-meal-planner

# API key içeren dosyayı history'den kaldırın
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch functions/.secret.local.example" \
  --prune-empty --tag-name-filter cat -- --all

# Değişiklikleri uygulayın
git reflog expire --expire=now --all && git gc --prune=now --aggressive

# Remote'a force push (dikkatli!)
git push --force
```

#### Seçenek C: Basit Çözüm (Eğer repository yeniyse)

Eğer repository henüz çok az commit'e sahipse:

```bash
# Yeni bir repo başlatın
cd /Users/togay/Desktop/smart-meal-planner
rm -rf .git
git init
git add .
git commit -m "Initial commit - with security fixes"

# Remote'u yeniden bağlayın
git remote add origin <your-repo-url>
git push -f origin main
```

### 3. `.secret.local.example` Dosyasını Düzeltin

✅ **Zaten düzeltildi!** 
- Template dosyasından gerçek API key kaldırıldı
- Placeholder `your-actual-gemini-key-here` eklendi

### 4. Gitignore Güçlendirildi

✅ **Zaten yapıldı!**
- Ana `.gitignore` dosyasına global pattern eklendi
- `**/.secret.local` artık tüm alt dizinlerde de korunuyor

## ✅ Yapılması Gerekenler (Kontrol Listesi)

- [ ] Eski API key'i Google AI Studio'dan sildin
- [ ] Yeni API key oluşturdun
- [ ] Yeni key'i **sadece** `.secret.local` dosyasına ekledin
- [ ] Git history'den eski key'i temizledin (yukarıdaki yöntemlerden biriyle)
- [ ] Force push yaptın (eğer gerekirse)
- [ ] `.secret.local.example` dosyasında placeholder var (gerçek key YOK)
- [ ] `.gitignore` güncel ve aktif

## 📋 Gelecek İçin Güvenlik Kuralları

### ❌ ASLA YAPMAYIN:
1. ❌ `.secret.local.example` dosyasına gerçek API key yazmayın
2. ❌ `.env.local` veya `.secret.local` dosyalarını commit etmeyin
3. ❌ API key'leri kod içinde hardcode etmeyin
4. ❌ API key'leri commit mesajlarına yazmayın
5. ❌ Screenshot'larda API key göstermeyin

### ✅ HER ZAMAN YAPIN:
1. ✅ API key'leri **sadece** `.secret.local` dosyasında saklayın
2. ✅ `.secret.local` dosyasının `.gitignore`'da olduğundan emin olun
3. ✅ Template dosyalarında (`*.example`) placeholder kullanın
4. ✅ Commit etmeden önce `git status` ile kontrol edin
5. ✅ Production'da Firebase Functions Secrets kullanın

## 🔍 API Key Leak Kontrolü

Commit etmeden önce kontrol edin:

```bash
# Staged dosyalarda API key var mı kontrol et
git diff --cached | grep -i "AIza"

# Tüm dosyalarda API key var mı kontrol et
grep -r "AIzaSy" . --exclude-dir=node_modules --exclude-dir=.git

# .secret.local dosyasının gitignore'da olduğunu kontrol et
git check-ignore functions/.secret.local
# Çıktı: functions/.secret.local (✅ Doğru)
```

## 📝 Template Dosya Formatı (Correct)

`.secret.local.example` **şu şekilde olmalı:**

```bash
# Firebase Functions Secrets - Local Development
# Copy this file to .secret.local and add your actual secrets

# OpenAI API Key (for image generation)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Gemini API Key (for recipe generation)
GEMINI_API_KEY=your-actual-gemini-key-here
```

**Asla şu şekilde olmamalı:**
```bash
# ❌ YANLIŞ - Gerçek key var!
GEMINI_API_KEY=AIzaSyCmNQS3xd2WfK2BSqefdNNmdVpbgzLcRMk
```

## 🛡️ Production Güvenliği

Production'da **hiçbir zaman** `.secret.local` kullanmayın. Bunun yerine:

```bash
# Firebase Functions Secrets Manager kullanın
firebase functions:secrets:set GEMINI_API_KEY
# Prompt: Enter value for GEMINI_API_KEY: [your-key-here]

firebase functions:secrets:set OPENAI_API_KEY
# Prompt: Enter value for OPENAI_API_KEY: [your-key-here]

# Deploy
firebase deploy --only functions
```

## ❓ Sorular

### "API key'imi GitHub'da bulabilirler mi?"
Evet! GitHub, GitLab, ve diğer platformlar sürekli API key'leri tarıyor. Birkaç dakika içinde botlar bulabilir.

### "Eski commit'lerde API key varsa ne olur?"
Git history tamamen açık olduğu için, eski commit'lerdeki key'ler de görülebilir. Bu yüzden history'den temizlemek şart.

### "Force push güvenli mi?"
Eğer tek başınıza çalışıyorsanız evet. Eğer ekip çalışması varsa, önce ekiple konuşun.

### "API key'im çalındıysa ne olur?"
- Google Cloud faturanız artabilir (kullanım limiti aşılırsa)
- Kötü amaçlı kullanım olabilir
- Hemen key'i iptal edin ve yenisini oluşturun

## 📞 Yardım

Eğer API key leak'i konusunda yardıma ihtiyacınız varsa:
1. Önce API key'i iptal edin (Google AI Studio)
2. Yeni key oluşturun
3. Sonra Git history temizliği için yardım isteyin
