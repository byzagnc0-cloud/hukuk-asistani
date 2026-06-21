-- Hukuk Asistanı - Migration 2
-- Bu dosyayı Supabase SQL Editor'da çalıştırın.
-- Mevcut tablolara ve verilere dokunmaz; sadece yeni tablo/kolon ekler.
-- Birden fazla kez çalıştırılsa da güvenlidir (IF NOT EXISTS / IF EXISTS kullanılır).

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- DURUŞMA LİSTESİ (Hearings)
-- ============================================================
CREATE TABLE IF NOT EXISTS hearings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  court TEXT,
  hearing_date DATE NOT NULL,
  note TEXT,
  attorney TEXT,
  status TEXT CHECK (status IN ('pending', 'completed')) DEFAULT 'pending',
  source TEXT CHECK (source IN ('manual', 'pdf', 'excel')) DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE hearings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own hearings" ON hearings;
CREATE POLICY "Users can manage own hearings" ON hearings FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- GÖRÜŞME VE TEKLİF TAKİP (Negotiations)
-- ============================================================
CREATE TABLE IF NOT EXISTS negotiations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name TEXT,
  opposing_party TEXT,
  summary TEXT,
  offer_made TEXT,
  counter_offer TEXT,
  meeting_date DATE,
  follow_up_date DATE,
  status TEXT CHECK (status IN (
    'client_consult', 'offer_made', 'offer_rejected', 'awaiting_new_offer',
    'agreement_reached', 'call_again', 'awaiting_response', 'closed'
  )) DEFAULT 'client_consult',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE negotiations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own negotiations" ON negotiations;
CREATE POLICY "Users can manage own negotiations" ON negotiations FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- DOSYA İÇİ NOTLAR (Case Notes)
-- ============================================================
CREATE TABLE IF NOT EXISTS case_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  note_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE case_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own case_notes" ON case_notes;
CREATE POLICY "Users can manage own case_notes" ON case_notes FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- İCRA KÜTÜPHANESİ (kişisel icra kütüphanesi - notlar/başlıklar)
-- ============================================================
CREATE TABLE IF NOT EXISTS icra_library_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS icra_library_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES icra_library_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE icra_library_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE icra_library_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own icra_library_categories" ON icra_library_categories;
CREATE POLICY "Users can manage own icra_library_categories" ON icra_library_categories FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can manage own icra_library_items" ON icra_library_items;
CREATE POLICY "Users can manage own icra_library_items" ON icra_library_items FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- ASGARİ ÜCRET TARİFESİ (Tariff)
-- ============================================================
CREATE TABLE IF NOT EXISTS tariff_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tariff_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES tariff_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tariff_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tariff_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own tariff_categories" ON tariff_categories;
CREATE POLICY "Users can manage own tariff_categories" ON tariff_categories FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can manage own tariff_items" ON tariff_items;
CREATE POLICY "Users can manage own tariff_items" ON tariff_items FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- MEVCUT TABLOLARA EK ALANLAR
-- ============================================================

-- Yapılacak işler artık bir dava/dosya ile eşleştirilebilir
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS case_id UUID REFERENCES cases(id) ON DELETE SET NULL;

-- İcra dosyalarında "Aranan Kişiler" alanı
ALTER TABLE enforcement_cases ADD COLUMN IF NOT EXISTS wanted_persons TEXT;

-- Malvarlığı sorgularında Var/Yok bilgisi (true = Var, false = Yok, null = işaretlenmedi)
ALTER TABLE enforcement_queries ADD COLUMN IF NOT EXISTS found BOOLEAN;

-- Örnek dilekçelerde kategori artık zorunlu değil (kullanıcı serbest/özel kategori girebilir)
ALTER TABLE petition_templates ALTER COLUMN category DROP NOT NULL;

-- file_attachments tablosunun entity_type kontrolüne yeni modülleri ekle
ALTER TABLE file_attachments DROP CONSTRAINT IF EXISTS file_attachments_entity_type_check;
ALTER TABLE file_attachments ADD CONSTRAINT file_attachments_entity_type_check
  CHECK (entity_type IN (
    'task', 'case', 'library_item', 'precedent', 'petition', 'enforcement', 'calendar_event',
    'hearing', 'negotiation', 'icra_library_item', 'tariff_item'
  ));

-- ============================================================
-- OTOMATİK updated_at TETİKLEYİCİLERİ (yeni tablolar için)
-- ============================================================
DROP TRIGGER IF EXISTS update_hearings_updated_at ON hearings;
CREATE TRIGGER update_hearings_updated_at BEFORE UPDATE ON hearings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_negotiations_updated_at ON negotiations;
CREATE TRIGGER update_negotiations_updated_at BEFORE UPDATE ON negotiations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_icra_library_items_updated_at ON icra_library_items;
CREATE TRIGGER update_icra_library_items_updated_at BEFORE UPDATE ON icra_library_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tariff_items_updated_at ON tariff_items;
CREATE TRIGGER update_tariff_items_updated_at BEFORE UPDATE ON tariff_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
