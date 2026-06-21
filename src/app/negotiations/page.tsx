'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Trash2, Edit2, Loader2, Users, Filter } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import AppLayout from '@/components/layout/AppLayout'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import FileUpload from '@/components/ui/FileUpload'
import ToastContainer, { useToast } from '@/components/ui/Toast'
import { Negotiation, NegotiationStatus, NEGOTIATION_STATUS_LABELS } from '@/lib/types'
import { formatDate } from '@/lib/utils'

const emptyForm = {
  client_name: '',
  opposing_party: '',
  summary: '',
  offer_made: '',
  counter_offer: '',
  meeting_date: '',
  follow_up_date: '',
  status: 'client_consult' as NegotiationStatus,
}

const STATUS_BADGE_VARIANT: Record<NegotiationStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'> = {
  client_consult: 'info',
  offer_made: 'purple',
  offer_rejected: 'danger',
  awaiting_new_offer: 'warning',
  agreement_reached: 'success',
  call_again: 'warning',
  awaiting_response: 'info',
  closed: 'default',
}

export default function NegotiationsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toasts, addToast, removeToast } = useToast()

  const [items, setItems] = useState<Negotiation[]>([])
  const [fetching, setFetching] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<NegotiationStatus | 'all'>('all')

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
    if (user) fetchItems()
  }, [user])

  async function fetchItems() {
    setFetching(true)
    const { data } = await supabase
      .from('negotiations')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
    setItems(data ?? [])
    setFetching(false)
  }

  function openAdd() {
    setEditingId(null)
    setForm(emptyForm)
    setSavedEntityId(null)
    setModalOpen(true)
  }

  function openEdit(item: Negotiation) {
    setEditingId(item.id)
    setForm({
      client_name: item.client_name ?? '',
      opposing_party: item.opposing_party ?? '',
      summary: item.summary ?? '',
      offer_made: item.offer_made ?? '',
      counter_offer: item.counter_offer ?? '',
      meeting_date: item.meeting_date ?? '',
      follow_up_date: item.follow_up_date ?? '',
      status: item.status,
    })
    setSavedEntityId(item.id)
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.client_name.trim() && !form.opposing_party.trim()) {
      return addToast('Müvekkil veya karşı taraf adı giriniz', 'error')
    }
    setSaving(true)

    const payload = {
      user_id: user!.id,
      client_name: form.client_name || null,
      opposing_party: form.opposing_party || null,
      summary: form.summary || null,
      offer_made: form.offer_made || null,
      counter_offer: form.counter_offer || null,
      meeting_date: form.meeting_date || null,
      follow_up_date: form.follow_up_date || null,
      status: form.status,
    }

    if (editingId) {
      const { error } = await supabase.from('negotiations').update(payload).eq('id', editingId)
      if (error) { addToast('Güncellenemedi', 'error'); setSaving(false); return }
      addToast('Güncellendi', 'success')
    } else {
      const { data, error } = await supabase.from('negotiations').insert(payload).select().single()
      if (error) { addToast('Eklenemedi', 'error'); setSaving(false); return }
      setSavedEntityId(data.id)
      setEditingId(data.id)
      addToast('Eklendi', 'success')
    }
    setSaving(false)
    fetchItems()
  }

  async function handleDelete(id: string) {
    await supabase.from('negotiations').delete().eq('id', id)
    addToast('Silindi', 'success')
    setDeleteId(null)
    fetchItems()
  }

  const filtered = items.filter(item => {
    const matchSearch = !search ||
      item.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.opposing_party?.toLowerCase().includes(search.toLowerCase()) ||
      item.summary?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || item.status === statusFilter
    return matchSearch && matchStatus
  })

  if (loading || fetching) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto animate-fadeIn">
        <div className="page-header">
          <div>
            <h1 className="page-title">Görüşme ve Teklif Takip</h1>
            <p className="text-sm text-gray-500 mt-0.5">{items.length} görüşme kaydı</p>
          </div>
          <button onClick={openAdd} className="btn-primary">
            <Plus className="w-4 h-4" /> Yeni Görüşme
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Müvekkil, karşı taraf veya özet ara..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as NegotiationStatus | 'all')} className="input-field w-auto">
              <option value="all">Tüm Durumlar</option>
              {Object.entries(NEGOTIATION_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="card text-center py-16">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-500">Görüşme kaydı bulunamadı</h3>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(item => (
              <div key={item.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-pink-100 text-pink-600 rounded-xl flex-shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{item.client_name || item.opposing_party || 'Görüşme'}</h3>
                      <Badge variant={STATUS_BADGE_VARIANT[item.status]}>{NEGOTIATION_STATUS_LABELS[item.status]}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      {item.client_name && <span>👤 Müvekkil: {item.client_name}</span>}
                      {item.opposing_party && <span>⚖️ Karşı taraf: {item.opposing_party}</span>}
                      {item.meeting_date && <span>📅 Görüşme: {formatDate(item.meeting_date)}</span>}
                      {item.follow_up_date && <span className="text-pink-600 font-medium">🔔 Tekrar arama: {formatDate(item.follow_up_date)}</span>}
                    </div>
                    {item.summary && <p className="text-sm text-gray-500 mt-1">{item.summary}</p>}
                    {(item.offer_made || item.counter_offer) && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-400">
                        {item.offer_made && <span>Sunulan teklif: {item.offer_made}</span>}
                        {item.counter_offer && <span>Karşı teklif: {item.counter_offer}</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(item)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteId(item.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Görüşmeyi Düzenle' : 'Yeni Görüşme Ekle'} size="lg">
        <div className="space-y-4">
          <div className="form-row">
            <div>
              <label className="label">Müvekkil</label>
              <input type="text" value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="label">Karşı Taraf</label>
              <input type="text" value={form.opposing_party} onChange={e => setForm(f => ({ ...f, opposing_party: e.target.value }))} className="input-field" />
            </div>
          </div>
          <div>
            <label className="label">Görüşme Özeti</label>
            <textarea value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} rows={3} className="input-field resize-none" />
          </div>
          <div className="form-row">
            <div>
              <label className="label">Sunulan Teklif</label>
              <input type="text" value={form.offer_made} onChange={e => setForm(f => ({ ...f, offer_made: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="label">Gelen Karşı Teklif</label>
              <input type="text" value={form.counter_offer} onChange={e => setForm(f => ({ ...f, counter_offer: e.target.value }))} className="input-field" />
            </div>
          </div>
          <div className="form-row">
            <div>
              <label className="label">Görüşme Tarihi</label>
              <input type="date" value={form.meeting_date} onChange={e => setForm(f => ({ ...f, meeting_date: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="label">Tekrar Aranacak Tarih</label>
              <input type="date" value={form.follow_up_date} onChange={e => setForm(f => ({ ...f, follow_up_date: e.target.value }))} className="input-field" />
            </div>
          </div>
          <div>
            <label className="label">Durum</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as NegotiationStatus }))} className="input-field">
              {Object.entries(NEGOTIATION_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          {savedEntityId && (
            <div>
              <label className="label">Dosya Ekleri (PDF, Word, Excel, UDF)</label>
              <FileUpload entityType="negotiation" entityId={savedEntityId} userId={user!.id} />
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
        <p className="text-sm text-gray-600 mb-4">Bu görüşme kaydını silmek istediğinizden emin misiniz?</p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setDeleteId(null)} className="btn-secondary">İptal</button>
          <button onClick={() => deleteId && handleDelete(deleteId)} className="btn-danger">Sil</button>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </AppLayout>
  )
}
