# Hukuk Asistanı

Kişisel hukuk ofisi takip ve kütüphane uygulaması. Veriler bulutta saklanır, tüm cihazlardan erişilebilir.

## Özellikler

- 🏠 **Ana Sayfa** — Günlük hatırlatmalar merkezi
- ✅ **Yapılacak İşler** — Görev takibi, dosya ekleme
- 📅 **Takvim** — İleri tarihli işler
- 📁 **Davalar & Dosyalar** — Dava arşivi, duruşma tarihleri
- 📚 **Kütüphane** — Hukuk kütüphanesi, TCK, kanunlar
- ⚖️ **Emsal Kararlar** — İçtihat arşivi
- 📄 **Örnek Dilekçeler** — 20 kategori dilekçe şablonu
- ⚒️ **Açtığım İcralar** — İcra takip yönetimi, sorgu takibi

## Kurulum

### 1. Supabase Hesabı Oluşturun

1. [supabase.com](https://supabase.com) adresine gidin ve ücretsiz hesap açın
2. Yeni proje oluşturun
3. SQL Editor'a gidin ve `supabase/schema.sql` dosyasının içeriğini çalıştırın
4. Storage > Buckets > "New bucket" ile `documents` adında **private** bucket oluşturun
5. Project Settings > API bölümünden şunları kopyalayın:
   - `Project URL`
   - `anon public key`

### 2. Vercel'de Deploy Edin

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/byzagnc0-cloud/hukuk-asistani)

**Environment Variables** ekleyin:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Supabase Storage Policy

Supabase Dashboard > Storage > documents bucket > Policies:

```sql
-- Upload policy
CREATE POLICY "Users can upload own files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Download policy  
CREATE POLICY "Users can read own files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Delete policy
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
```

### 4. Local Geliştirme

```bash
cp .env.local.example .env.local
# .env.local dosyasını Supabase credentials ile doldurun

npm install
npm run dev
```

## PWA Kurulumu (Telefona Ana Ekrana Ekleme)

**iPhone/iPad:**
1. Safari'de uygulamayı açın
2. Paylaş butonuna dokunun
3. "Ana Ekrana Ekle" seçin

**Android:**
1. Chrome'da uygulamayı açın
2. Menü (⋮) > "Ana ekrana ekle"

## Teknik Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** Supabase (PostgreSQL + RLS)
- **Auth:** Supabase Auth
- **File Storage:** Supabase Storage
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Type Safety:** TypeScript

## Veri Güvenliği

- Tüm veriler Supabase bulutunda PostgreSQL'de saklanır
- Row Level Security (RLS) ile her kullanıcı sadece kendi verilerini görebilir
- Uygulama güncellemeleri veri kaybına yol açmaz (migration-safe yapı)
- Supabase otomatik yedekleme yapar
