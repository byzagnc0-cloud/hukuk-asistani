'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Trash2, Edit2, Loader2, Gavel, ChevronDown, ChevronUp, CheckCircle, Circle, Filter } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import AppLayout from '@/components/layout/AppLayout'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import FileUpload from '@/components/ui/FileUpload'
import ToastContainer, { useToast } from '@/components/ui/Toast'
import { EnforcementCase, EnforcementQuery, EnforcementType, QueryType, ENFORCEMENT_TYPE_LABELS, QUERY_TYPE_LABELS } from '@/lib/types'
import { formatDate } from '@/lib/utils'

const emptyForm = {
  client_name: '',
  debtor_name: '',
  enforcement_file_number: '',
  opened_date: '',
  notification_sent_date: '',
  notification_received_date: '',
  finalization_date: '',
  notification_number: '',
  status: 'active',
  enforcement_type: '' as EnforcementType | '',
  query_done: false,
  wanted_persons: '',
  notes: '',
}

const ALL_QUERY_TYPES: QueryType[] = ['arac', 'sgk', 'tapu', 'banka', 'icra', 'posta_ceki']

export default function EnforcementPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toasts, addToast, removeToast } = useToast()

  const [items, setItems] = useState<EnforcementCase[]>([])
  const [queries, setQueries] = useState<Record<string, EnforcementQuery[]>>({})
  const [fetching, setFetching] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

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
    if (user) fetchAll()
  }, [user])

  async function fetchAll() {
    setFetching(true)
    const [{ data: enfs }, { data: qs }] = await Promise.all([
      supabase.from('enforcement_cases').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
      supabase.from('enforcement_queries').select('*').eq('user_id', user!.id),
    ])

    setItems(enfs ?? [])

    const queryMap: Record<string, EnforcementQuery[]> = {}
    qs?.forEach(q => {
      if (!queryMap[q.enforcement_case_id]) queryMap[q.enforcement_case_id] = []
      queryMap[q.enforcement_case_id].push(q)
    })
    setQueries(queryMap)
    setFetching(false)
  }

  function openAdd() {
    setEditingId(null)
    setForm(emptyForm)
    setSavedEntityId(null)
    setModalOpen(true)
  }

  function openEdit(item: EnforcementCase) {
    setEditingId(item.id)
    setForm({
      client_name: item.client_name,
      debtor_name: item.debtor_name ?? '',
      enforcement_file_number: item.enforcement_file_number ?? '',
      opened_date: item.opened_date ?? '',
      notification_sent_date: item.notification_sent_date ?? '',
      notification_received_date: item.notification_received_date ?? '',
      finalization_date: item.finalization_date ?? '',
      notification_number: item.notification_number ?? '',
      status: item.status,
      enforcement_type: (item.enforcement_type ?? '') as EnforcementType | '',
      query_done: item.query_done,
      wanted_persons: item.wanted_persons ?? '',
      notes: item.notes ?? '',
    })
    setSavedEntityId(item.id)
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.client_name.trim()) return addToast('Müvekkil adı zorunludur', 'error')
    setSaving(true)

    const payload = {
      user_id: user!.id,
      client_name: form.client_name,
      debtor_name: form.debtor_name || null,
      enforcement_file_number: form.enforcement_file_number || null,
      opened_date: form.opened_date || null,
      notification_sent_date: form.notification_sent_date || null,
      notification_received_date: form.notification_received_date || null,
      finalization_date: form.finalization_date || null,
      notification_number: form.notification_number || null,
      status: form.status,
      enforcement_type: form.enforcement_type || null,
      query_done: form.query_done,
      wanted_persons: form.wanted_persons || null,
      notes: form.notes || null,
    }

    if (editingId) {
      const { error } = await supabase.from('enforcement_cases').update(payload).eq('id', editingId)
      if (error) { addToast('Güncellenemedi', 'error'); setSaving(false); return }
      addToast('Güncellendi', 'success')
    } else {
      const { data, error } = await supabase.from('enforcement_cases').insert(payload).select().single()
      if (error) { addToast('Eklenemedi', 'error'); setSaving(false); return }
      setSavedEntityId(data.id)
      setEditingId(data.id)
      // Create default queries
      const defaultQueries = ALL_QUERY_TYPES.map(qt => ({
        enforcement_case_id: data.id,
        user_id: user!.id,
        query_type: qt,
        is_done: false,
      }))
      await supabase.from('enforcement_queries').insert(defaultQueries)
    }
    setSaving(false)
    fetchAll()
  }

  async function handleDelete(id: string) {
    await supabase.from('enforcement_cases').delete().eq('id', id)
    addToast('Silindi', 'success')
    setDeleteId(null)
    fetchAll()
  }

  async function toggleQuery(query: EnforcementQuery) {
    const isDone = !query.is_done
    await supabase.from('enforcement_queries').update({
      is_done: isDone,
      done_date: isDone ? new Date().toISOString().split('T')[0] : null,
    }).eq('id', query.id)
    fetchAll()
  }

  async function updateQueryNote(queryId: string, note: string) {
    await supabase.from('enforcement_queries').update({ result_note: note }).eq('id', queryId)
    fetchAll()
  }

  async function updateQueryFound(query: EnforcementQuery, value: string) {
    const found = value === '' ? null : value === 'true'
    await supabase.from('enforcement_queries').update({
      found,
      is_done: true,
      done_date: query.done_date ?? new Date().toISOString().split('T')[0],
    }).eq('id', query.id)
    fetchAll()
  }

  const today = new Date().toISOString().split('T')[0]

  const filtered = items.filter(item => {
    const matchSearch = !search ||
      item.client_name.toLowerCase().includes(search.toLowerCase()) ||
      item.debtor_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.enforcement_file_number?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || item.status === statusFilter
    return matchSearch && matchStatus
  })

  const getStatusBadge = (item: EnforcementCase) => {
    if (item.status === 'closed') return <Badge variant="default">Kapalı</Badge>
    if (item.finalization_date && item.finalization_date <= today) return <Badge variant="success">Kesinleşti</Badge>
    return <Badge variant="warning">Aktif</Badge>
  }

  const isFinalized = (item: EnforcementCase) =>
    item.finalization_date && item.finalization_date <= today

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
            <h1 className="page-title">Açtığım İcralar</h1>
            <p className="text-sm text-gray-500 mt-0.5">{items.length} icra takibi</p>
          </div>
          <button onClick={openAdd} className="btn-primary">
            <Plus className="w-4 h-4" /> Yeni İcra
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Müvekkil, borçlu veya dosya no ara..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field w-auto">
              <option value="all">Tümü</option>
              <option value="active">Aktif</option>
              <option value="closed">Kapalı</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="card text-center py-16">
            <Gavel className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-500">İcra takibi bulunamadı</h3>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(item => {
              const isExpanded = expandedId === item.id
              const itemQueries = queries[item.id] ?? []
              const finalized = isFinalized(item)

              return (
                <div key={item.id} className={`card ${finalized && item.status !== 'closed' ? 'border-green-200 bg-green-50/30' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-xl flex-shrink-0 ${finalized ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      <Gavel className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{item.client_name}</h3>
                        {getStatusBadge(item)}
                        {item.enforcement_type && (
                          <Badge variant="info">{ENFORCEMENT_TYPE_LABELS[item.enforcement_type]}</Badge>
                        )}
                        {finalized && item.status !== 'closed' && (
                          <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full font-medium animate-pulse">
                            ✓ Talep atabilirsiniz!
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                        {item.debtor_name && <span>👤 Borçlu: {item.debtor_name}</span>}
                        {item.enforcement_file_number && <span>📋 {item.enforcement_file_number}</span>}
                        {item.opened_date && <span>📅 Açılma: {formatDate(item.opened_date)}</span>}
                        {item.finalization_date && (
                          <span className={finalized ? 'text-green-600 font-medium' : ''}>
                            ⏱️ Kesinleşme: {formatDate(item.finalization_date)}
                          </span>
                        )}
                      </div>
                      {item.notes && <p className="text-sm text-gray-500 mt-1">{item.notes}</p>}
                      {item.wanted_persons && <p className="text-xs text-red-500 mt-1">🔍 Aranan: {item.wanted_persons}</p>}
                      {itemQueries.length > 0 && (
                        <div className="flex items-center gap-1 mt-2">
                          <span className="text-xs text-gray-400">{itemQueries.filter(q => q.is_done).length}/{itemQueries.length} sorgu tamamlandı</span>
                          <div className="flex gap-0.5 ml-1">
                            {itemQueries.map(q => (
                              <div key={q.id} className={`w-2 h-2 rounded-full ${q.is_done ? 'bg-green-400' : 'bg-gray-200'}`} title={QUERY_TYPE_LABELS[q.query_type]} />
                            ))}
                          </div>
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
                      <button onClick={() => setExpandedId(isExpanded ? null : item.id)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                      {/* Date details */}
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {[
                          { label: 'Açılma Tarihi', value: item.opened_date },
                          { label: 'Tebliğe Çıkma', value: item.notification_sent_date },
                          { label: 'Tebliğ Edildiği Tarih', value: item.notification_received_date },
                          { label: 'Kesinleşeceği Tarih', value: item.finalization_date },
                          { label: 'Tebligat No', value: item.notification_number, isText: true },
                        ].map(({ label, value, isText }) => value ? (
                          <div key={label} className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                            <p className="text-sm font-medium text-gray-800">{isText ? value : formatDate(value)}</p>
                          </div>
                        ) : null)}
                      </div>

                      {/* Queries */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Sorgu İşlemleri</h4>
                        <div className="grid sm:grid-cols-2 gap-2">
                          {itemQueries.length === 0 ? (
                            <p className="text-xs text-gray-400 col-span-2">Henüz sorgu kaydı oluşturulmadı</p>
                          ) : (
                            itemQueries.map(q => (
                              <div key={q.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${q.is_done ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                                <button onClick={() => toggleQuery(q)} className="mt-0.5 flex-shrink-0">
                                  {q.is_done
                                    ? <CheckCircle className="w-5 h-5 text-green-500" />
                                    : <Circle className="w-5 h-5 text-gray-300" />}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className={`text-sm font-medium ${q.is_done ? 'text-green-700' : 'text-gray-700'}`}>
                                      {QUERY_TYPE_LABELS[q.query_type]}
                                    </p>
                                    <select
                                      value={q.found === null || q.found === undefined ? '' : String(q.found)}
                                      onChange={e => updateQueryFound(q, e.target.value)}
                                      className={`text-xs rounded-lg px-1.5 py-1 border focus:outline-none focus:ring-1 focus:ring-blue-400 flex-shrink-0 ${
                                        q.found === true ? 'bg-green-50 border-green-200 text-green-700' :
                                        q.found === false ? 'bg-red-50 border-red-200 text-red-700' :
                                        'bg-white border-gray-200 text-gray-500'
                                      }`}
                                    >
                                      <option value="">Sonuç?</option>
                                      <option value="true">Var</option>
                                      <option value="false">Yok</option>
                                    </select>
                                  </div>
                                  {q.done_date && <p className="text-xs text-gray-400">{formatDate(q.done_date)}</p>}
                                  <input
                                    type="text"
                                    placeholder="Sonuç/not..."
                                    defaultValue={q.result_note ?? ''}
                                    onBlur={e => updateQueryNote(q.id, e.target.value)}
                                    className="mt-1 w-full text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                                  />
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Files */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Dosya Ekleri</h4>
                        <FileUpload entityType="enforcement" entityId={item.id} userId={user!.id} />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'İcra Takibini Düzenle' : 'Yeni İcra Takibi'} size="xl">
        <div className="space-y-4">
          <div className="form-row">
            <div>
              <label className="label">Müvekkil *</label>
              <input type="text" value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="label">Borçlu</label>
              <input type="text" value={form.debtor_name} onChange={e => setForm(f => ({ ...f, debtor_name: e.target.value }))} className="input-field" />
            </div>
          </div>
          <div className="form-row">
            <div>
              <label className="label">İcra Dosya Numarası</label>
              <input type="text" value={form.enforcement_file_number} onChange={e => setForm(f => ({ ...f, enforcement_file_number: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="label">Tebligat Numarası</label>
              <input type="text" value={form.notification_number} onChange={e => setForm(f => ({ ...f, notification_number: e.target.value }))} className="input-field" />
            </div>
          </div>
          <div className="form-row">
            <div>
              <label className="label">Takip Şekli</label>
              <select value={form.enforcement_type} onChange={e => setForm(f => ({ ...f, enforcement_type: e.target.value as EnforcementType | '' }))} className="input-field">
                <option value="">Seçiniz</option>
                <option value="ilamsiz">İlamsız</option>
                <option value="ilamli">İlamlı</option>
                <option value="tahliye">Tahliye Talepli</option>
              </select>
            </div>
            <div>
              <label className="label">Dosya Durumu</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="input-field">
                <option value="active">Aktif</option>
                <option value="closed">Kapalı</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Açılma Tarihi</label>
              <input type="date" value={form.opened_date} onChange={e => setForm(f => ({ ...f, opened_date: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="label">Tebliğe Çıkma Tarihi</label>
              <input type="date" value={form.notification_sent_date} onChange={e => setForm(f => ({ ...f, notification_sent_date: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="label">Tebliğ Edildiği Tarih</label>
              <input type="date" value={form.notification_received_date} onChange={e => setForm(f => ({ ...f, notification_received_date: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="label">Kesinleşeceği Tarih</label>
              <input type="date" value={form.finalization_date} onChange={e => setForm(f => ({ ...f, finalization_date: e.target.value }))} className="input-field" />
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <input type="checkbox" id="query_done" checked={form.query_done} onChange={e => setForm(f => ({ ...f, query_done: e.target.checked }))} className="w-4 h-4 text-blue-600 rounded" />
            <label htmlFor="query_done" className="text-sm font-medium text-gray-700">Sorgu yapıldı mı?</label>
          </div>
          {form.query_done && (
            <div>
              <label className="label">Aranan Kişiler</label>
              <textarea value={form.wanted_persons} onChange={e => setForm(f => ({ ...f, wanted_persons: e.target.value }))} rows={2} placeholder="Aranan kişi adları..." className="input-field resize-none" />
            </div>
          )}
          <div>
            <label className="label">Notlar</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} className="input-field resize-none" />
          </div>
          {savedEntityId && (
            <div>
              <label className="label">Dosya Ekleri</label>
              <FileUpload entityType="enforcement" entityId={savedEntityId} userId={user!.id} />
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
        <p className="text-sm text-gray-600 mb-4">Bu icra takibini silmek istediğinizden emin misiniz?</p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setDeleteId(null)} className="btn-secondary">İptal</button>
          <button onClick={() => deleteId && handleDelete(deleteId)} className="btn-danger">Sil</button>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </AppLayout>
  )
}
