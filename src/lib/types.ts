export type TaskStatus = 'pending' | 'in_progress' | 'completed'
export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskChannel = 'mail' | 'verbal' | 'whatsapp'
export type EnforcementType = 'ilamsiz' | 'ilamli' | 'tahliye'
export type QueryType = 'arac' | 'sgk' | 'tapu' | 'banka' | 'icra' | 'posta_ceki'
export type EntityType =
  | 'task' | 'case' | 'library_item' | 'precedent' | 'petition' | 'enforcement' | 'calendar_event'
  | 'hearing' | 'negotiation' | 'icra_library_item' | 'tariff_item'
export type NegotiationStatus =
  | 'client_consult' | 'offer_made' | 'offer_rejected' | 'awaiting_new_offer'
  | 'agreement_reached' | 'call_again' | 'awaiting_response' | 'closed'
export type HearingSource = 'manual' | 'pdf' | 'excel'

export interface Task {
  id: string
  user_id: string
  case_id?: string
  title: string
  description?: string
  client_name?: string
  file_info?: string
  due_date?: string
  channel?: TaskChannel
  priority: TaskPriority
  status: TaskStatus
  completed_at?: string
  created_at: string
  updated_at: string
  attachments?: FileAttachment[]
  case?: Case
}

export interface CalendarEvent {
  id: string
  user_id: string
  title: string
  description?: string
  event_date: string
  client_name?: string
  file_info?: string
  reminder_note?: string
  status: 'pending' | 'completed'
  created_at: string
  updated_at: string
  attachments?: FileAttachment[]
}

export interface Case {
  id: string
  user_id: string
  title: string
  client_name?: string
  case_type?: string
  court?: string
  case_number?: string
  description?: string
  created_at: string
  updated_at: string
  case_dates?: CaseDate[]
  attachments?: FileAttachment[]
}

export interface CaseDate {
  id: string
  case_id: string
  user_id: string
  date_label: string
  event_date: string
  note?: string
  created_at: string
}

export interface CaseNote {
  id: string
  case_id: string
  user_id: string
  note: string
  note_date?: string
  created_at: string
}

export interface Hearing {
  id: string
  user_id: string
  case_id?: string
  title: string
  court?: string
  hearing_date: string
  note?: string
  attorney?: string
  status: 'pending' | 'completed'
  source: HearingSource
  created_at: string
  updated_at: string
  case?: Case
  attachments?: FileAttachment[]
}

export interface Negotiation {
  id: string
  user_id: string
  client_name?: string
  opposing_party?: string
  summary?: string
  offer_made?: string
  counter_offer?: string
  meeting_date?: string
  follow_up_date?: string
  status: NegotiationStatus
  created_at: string
  updated_at: string
}

export interface IcraLibraryCategory {
  id: string
  user_id: string
  name: string
  sort_order: number
  created_at: string
}

export interface IcraLibraryItem {
  id: string
  user_id: string
  category_id?: string
  title: string
  content?: string
  created_at: string
  updated_at: string
  attachments?: FileAttachment[]
}

export interface TariffCategory {
  id: string
  user_id: string
  name: string
  sort_order: number
  created_at: string
}

export interface TariffItem {
  id: string
  user_id: string
  category_id?: string
  title: string
  content?: string
  created_at: string
  updated_at: string
  attachments?: FileAttachment[]
}

export interface LibraryCategory {
  id: string
  user_id: string
  name: string
  description?: string
  sort_order: number
  created_at: string
}

export interface LibraryItem {
  id: string
  user_id: string
  category_id?: string
  title: string
  description?: string
  content?: string
  tags: string[]
  created_at: string
  updated_at: string
  category?: LibraryCategory
  attachments?: FileAttachment[]
}

export interface PrecedentDecision {
  id: string
  user_id: string
  title: string
  court?: string
  department?: string
  case_number?: string
  decision_number?: string
  decision_date?: string
  subject?: string
  summary?: string
  tags: string[]
  created_at: string
  updated_at: string
  attachments?: FileAttachment[]
}

export interface PetitionTemplate {
  id: string
  user_id: string
  title: string
  category?: string
  description?: string
  content?: string
  tags: string[]
  created_at: string
  updated_at: string
  attachments?: FileAttachment[]
}

export interface EnforcementCase {
  id: string
  user_id: string
  client_name: string
  debtor_name?: string
  enforcement_file_number?: string
  opened_date?: string
  notification_sent_date?: string
  notification_received_date?: string
  finalization_date?: string
  notification_number?: string
  status: string
  enforcement_type?: EnforcementType
  query_done: boolean
  wanted_persons?: string
  notes?: string
  created_at: string
  updated_at: string
  queries?: EnforcementQuery[]
  attachments?: FileAttachment[]
}

