'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Trash2, Edit2, Loader2, FileText, Tag, Filter } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import AppLayout from '@/components/layout/AppLayout'
import Modal from '@/components/ui/Modal'
import FileUpload from '@/components/ui/FileUpload'
import ToastContainer, { useToast } from '@/components/ui/Toast'
import { PetitionTemplate, PETITION_CATEGORIES } from '@/lib/types'

const emptyForm = {
  title: '',
  category: '',
  description: '',
  content: '',
  tags: '',
}

export default function PetitionsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toasts, addToast, removeToast } = useToast()

  const [items, setItems] = useState<PetitionTemplate[]>([])
  const [fetching, setFetching] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [savedEntityId, setSavedEntityId] = useState<string | null>(null)
  const [detailItem, setDetailItem] = useState<PetitionTemplate | null>(null)
  const [useCustomCategory, setUseCustomCategory] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.push('/auth')
  }, [user, loading, router])

  useEffect(() => {
    if (user) fetchItems()
  }, [user])

  async function fetchItems() {
    setFetching(true)
    const { data } = await supabase
      .from('petition_templates')
      .select('*')
      .eq('user_id', user!.id)
      .order('category')
      .order('title')
    setItems(data ?? [])
    setFetching(false)
  }

  function openAdd(category?: string) {
    setEditingId(null)
    setForm({ ...emptyForm, category: category ?? '' })
    setUseCustomCategory(false)
    setSavedEntityId(null)
    setModalOpen(true)
  }

  function openEdit(item: PetitionTemplate) {
    setEditingId(item.id)
    setForm({
      title: item.title,
      category: item.category ?? 'Diğer',
      description: item.description ?? '',
      content: item.content ?? '',
      tags: item.tags.join(', '),
    })
    setUseCustomCategory(!PETITION_CATEGORIES.includes(item.category ?? 'Diğer'))
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
      category: form.category || 'Diğer',
      description: form.description || null,
      content: form.content || null,
      tags,
    }

    if (editingId) {
      const { error } = await supabase.from('petition_templates').update(payload).eq('id', editingId)
      if (error) { addToast('Güncellenemedi', 'error'); setSaving(false); return }
      addToast('Güncellendi', 'success')
    } else {
      const { data, error } = await supabase.from('petition_templates').insert(payload).select().single()
      if (error) { addToast('Eklenemedi', 'error'); setSaving(false); return }
      setSavedEntityId(data.id)
      setEditingId(data.id)
    }
    setSaving(false)
    fetchItems()
  }

  async function handleDelete(id: string) {
    await supabase.from('petition_templates').delete().eq('id', id)
    addToast('Silindi', 'success')
    setDeleteId(null)
    fetchItems()
  }

  const filtered = items.filter(item => {
    const matchSearch = !search ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.category?.toLowerCase().includes(search.toLowerCase()) ||
      item.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
    const matchCat = !categoryFilter || item.category === categoryFilter
    return matchSearch && matchCat
  })

  // Group by category
  const groupedByCategory = PETITION_CATEGORIES.reduce((acc, cat) => {
    const catItems = filtered.filter(i => i.category === cat)
    if (catItems.length > 0 || (!categoryFilter && !search)) {
      acc[cat] = catItems
    }
    return acc
  }, {} as Record<string, PetitionTemplate[]>)

  // Also include non-standard categories
  const nonStandardCats = Array.from(new Set(filtered.filter(i => !PETITION_CATEGORIES.includes(i.category ?? 'Diğer')).map(i => i.category ?? 'Diğer')))
  nonStandardCats.forEach(cat => {
    groupedByCategory[cat] = filtered.filter(i => i.category === cat)
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
            <h1 className="page-title">Örnek Dilekçeler</h1>
            <p className="text-sm text-gray-500 mt-0.5">{items.length} dilekçe şablonu</p>
          </div>
          <button onClick={() => openAdd()} className="btn-primary">
            <Plus className="w-4 h-4" /> Dilekçe Ekle
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Dilekçe ara..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="input-field w-auto">
              <option value="">Tüm Kategoriler</option>
              {PETITION_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Category-grouped view */}
        <div className="space-y-4">
          {Object.entries(groupedByCategory).map(([category, catItems]) => (
            <div key={category} className="card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <h3 className="font-semibold text-gray-900 text-sm">{category}</h3>
                  {catItems.length > 0 && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{catItems.length}</span>
                  )}
                </div>
                <button onClick={() => openAdd(category)} className="text-xs btn-secondary py-1.5">
                  <Plus className="w-3.5 h-3.5" /> Ekle
                </button>
              </div>

              {catItems.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Bu kategori için henüz dilekçe eklenmedi</p>
              ) : (
                <div className="space-y-2">
                  {catItems.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group">
                      <button onClick={() => setDetailItem(item)} className="flex-1 text-left">
                        <p className="text-sm font-medium text-gray-800 group-hover:text-blue-600 transition-colors">{item.title}</p>
                        {item.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.description}</p>}
                        {item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.tags.map(tag => (
                              <span key={tag} className="text-xs bg-white border border-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full">{tag}</span>
                            ))}
                          </div>
                        )}
                      </button>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(item)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteId(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {Object.keys(groupedByCategory).length === 0 && (
          <div className="card text-center py-16">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-500">Dilekçe bulunamadı</h3>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Dilekçeyi Düzenle' : 'Dilekçe Şablonu Ekle'} size="xl">
        <div className="space-y-4">
          <div className="form-row">
            <div>
              <label className="label">Başlık *</label>
              <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Dilekçe başlığı..." className="input-field" />
            </div>
            <div>
              <label className="label">Kategori</label>
              {useCustomCategory ? (
                <input
                  type="text"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  placeholder="Özel kategori adı..."
                  className="input-field"
                />
              ) : (
                <select
                  value={form.category}
                  onChange={e => {
                    if (e.target.value === '__custom__') { setUseCustomCategory(true); setForm(f => ({ ...f, category: '' })) }
                    else setForm(f => ({ ...f, category: e.target.value }))
                  }}
                  className="input-field"
                >
                  <option value="">Kategorisiz (Diğer)</option>
                  {PETITION_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="__custom__">+ Özel kategori ekle...</option>
                </select>
              )}
              {useCustomCategory && (
                <button type="button" onClick={() => { setUseCustomCategory(false); setForm(f => ({ ...f, category: '' })) }} className="text-xs text-blue-500 hover:text-blue-700 mt-1">
                  Listeden seç
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="label">Açıklama</label>
            <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Kısa açıklama..." className="input-field" />
          </div>
          <div>
            <label className="label">Dilekçe Metni</label>
            <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={10} placeholder="Dilekçe içeriği..." className="input-field resize-none font-mono text-sm" />
          </div>
          <div>
            <label className="label">Etiketler</label>
            <input type="text" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="tazminat, trafik, kaza..." className="input-field" />
          </div>
          {savedEntityId && (
            <div>
              <label className="label">Dosya Ekleri</label>
              <FileUpload entityType="petition" entityId={savedEntityId} userId={user!.id} />
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button onClick={() => setModalOpen(false)} className="btn-secondary">İptal</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Kaydediliyor...</> : 'Kaydet'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      {detailItem && (
        <Modal isOpen={!!detailItem} onClose={() => setDetailItem(null)} title={detailItem.title} size="xl">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">{detailItem.category}</span>
              {detailItem.tags.map(tag => (
                <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>
            {detailItem.description && (
              <p className="text-sm text-gray-600">{detailItem.description}</p>
            )}
            {detailItem.content && (
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Dilekçe Metni</h4>
                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">{detailItem.content}</pre>
              </div>
            )}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Dosyalar</h4>
              <FileUpload entityType="petition" entityId={detailItem.id} userId={user!.id} />
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
        <p className="text-sm text-gray-600 mb-4">Bu dilekçeyi silmek istediğinizden emin misiniz?</p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setDeleteId(null)} className="btn-secondary">İptal</button>
          <button onClick={() => deleteId && handleDelete(deleteId)} className="btn-danger">Sil</button>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </AppLayout>
  )
}
