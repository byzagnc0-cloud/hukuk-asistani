'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Trash2, Edit2, Loader2, Scale, Tag, Filter } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import AppLayout from '@/components/layout/AppLayout'
import Modal from '@/components/ui/Modal'
import FileUpload from '@/components/ui/FileUpload'
import ToastContainer, { useToast } from '@/components/ui/Toast'
import { PrecedentDecision } from '@/lib/types'
import { formatDate } from '@/lib/utils'

const emptyForm = {
  title: '',
  court: '',
  department: '',
  case_number: '',
  decision_number: '',
  decision_date: '',
  subject: '',
  summary: '',
  tags: '',
}

export default function PrecedentsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toasts, addToast, removeToast } = useToast()

  const [items, setItems] = useState<PrecedentDecision[]>([])
  const [fetching, setFetching] = useState(true)
  const [search, setSearch] = useState('')
  const [courtFilter, setCourtFilter] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [savedEntityId, setSavedEntityId] = useState<string | null>(null)
  const [detailItem, setDetailItem] = useState<PrecedentDecision | null>(null)

  useEffect(() => {
    if (!loading && !user) router.push('/auth')
  }, [user, loading, router])

  useEffect(() => {
    if (user) fetchItems()
  }, [user])

  async function fetchItems() {
    setFetching(true)
    const { data } = await supabase
      .from('precedent_decisions')
      .select('*')
      .eq('user_id', user!.id)
      .order('decision_date', { ascending: false, nullsFirst: false })
    setItems(data ?? [])
    setFetching(false)
  }

  function openAdd() {
    setEditingId(null)
    setForm(emptyForm)
    setSavedEntityId(null)
    setModalOpen(true)
  }

  function openEdit(item: PrecedentDecision) {
    setEditingId(item.id)
    setForm({
      title: item.title,
      court: item.court ?? '',
      department: item.department ?? '',
      case_number: item.case_number ?? '',
      decision_number: item.decision_number ?? '',
      decision_date: item.decision_date ?? '',
      subject: item.subject ?? '',
      summary: item.summary ?? '',
      tags: item.tags.join(', '),
    })
    setSavedEntityId(item.id)
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.title.trim()) return addToast('Başlık zorunludur', 'error')
    setSaving(true)

    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
    const payload = {
      user_id: user!.id,
      title: form.title,
      court: form.court || null,
      department: form.department || null,
      case_number: form.case_number || null,
      decision_number: form.decision_number || null,
      decision_date: form.decision_date || null,
      subject: form.subject || null,
      summary: form.summary || null,
      tags,
    }

    if (editingId) {
      const { error } = await supabase.from('precedent_decisions').update(payload).eq('id', editingId)
      if (error) { addToast('Güncellenemedi', 'error'); setSaving(false); return }
      addToast('Güncellendi', 'success')
    } else {
      const { data, error } = await supabase.from('precedent_decisions').insert(payload).select().single()
      if (error) { addToast('Eklenemedi', 'error'); setSaving(false); return }
      setSavedEntityId(data.id)
      setEditingId(data.id)
    }
    setSaving(false)
    fetchItems()
  }

  async function handleDelete(id: string) {
    await supabase.from('precedent_decisions').delete().eq('id', id)
    addToast('Silindi', 'success')
    setDeleteId(null)
    fetchItems()
  }

  const courts = Array.from(new Set(items.map(i => i.court).filter(Boolean))) as string[]

  const filtered = items.filter(item => {
    const matchSearch = !search ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.subject?.toLowerCase().includes(search.toLowerCase()) ||
      item.summary?.toLowerCase().includes(search.toLowerCase()) ||
      item.tags.some(t => t.toLowerCase().includes(search.toLowerCase())) ||
      item.case_number?.toLowerCase().includes(search.toLowerCase()) ||
      item.decision_number?.toLowerCase().includes(search.toLowerCase())
    const matchCourt = !courtFilter || item.court === courtFilter
    return matchSearch && matchCourt
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
            <h1 className="page-title">Emsal Kararlar</h1>
            <p className="text-sm text-gray-500 mt-0.5">{items.length} karar</p>
          </div>
          <button onClick={openAdd} className="btn-primary">
            <Plus className="w-4 h-4" /> Karar Ekle
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Karar başlığı, konu, esas no ara..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10" />
          </div>
          {courts.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <select value={courtFilter} onChange={e => setCourtFilter(e.target.value)} className="input-field w-auto">
                <option value="">Tüm Mahkemeler</option>
                {courts.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="card text-center py-16">
            <Scale className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-500">Karar bulunamadı</h3>
            <p className="text-sm text-gray-400 mt-1">Emsal kararları, içtihatları buraya ekleyin</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(item => (
              <div key={item.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl flex-shrink-0">
                    <Scale className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <button onClick={() => setDetailItem(item)} className="text-left">
                      <h3 className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">{item.title}</h3>
                    </button>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
                      {item.court && <span>🏛️ {item.court}{item.department ? ` / ${item.department}` : ''}</span>}
                      {item.case_number && <span>📋 E: {item.case_number}</span>}
                      {item.decision_number && <span>⚖️ K: {item.decision_number}</span>}
                      {item.decision_date && <span>📅 {formatDate(item.decision_date)}</span>}
                    </div>
                    {item.subject && <p className="text-sm text-gray-600 mt-1 font-medium">{item.subject}</p>}
                    {item.summary && <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{item.summary}</p>}
                    {item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.tags.map(tag => (
                          <span key={tag} className="inline-flex items-center gap-0.5 text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                            <Tag className="w-2.5 h-2.5" /> {tag}
                          </span>
                        ))}
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
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Kararı Düzenle' : 'Emsal Karar Ekle'} size="xl">
        <div className="space-y-4">
          <div>
            <label className="label">Karar Başlığı *</label>
            <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Kararın konusu veya başlığı..." className="input-field" />
          </div>
          <div className="form-row">
            <div>
              <label className="label">Mahkeme</label>
              <input type="text" value={form.court} onChange={e => setForm(f => ({ ...f, court: e.target.value }))} placeholder="Yargıtay, Danıştay..." className="input-field" />
            </div>
            <div>
              <label className="label">Daire</label>
              <input type="text" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="3. Hukuk Dairesi..." className="input-field" />
            </div>
          </div>
          <div className="form-row">
            <div>
              <label className="label">Esas No</label>
              <input type="text" value={form.case_number} onChange={e => setForm(f => ({ ...f, case_number: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="label">Karar No</label>
              <input type="text" value={form.decision_number} onChange={e => setForm(f => ({ ...f, decision_number: e.target.value }))} className="input-field" />
            </div>
          </div>
          <div className="form-row">
            <div>
              <label className="label">Karar Tarihi</label>
              <input type="date" value={form.decision_date} onChange={e => setForm(f => ({ ...f, decision_date: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="label">Konu</label>
              <input type="text" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Tazminat, kira, miras..." className="input-field" />
            </div>
          </div>
          <div>
            <label className="label">Özet</label>
            <textarea value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} rows={4} placeholder="Kararın kısa özeti..." className="input-field resize-none" />
          </div>
          <div>
            <label className="label">Etiketler</label>
            <input type="text" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="tazminat, maddi zarar, manevi zarar..." className="input-field" />
          </div>
          {savedEntityId && (
            <div>
              <label className="label">Dosya Ekleri</label>
              <FileUpload entityType="precedent" entityId={savedEntityId} userId={user!.id} />
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

      {/* Detail Modal */}
      {detailItem && (
        <Modal isOpen={!!detailItem} onClose={() => setDetailItem(null)} title={detailItem.title} size="xl">
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              {detailItem.court && <div><span className="text-gray-500">Mahkeme:</span> <span className="font-medium">{detailItem.court}{detailItem.department ? ` / ${detailItem.department}` : ''}</span></div>}
              {detailItem.case_number && <div><span className="text-gray-500">Esas No:</span> <span className="font-medium">{detailItem.case_number}</span></div>}
              {detailItem.decision_number && <div><span className="text-gray-500">Karar No:</span> <span className="font-medium">{detailItem.decision_number}</span></div>}
              {detailItem.decision_date && <div><span className="text-gray-500">Tarih:</span> <span className="font-medium">{formatDate(detailItem.decision_date)}</span></div>}
              {detailItem.subject && <div><span className="text-gray-500">Konu:</span> <span className="font-medium">{detailItem.subject}</span></div>}
            </div>
            {detailItem.summary && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Özet</h4>
                <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-xl">{detailItem.summary}</p>
              </div>
            )}
            {detailItem.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {detailItem.tags.map(tag => (
                  <span key={tag} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{tag}</span>
                ))}
              </div>
            )}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Dosyalar</h4>
              <FileUpload entityType="precedent" entityId={detailItem.id} userId={user!.id} />
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button onClick={() => { setDetailItem(null); openEdit(detailItem) }} className="btn-secondary">
                <Edit2 className="w-4 h-4" /> Düzenle
              </button>
              <button onClick={() => setDetailItem(null)} className="btn-primary">Kapat</button>
            </div>
          </div>
        </Modal>
      )}

      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Sil" size="sm">
        <p className="text-sm text-gray-600 mb-4">Bu kararı silmek istediğinizden emin misiniz?</p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setDeleteId(null)} className="btn-secondary">İptal</button>
          <button onClick={() => deleteId && handleDelete(deleteId)} className="btn-danger">Sil</button>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </AppLayout>
  )
}
