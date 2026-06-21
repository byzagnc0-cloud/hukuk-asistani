-- Hukuk Asistanı - Supabase Database Schema
-- Bu dosyayı Supabase SQL Editor'da çalıştırın

-- UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- YAPILACAK İŞLER (Tasks)
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  case_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  client_name TEXT,
  file_info TEXT,
  due_date DATE,
  channel TEXT CHECK (channel IN ('mail', 'verbal', 'whatsapp')),
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed')) DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TAKVİM / İLERİ TARİHLİ İŞLER (Calendar Events)
-- ============================================================
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  client_name TEXT,
  file_info TEXT,
  reminder_note TEXT,
  status TEXT CHECK (status IN ('pending', 'completed')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DAVALAR VE DOSYALAR (Cases)
-- ============================================================
CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  client_name TEXT,
  case_type TEXT,
  court TEXT,
  case_number TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dava Tarihleri / Duruşmalar
CREATE TABLE IF NOT EXISTS case_dates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_label TEXT NOT NULL,
  event_date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dosya İçi Notlar (tarih girilebilir, tarihi gelince ana sayfada hatırlatılır)
CREATE TABLE IF NOT EXISTS case_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  note_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- tasks.case_id -> cases(id) bağlantısı (yapılacak işler ile dosyalar arasında senkronizasyon)
ALTER TABLE tasks ADD CONSTRAINT tasks_case_id_fkey FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE SET NULL;

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

-- ============================================================
-- KÜTÜPHANİE KATEGORİLERİ (Library Categories)
-- ============================================================
CREATE TABLE IF NOT EXISTS library_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- KÜTÜPHANİE İÇERİKLERİ (Library Items)
CREATE TABLE IF NOT EXISTS library_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES library_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EMSAL KARARLAR (Precedent Decisions)
-- ============================================================
CREATE TABLE IF NOT EXISTS precedent_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  court TEXT,
  department TEXT,
  case_number TEXT,
  decision_number TEXT,
  decision_date DATE,
  subject TEXT,
  summary TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ÖRNEK DİLEKÇELER (Petition Templates)
-- ============================================================
CREATE TABLE IF NOT EXISTS petition_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT,
  description TEXT,
  content TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AÇTIĞIM İCRALAR (Enforcement Cases)
-- ============================================================
CREATE TABLE IF NOT EXISTS enforcement_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  debtor_name TEXT,
  enforcement_file_number TEXT,
  opened_date DATE,
  notification_sent_date DATE,
  notification_received_date DATE,
  finalization_date DATE,
  notification_number TEXT,
  status TEXT DEFAULT 'active',
  enforcement_type TEXT CHECK (enforcement_type IN ('ilamsiz', 'ilamli', 'tahliye')),
  query_done BOOLEAN DEFAULT FALSE,
  wanted_persons TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- İCRA SORGULARI (Enforcement Queries)
CREATE TABLE IF NOT EXISTS enforcement_queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enforcement_case_id UUID NOT NULL REFERENCES enforcement_cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query_type TEXT NOT NULL CHECK (query_type IN ('arac', 'sgk', 'tapu', 'banka', 'icra', 'posta_ceki')),
  is_done BOOLEAN DEFAULT FALSE,
  found BOOLEAN,
  done_date DATE,
  result_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DOSYA EKLERİ (File Attachments - tüm tablolar için)
-- ============================================================
CREATE TABLE IF NOT EXISTS file_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'task', 'case', 'library_item', 'precedent', 'petition', 'enforcement', 'calendar_event',
    'hearing', 'negotiation', 'icra_library_item', 'tariff_item'
  )),
  entity_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) - Kullanıcılar sadece kendi verilerini görsün
-- ============================================================

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE hearings ENABLE ROW LEVEL SECURITY;
ALTER TABLE negotiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE icra_library_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE icra_library_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tariff_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tariff_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE precedent_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE petition_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE enforcement_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE enforcement_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_attachments ENABLE ROW LEVEL SECURITY;

-- Tasks policies
CREATE POLICY "Users can manage own tasks" ON tasks
  FOR ALL USING (auth.uid() = user_id);

-- Calendar events policies
CREATE POLICY "Users can manage own calendar_events" ON calendar_events
  FOR ALL USING (auth.uid() = user_id);

-- Cases policies
CREATE POLICY "Users can manage own cases" ON cases
  FOR ALL USING (auth.uid() = user_id);

-- Case dates policies
CREATE POLICY "Users can manage own case_dates" ON case_dates
  FOR ALL USING (auth.uid() = user_id);

-- Case notes policies
CREATE POLICY "Users can manage own case_notes" ON case_notes
  FOR ALL USING (auth.uid() = user_id);

-- Hearings policies
CREATE POLICY "Users can manage own hearings" ON hearings
  FOR ALL USING (auth.uid() = user_id);

-- Negotiations policies
CREATE POLICY "Users can manage own negotiations" ON negotiations
  FOR ALL USING (auth.uid() = user_id);

-- Icra library policies
CREATE POLICY "Users can manage own icra_library_categories" ON icra_library_categories
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own icra_library_items" ON icra_library_items
  FOR ALL USING (auth.uid() = user_id);

-- Tariff policies
CREATE POLICY "Users can manage own tariff_categories" ON tariff_categories
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own tariff_items" ON tariff_items
  FOR ALL USING (auth.uid() = user_id);

-- Library categories policies
CREATE POLICY "Users can manage own library_categories" ON library_categories
  FOR ALL USING (auth.uid() = user_id);

-- Library items policies
CREATE POLICY "Users can manage own library_items" ON library_items
  FOR ALL USING (auth.uid() = user_id);

-- Precedent decisions policies
CREATE POLICY "Users can manage own precedent_decisions" ON precedent_decisions
  FOR ALL USING (auth.uid() = user_id);

-- Petition templates policies
CREATE POLICY "Users can manage own petition_templates" ON petition_templates
  FOR ALL USING (auth.uid() = user_id);

-- Enforcement cases policies
CREATE POLICY "Users can manage own enforcement_cases" ON enforcement_cases
  FOR ALL USING (auth.uid() = user_id);

-- Enforcement queries policies
CREATE POLICY "Users can manage own enforcement_queries" ON enforcement_queries
  FOR ALL USING (auth.uid() = user_id);

-- File attachments policies
CREATE POLICY "Users can manage own file_attachments" ON file_attachments
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKET
-- Supabase Dashboard > Storage > Create bucket: "documents"
-- Public: false (private bucket)
-- ============================================================

-- ============================================================
-- OTOMATİK updated_at TRİGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON cases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_library_items_updated_at BEFORE UPDATE ON library_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_precedent_decisions_updated_at BEFORE UPDATE ON precedent_decisions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_petition_templates_updated_at BEFORE UPDATE ON petition_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_enforcement_cases_updated_at BEFORE UPDATE ON enforcement_cases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_enforcement_queries_updated_at BEFORE UPDATE ON enforcement_queries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_hearings_updated_at BEFORE UPDATE ON hearings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_negotiations_updated_at BEFORE UPDATE ON negotiations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_icra_library_items_updated_at BEFORE UPDATE ON icra_library_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tariff_items_updated_at BEFORE UPDATE ON tariff_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
