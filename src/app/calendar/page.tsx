'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Trash2, Edit2, CheckCircle, Loader2, Calendar as CalendarIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import AppLayout from '@/components/layout/AppLayout'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import FileUpload from '@/components/ui/FileUpload'
import ToastContainer, { useToast } from '@/components/ui/Toast'
import { CalendarEvent } from '@/lib/types'
import { formatDate } from '@/lib/utils'

const emptyForm = {
  title: '',
  description: '',
  event_date: '',
  client_name: '',
  file_info: '',
  reminder_note: '',
  status: 'pending' as 'pending' | 'completed',
}

export default function CalendarPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toasts, addToast, removeToast } = useToast()

  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [fetching, setFetching] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [savedEntityId, setSavedEntityId] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) router.push('/auth')
  }, [user, loading, router])

  useEffect(() => {
    if (user) fetchEvents()
  }, [user])

  async function fetchEvents() {
    setFetching(true)
    const { data } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', user!.id)
      .order('event_date', { ascending: true })
    setEvents(data ?? [])
    setFetching(false)
  }

  function openAdd() {
    setEditingId(null)
    setForm(emptyForm)
    setSavedEntityId(null)
    setModalOpen(true)
  }

  function openEdit(event: CalendarEvent) {
    setEditingId(event.id)
    setForm({
      title: event.title,
      description: event.description ?? '',
      event_date: event.event_date,
      client_name: event.client_name ?? '',
      file_info: event.file_info ?? '',
      reminder_note: event.reminder_note ?? '',
      status: event.status,
    })
    setSavedEntityId(event.id)
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.title.trim()) return addToast('Başlık zorunludur', 'error')
    if (!form.event_date) return addToast('Tarih zorunludur', 'error')
    setSaving(true)

    const payload = {
      user_id: user!.id,
      title: form.title,
      description: form.description || null,
      event_date: form.event_date,
      client_name: form.client_name || null,
      file_info: form.file_info || null,
      reminder_note: form.reminder_note || null,
      status: form.status,
    }

    if (editingId) {
      const { error } = await supabase.from('calendar_events').update(payload).eq('id', editingId)
      if (error) { addToast('Güncellenemedi', 'error'); setSaving(false); return }
      addToast('Güncellendi', 'success')
    } else {
      const { data, error } = await supabase.from('calendar_events').insert(payload).select().single()
      if (error) { addToast('Eklenemedi', 'error'); setSaving(false); return }
      setSavedEntityId(data.id)
      setEditingId(data.id)
    }
    setSaving(false)
    fetchEvents()
  }

  async function handleDelete(id: string) {
    await supabase.from('calendar_events').delete().eq('id', id)
    addToast('Silindi', 'success')
    setDeleteId(null)
    fetchEvents()
  }

  const today = new Date().toISOString().split('T')[0]

  const filtered = events.filter(e =>
    !search ||
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.client_name?.toLowerCase().includes(search.toLowerCase())
  )

  const upcoming = filtered.filter(e => e.event_date >= today && e.status !== 'completed')
  const past = filtered.filter(e => e.event_date < today || e.status === 'completed')

  if (loading || fetching) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </AppLayout>
    )
  }

  const EventCard = ({ event }: { event: CalendarEvent }) => (
    <div className={`card hover:shadow-md transition-shadow ${event.status === 'completed' ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-xl flex-shrink-0 ${
          event.event_date === today ? 'bg-orange-100 text-orange-600' :
          event.event_date > today ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'
        }`}>
          <CalendarIcon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className={`font-semibold text-gray-900 ${event.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
              {event.title}
            </h3>
            {event.event_date === today && <Badge variant="warning">Bugün</Badge>}
            {event.status === 'completed' && <Badge variant="success">Tamamlandı</Badge>}
          </div>
          {event.description && <p className="text-sm text-gray-500 mt-0.5">{event.description}</p>}
          {event.reminder_note && (
            <p className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg mt-1 inline-block">
              💡 {event.reminder_note}
            </p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-400">
            <span>📅 {formatDate(event.event_date)}</span>
            {event.client_name && <span>👤 {event.client_name}</span>}
            {event.file_info && <span>📁 {event.file_info}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => openEdit(event)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={() => setDeleteId(event.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto animate-fadeIn">
        <div className="page-header">
          <div>
            <h1 className="page-title">Takvim & İleri Tarihli İşler</h1>
            <p className="text-sm text-gray-500 mt-0.5">{events.length} kayıt</p>
          </div>
          <button onClick={openAdd} className="btn-primary">
            <Plus className="w-4 h-4" /> Yeni Ekle
          </button>
        </div>

        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="card text-center py-16">
            <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-500">Kayıt bulunamadı</h3>
          </div>
        ) : (
          <div className="space-y-6">
            {upcoming.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Yaklaşan İşler ({upcoming.length})
                </h2>
                <div className="space-y-3">
                  {upcoming.map(e => <EventCard key={e.id} event={e} />)}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Geçmiş / Tamamlananlar ({past.length})
                </h2>
                <div className="space-y-3">
                  {past.map(e => <EventCard key={e.id} event={e} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Düzenle' : 'Yeni İş Ekle'} size="lg">
        <div className="space-y-4">
          <div>
            <label className="label">İş Başlığı *</label>
            <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Başlık..." className="input-field" />
          </div>
          <div>
            <label className="label">Açıklama</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="input-field resize-none" />
          </div>
          <div className="form-row">
            <div>
              <label className="label">Tarih *</label>
              <input type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="label">Müvekkil</label>
              <input type="text" value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} className="input-field" />
            </div>
          </div>
          <div className="form-row">
            <div>
              <label className="label">Dosya Bilgisi</label>
              <input type="text" value={form.file_info} onChange={e => setForm(f => ({ ...f, file_info: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="label">Durum</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as 'pending' | 'completed' }))} className="input-field">
                <option value="pending">Bekliyor</option>
                <option value="completed">Tamamlandı</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Hatırlatma Notu</label>
            <input type="text" value={form.reminder_note} onChange={e => setForm(f => ({ ...f, reminder_note: e.target.value }))} placeholder="Kısa hatırlatma notu..." className="input-field" />
          </div>
          {savedEntityId && (
            <div>
              <label className="label">Dosya Ekleri</label>
              <FileUpload entityType="calendar_event" entityId={savedEntityId} userId={user!.id} />
            </div>
          )}
          <div className="flex justify-between gap-3 pt-2 border-t border-gray-100">
            {!savedEntityId && editingId === null && (
              <p className="text-xs text-gray-400 self-center">Dosya eklemek için önce kaydedin</p>
            )}
            <div className="flex gap-3 ml-auto">
              <button onClick={() => setModalOpen(false)} className="btn-secondary">İptal</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Kaydediliyor...</> : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Sil" size="sm">
        <p className="text-sm text-gray-600 mb-4">Bu kaydı silmek istediğinizden emin misiniz?</p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setDeleteId(null)} className="btn-secondary">İptal</button>
          <button onClick={() => deleteId && handleDelete(deleteId)} className="btn-danger">Sil</button>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </AppLayout>
  )
}
