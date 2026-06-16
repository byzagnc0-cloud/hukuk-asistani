'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Trash2, Edit2, Loader2, BookOpen, Tag, FolderPlus } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import AppLayout from '@/components/layout/AppLayout'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import FileUpload from '@/components/ui/FileUpload'
import ToastContainer, { useToast } from '@/components/ui/Toast'
import { LibraryItem, LibraryCategory, DEFAULT_LIBRARY_CATEGORIES } from '@/lib/types'

const emptyForm = {
  title: '',
  description: '',
  content: '',
  category_id: '',
  tags: '',
}

export default function LibraryPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toasts, addToast, removeToast } = useToast()

  const [categories, setCategories] = useState<LibraryCategory[]>([])
  const [items, setItems] = useState<LibraryItem[]>([])
  const [fetching, setFetching] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [savedEntityId, setSavedEntityId] = useState<string | null>(null)

  const [catModalOpen, setCatModalOpen] = useState(false)
  const [catName, setCatName] = useState('')
  const [catDesc, setCatDesc] = useState('')

  useEffect(() => {
    if (!loading && !user) router.push('/auth')
  }, [user, loading, router])

  useEffect(() => {
    if (user) fetchAll()
  }, [user])

  async function fetchAll() {
    setFetching(true)
    const [{ data: cats }, { data: its }] = await Promise.all([
      supabase.from('library_categories').select('*').eq('user_id', user!.id).order('sort_order').order('name'),
      supabase.from('library_items').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
    ])
    setCategories(cats ?? [])
    setItems(its ?? [])
    setFetching(false)
  }

  async function ensureDefaultCategories(existingCats: LibraryCategory[]) {
    if (existingCats.length > 0) return
    const defaults = DEFAULT_LIBRARY_CATEGORIES.map((name, i) => ({
      user_id: user!.id,
      name,
      sort_order: i,
    }))
    await supabase.from('library_categories').insert(defaults)
    fetchAll()
  }

  useEffect(() => {
    if (!fetching && categories.length === 0 && user) {
      ensureDefaultCategories(categories)
    }
  }, [fetching, categories, user])

  function openAdd() {
    setEditingId(null)
    setForm({ ...emptyForm, category_id: selectedCategory ?? '' })
    setSavedEntityId(null)
    setModalOpen(true)
  }

  function openEdit(item: LibraryItem) {
    setEditingId(item.id)
    setForm({
      title: item.title,
      description: item.description ?? '',
      content: item.content ?? '',
      category_id: item.category_id ?? '',
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
      description: form.description || null,
      content: form.content || null,
      category_id: form.category_id || null,
      tags,
    }

    if (editingId) {
      const { error } = await supabase.from('library_items').update(payload).eq('id', editingId)
      if (error) { addToast('Güncellenemedi', 'error'); setSaving(false); return }
      addToast('Güncellendi', 'success')
    } else {
      const { data, error } = await supabase.from('library_items').insert(payload).select().single()
      if (error) { addToast('Eklenemedi', 'error'); setSaving(false); return }
      setSavedEntityId(data.id)
      setEditingId(data.id)
    }
    setSaving(false)
    fetchAll()
  }

  async function handleDelete(id: string) {
    await supabase.from('library_items').delete().eq('id', id)
    addToast('Silindi', 'success')
    setDeleteId(null)
    fetchAll()
  }

  async function addCategory() {
    if (!catName.trim()) return
    await supabase.from('library_categories').insert({
      user_id: user!.id,
      name: catName,
      description: catDesc || null,
      sort_order: categories.length,
    })
    setCatName('')
    setCatDesc('')
    setCatModalOpen(false)
    addToast('Kategori eklendi', 'success')
    fetchAll()
  }

  const filtered = items.filter(item => {
    const matchCat = !selectedCategory || item.category_id === selectedCategory
    const matchSearch = !search ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
    return matchCat && matchSearch
  })

  const getCategoryName = (id?: string | null) => categories.find(c => c.id === id)?.name ?? 'Kategorisiz'

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
            <h1 className="page-title">Kütüphane</h1>
            <p className="text-sm text-gray-500 mt-0.5">{items.length} kayıt</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setCatModalOpen(true)} className="btn-secondary">
              <FolderPlus className="w-4 h-4" /> Kategori
            </button>
            <button onClick={openAdd} className="btn-primary">
              <Plus className="w-4 h-4" /> Yeni Ekle
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              !selectedCategory ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Tümü ({items.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                selectedCategory === cat.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {cat.name} ({items.filter(i => i.category_id === cat.id).length})
            </button>
          ))}
        </div>

        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Başlık veya etiket ara..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10" />
        </div>

        {filtered.length === 0 ? (
          <div className="card text-center py-16">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-500">Kayıt bulunamadı</h3>
            <p className="text-sm text-gray-400 mt-1">PDF, Word, Excel dosyaları veya metin notları ekleyin</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {filtered.map(item => (
              <div key={item.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-teal-100 text-teal-600 rounded-xl flex-shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm">{item.title}</h3>
                    <p className="text-xs text-blue-600 mt-0.5">{getCategoryName(item.category_id)}</p>
                    {item.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>}
                    {item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.tags.map(tag => (
                          <span key={tag} className="inline-flex items-center gap-0.5 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            <Tag className="w-2.5 h-2.5" /> {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => openEdit(item)} className="text-xs btn-secondary py-1">
                        <Edit2 className="w-3 h-3" /> Düzenle
                      </button>
                      <button onClick={() => setDeleteId(item.id)} className="text-xs text-red-500 hover:text-red-700 py-1 px-2">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Item Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Düzenle' : 'Kütüphaneye Ekle'} size="xl">
        <div className="space-y-4">
          <div>
            <label className="label">Başlık *</label>
            <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Kitap, makale veya konu adı..." className="input-field" />
          </div>
          <div className="form-row">
            <div>
              <label className="label">Kategori</label>
              <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} className="input-field">
                <option value="">Kategori seçin...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Etiketler</label>
              <input type="text" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="etiket1, etiket2, ..." className="input-field" />
            </div>
          </div>
          <div>
            <label className="label">Açıklama</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="input-field resize-none" />
          </div>
          <div>
            <label className="label">İçerik / Notlar</label>
            <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={6} placeholder="Metin içeriği, önemli notlar..." className="input-field resize-none font-mono text-sm" />
          </div>
          {savedEntityId && (
            <div>
              <label className="label">Dosya Ekleri (PDF, Word, Excel)</label>
              <FileUpload entityType="library_item" entityId={savedEntityId} userId={user!.id} />
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

      {/* Category Modal */}
      <Modal isOpen={catModalOpen} onClose={() => setCatModalOpen(false)} title="Yeni Kategori" size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Kategori Adı *</label>
            <input type="text" value={catName} onChange={e => setCatName(e.target.value)} placeholder="Örn: Yargıtay Kararları" className="input-field" />
          </div>
          <div>
            <label className="label">Açıklama</label>
            <input type="text" value={catDesc} onChange={e => setCatDesc(e.target.value)} placeholder="Kısa açıklama..." className="input-field" />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button onClick={() => setCatModalOpen(false)} className="btn-secondary">İptal</button>
            <button onClick={addCategory} className="btn-primary">Ekle</button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
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