export interface EnforcementQuery {
  id: string
  enforcement_case_id: string
  user_id: string
  query_type: QueryType
  is_done: boolean
  found?: boolean | null
  done_date?: string
  result_note?: string
  created_at: string
  updated_at: string
}

export interface FileAttachment {
  id: string
  user_id: string
  entity_type: EntityType
  entity_id: string
  file_name: string
  file_path: string
  file_size?: number
  mime_type?: string
  created_at: string
}

export interface Reminder {
  id: string
  source: 'task' | 'calendar' | 'case_date' | 'enforcement' | 'hearing' | 'negotiation' | 'case_note'
  title: string
  description?: string
  client_name?: string
  date: string
  entity_id: string
  url: string
}

export const PETITION_CATEGORIES = [
  'Bilirkişi İtiraz Dilekçesi',
  'Cevaba Cevap Dilekçesi',
  'Cevap Dilekçesi',
  'Tahkim Bilirkişi İtiraz Dilekçesi',
  'Tahkim İtiraz Dilekçesi',
  'Tahkim Beyan Dilekçesi',
  'Bilirkişi Ücreti Beyan Dilekçesi',
  'Mahrumiyet Dava Dilekçesi',
  'Mahrumiyet ve Değer Kaybı Dava Dilekçesi',
  'Sigorta Tahkim Başvuru Dilekçesi',
  'Sigortaya Başvuru Dilekçesi',
  'Dava Dilekçesi',
  'Çok Duruşmalı Mazeret Dilekçesi',
  'Hakim İzni Mazeret Dilekçesi',
  'Değer Kaybı Bilirkişi İtiraz Dilekçesi',
  'Mahrumiyet Bilirkişi İtiraz Dilekçesi',
  'Mahrumiyet Emsal İlanlı Beyan Dilekçesi',
  'İstinaf Dilekçesi',
  'Beyan Dilekçesi',
  'Mazeret Dilekçesi',
  'İhtiyati Haciz',
  'İhtiyati Haciz İcra Talebi',
  'Diğer',
]

export const CASE_TYPE_OPTIONS = [
  'Hukuk',
  'Ceza',
  'İcra',
  'İdari Yargı',
  'Arabuluculuk',
  'CBS',
]

export const NEGOTIATION_STATUS_LABELS: Record<NegotiationStatus, string> = {
  client_consult: 'Müvekkille danışılacak',
  offer_made: 'Karşı tarafa teklif sunuldu',
  offer_rejected: 'Teklif reddedildi',
  awaiting_new_offer: 'Yeni teklif beklenecek',
  agreement_reached: 'Anlaşma sağlandı',
  call_again: 'Tekrar aranacak',
  awaiting_response: 'Dönüş bekleniyor',
  closed: 'Kapandı',
}

export const DEFAULT_LIBRARY_CATEGORIES = [
  'Genel Hukuk Kitaplığı',
  'TCK',
  'Kanunlar',
  'Makaleler',
  'Notlar',
  'Emsal İçerikler',
]

export const DEFAULT_ICRA_LIBRARY_CATEGORIES = [
  'Harçlar',
  'İcra Vekalet Ücretleri',
  'Tahsil Harçları',
  'Başvurma Harçları',
  'Uygulama Notları',
]

export const DEFAULT_TARIFF_CATEGORIES = [
  'AAÜT',
  'İcra Vekalet Ücretleri',
  'Harçlar',
  'Tarifeler',
]

export const QUERY_TYPE_LABELS: Record<QueryType, string> = {
  arac: 'Araç Sorgusu',
  sgk: 'SGK Sorgusu',
  tapu: 'Tapu Sorgusu',
  banka: 'Banka Sorgusu',
  icra: 'İcra Dosyası Sorgusu',
  posta_ceki: 'Posta Çeki Sorgusu',
}

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Bekliyor',
  in_progress: 'Devam Ediyor',
  completed: 'Tamamlandı',
}

export const CHANNEL_LABELS: Record<TaskChannel, string> = {
  mail: 'Mail',
  verbal: 'Sözlü',
  whatsapp: 'WhatsApp',
}

export const ENFORCEMENT_TYPE_LABELS: Record<EnforcementType, string> = {
  ilamsiz: 'İlamsız',
  ilamli: 'İlamlı',
  tahliye: 'Tahliye Talepli',
}
