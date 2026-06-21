'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Search, Trash2, Edit2, Loader2, Landmark, CheckCircle, Circle,
  Filter, ChevronDown, ChevronUp, FileUp, Sparkles, Paperclip
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import AppLayout from '@/components/layout/AppLayout'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import FileUpload from '@/components/ui/FileUpload'
import { useFilePreview, FilePreviewModal } from '@/components/ui/FilePreview'
import ToastContainer, { useToast } from '@/components/ui/Toast'
import { Hearing, Case, FileAttachment } from '@/lib/types'
import { formatDate, sanitizeFileName } from '@/lib/utils'
import { extractDatesFromFile, DetectedDate } from '@/lib/fileParse'

const emptyForm = {
  title: '',
  case_id: '',
  court: '',
  hearing_date: '',
  note: '',
  attorney: '',
  status: 'pending' as 'pending' | 'completed',
}

export default function HearingsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toasts, addToast, removeToast } = useToast()
  const importInputRef = useRef<HTMLInputElement>(null)

  const [hearings, setHearings] = useState<Hearing[]>([])
  const [cases, setCases] = useState<Case[]>([])
  const [attachmentsByHearing, setAttachmentsByHearing] = useState<Record<string, FileAttachment[]>>({})
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})
  const [fetching, setFetching] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { previewFile, previewUrl, previewLoading, previewError, openPreview, closePreview } = useFilePreview()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [savedEntityId, setSavedEntityId] = useState<string | null>(null)

  // Bulk import (PDF / Excel) state
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)
  const [detectedDates, setDetectedDates] = useState<DetectedDate[]>([])
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())
  const [importTitlePrefix, setImportTitlePrefix] = useState('')
  const [importCourt, setImportCourt] = useState('')
  const [importAttorney, setImportAttorney] = useState('')
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.push('/auth')
  }, [user, loading, router])

  useEffect(() => {
    if (user) fetchAll()
  }, [user])

  useEffect(() => {
    if (previewError) addToast(previewError, 'error')
  }, [previewError])

  async function fetchAttachments() {
    const { data: atts } = await supabase
      .from('file_attachments')
      .select('*')
      .eq('user_id', user!.id)
      .eq('entity_type', 'hearing')
      .order('created_at', { ascending: true })
    const map: Record<string, FileAttachment[]> = {}
    for (const a of atts ?? []) {
      (map[a.entity_id] ??= []).push(a)
    }
    setAttachmentsByHearing(map)
  }

  async function fetchAll() {
    setFetching(true)
    const [{ data: hs }, { data: cs }] = await Promise.all([
      supabase.from('hearings').select('*, case:cases(id, title, client_name)').eq('user_id', user!.id).order('hearing_date', { ascending: true }),
      supabase.from('cases').select('*').eq('user_id', user!.id).order('title'),
    ])
    setHearings(hs ?? [])
    setCases(cs ?? [])
    setFetching(false)
    fetchAttachments()
  }

  function getNoteValue(h: Hearing) {
    return noteDrafts[h.id] !== undefined ? noteDrafts[h.id] : (h.note ?? '')
  }

  async function saveNote(h: Hearing) {
    const value = noteDrafts[h.id]
    if (value === undefined || value === (h.note ?? '')) return
    await supabase.from('hearings').update({ note: value || null }).eq('id', h.id)
    setHearings(prev => prev.map(x => x.id === h.id ? { ...x, note: value || null } : x))
  }

  function openAdd() {
    setEditingId(null)
    setForm(emptyForm)
    setSavedEntityId(null)
    setModalOpen(true)
  }

  function openEdit(h: Hearing) {
    setEditingId(h.id)
    setForm({
      title: h.title,
      case_id: h.case_id ?? '',
      court: h.court ?? '',
      hearing_date: h.hearing_date,
      note: h.note ?? '',
      attorney: h.attorney ?? '',
      status: h.status,
    })
    setSavedEntityId(h.id)
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.title.trim() || !form.hearing_date) return addToast('Başlık ve tarih zorunludur', 'error')
    setSaving(true)

    const payload = {
      user_id: user!.id,
      title: form.title,
      case_id: form.case_id || null,
      court: form.court || null,
      hearing_date: form.hearing_date,
      note: form.note || null,
      attorney: form.attorney || null,
      status: form.status,
      source: 'manual' as const,
    }

    if (editingId) {
      const { error } = await supabase.from('hearings').update(payload).eq('id', editingId)
      if (error) { addToast('Güncellenemedi', 'error'); setSaving(false); return }
      addToast('Güncellendi', 'success')
    } else {
      const { data, error } = await supabase.from('hearings').insert(payload).select().single()
      if (error) { addToast('Eklenemedi', 'error'); setSaving(false); return }
      setSavedEntityId(data.id)
      setEditingId(data.id)
    }
    setSaving(false)
    fetchAll()
  }

  async function handleDelete(id: string) {
    await supabase.from('hearings').delete().eq('id', id)
    addToast('Silindi', 'success')
    setDeleteId(null)
    fetchAll()
  }

  async function toggleStatus(h: Hearing) {
    await supabase.from('hearings').update({ status: h.status === 'pending' ? 'completed' : 'pending' }).eq('id', h.id)
    fetchAll()
  }

  async function handleImportFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportFile(file)
    setParsing(true)
    setDetectedDates([])
    setSelectedDates(new Set())
    try {
      const dates = await extractDatesFromFile(file)
      setDetectedDates(dates)
      setSelectedDates(new Set(dates.map(d => d.date)))
      if (dates.length === 0) addToast('Dosyada otomatik olarak tarih tespit edilemedi. Tarihleri manuel girebilirsiniz.', 'info')
    } catch {
      addToast('Dosya okunamadı. Lütfen PDF veya Excel formatında olduğundan emin olun.', 'error')
    } finally {
      setParsing(false)
    }
  }

  function toggleSelectedDate(date: string) {
    setSelectedDates(prev => {
      const next = new Set(prev)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })
  }

  async function handleBulkImport() {
    if (!importFile || selectedDates.size === 0) return addToast('En az bir tarih seçin', 'error')
    setImporting(true)

    const filePath = `${user!.id}/hearing/bulk/${Date.now()}_${sanitizeFileName(importFile.name)}`
    const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, importFile)
    if (uploadError) { addToast('Dosya yüklenemedi', 'error'); setImporting(false); return }

    const source = importFile.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'excel'
    const rows = detectedDates
      .filter(d => selectedDates.has(d.date))
      .map(d => ({
        user_id: user!.id,
        title: importTitlePrefix.trim() || `Duruşma — ${formatDate(d.date)}`,
        court: importCourt || null,
        hearing_date: d.date,
        note: d.context || null,
        attorney: importAttorney || null,
        source,
      }))

    const { data: inserted, error } = await supabase.from('hearings').insert(rows).select()
    if (error) { addToast('Duruşmalar eklenemedi', 'error'); setImporting(false); return }

    const attachments = (inserted ?? []).map(h => ({
      user_id: user!.id,
      entity_type: 'hearing',
      entity_id: h.id,
      file_name: importFile.name,
      file_path: filePath,
      file_size: importFile.size,
      mime_type: importFile.type,
    }))
    if (attachments.length > 0) await supabase.from('file_attachments').insert(attachments)

    addToast(`${rows.length} duruşma eklendi`, 'success')
    setImportModalOpen(false)
    setImportFile(null)
    setDetectedDates([])
    setSelectedDates(new Set())
    setImportTitlePrefix('')
    setImportCourt('')
    setImportAttorney('')
    setImporting(false)
    if (importInputRef.current) importInputRef.current.value = ''
    fetchAll()
  }

  const filtered = hearings.filter(h => {
    const matchSearch = !search ||
      h.title.toLowerCase().includes(search.toLowerCase()) ||
      h.court?.toLowerCase().includes(search.toLowerCase()) ||
      h.attorney?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || h.status === statusFilter
    return matchSearch && matchStatus
  })

  const sourceLabel = { manual: 'Manuel', pdf: 'PDF', excel: 'Excel' }

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
            <h1 className="page-title">Duruşma Listesi</h1>
            <p className="text-sm text-gray-500 mt-0.5">{hearings.length} duruşma</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setImportModalOpen(true)} className="btn-secondary">
              <FileUp className="w-4 h-4" /> PDF/Excel Yükle
            </button>
            <button onClick={openAdd} className="btn-primary">
              <Plus className="w-4 h-4" /> Yeni Duruşma
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Başlık, mahkeme veya avukat ara..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'all' | 'pending' | 'completed')} className="input-field w-auto">
              <option value="all">Tümü</option>
              <option value="pending">Bekleyen</option>
              <option value="completed">Tamamlandı</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="card text-center py-16">
            <Landmark className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-500">Duruşma bulunamadı</h3>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(h => {
              const isExpanded = expandedId === h.id
              const attachments = attachmentsByHearing[h.id] ?? []
              return (
                <div key={h.id} className={`card ${h.status === 'completed' ? 'opacity-70' : ''}`}>
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleStatus(h)}
                      className="mt-0.5 flex-shrink-0"
                      title="Durumu değiştir"
                    >
                      {h.status === 'completed'
                        ? <CheckCircle className="w-5 h-5 text-green-500" />
                        : <Circle className="w-5 h-5 text-gray-300" />}
                    </button>
                    <div className="p-2.5 bg-teal-100 text-teal-600 rounded-xl flex-shrink-0">
                      <Landmark className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={`font-semibold text-gray-900 ${h.status === 'completed' ? 'line-through text-gray-500' : ''}`}>{h.title}</h3>
                        <Badge variant="info">{sourceLabel[h.source]}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
                        <span className="font-medium text-teal-600">📅 {formatDate(h.hearing_date)}</span>
                        {h.court && <span>🏛️ {h.court}</span>}
                        {h.attorney && <span>👤 {h.attorney}</span>}
                        {h.case && <span>📁 {h.case.title}</span>}
                      </div>
                      <textarea
                        value={getNoteValue(h)}
                        onChange={e => setNoteDrafts(prev => ({ ...prev, [h.id]: e.target.value }))}
                        onBlur={() => saveNote(h)}
                        placeholder="Not ekleyin..."
                        rows={1}
                        className="mt-2 w-full text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 resize-y focus:ring-1 focus:ring-teal-400 focus:border-teal-400 focus:bg-white transition-colors"
                      />
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {attachments.length > 0 && (
                        <button
                          onClick={() => {
                            if (attachments.length === 1) openPreview(attachments[0])
                            else setExpandedId(isExpanded ? null : h.id)
                          }}
                          title="Eklenen dosyayı aç"
                          className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors flex items-center gap-0.5"
                        >
                          <Paperclip className="w-4 h-4" />
                          <span className="text-xs font-medium">{attachments.length}</span>
                        </button>
                      )}
                      <button onClick={() => openEdit(h)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteId(h.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setExpandedId(isExpanded ? null : h.id)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Dosya Ekleri</h4>
                      <FileUpload entityType="hearing" entityId={h.id} userId={user!.id} onChange={fetchAttachments} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Duruşmayı Düzenle' : 'Yeni Duruşma Ekle'} size="lg">
        <div className="space-y-4">
          <div>
            <label className="label">Başlık *</label>
            <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Duruşma başlığı..." className="input-field" />
          </div>
          <div className="form-row">
            <div>
              <label className="label">Dosya / Dava</label>
              <select value={form.case_id} onChange={e => setForm(f => ({ ...f, case_id: e.target.value }))} className="input-field">
                <option value="">Bağlantı yok</option>
                {cases.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Mahkeme</label>
              <input type="text" value={form.court} onChange={e => setForm(f => ({ ...f, court: e.target.value }))} className="input-field" />
            </div>
          </div>
          <div className="form-row">
            <div>
              <label className="label">Duruşma Tarihi *</label>
              <input type="date" value={form.hearing_date} onChange={e => setForm(f => ({ ...f, hearing_date: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="label">Katılacak Avukat</label>
              <input type="text" value={form.attorney} onChange={e => setForm(f => ({ ...f, attorney: e.target.value }))} className="input-field" />
            </div>
          </div>
          <div>
            <label className="label">Not</label>
            <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={3} className="input-field resize-none" />
          </div>
          <div>
            <label className="label">Durum</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as 'pending' | 'completed' }))} className="input-field">
              <option value="pending">Bekliyor</option>
              <option value="completed">Tamamlandı</option>
            </select>
          </div>
          {savedEntityId && (
            <div>
              <label className="label">Dosya Ekleri</label>
              <FileUpload entityType="hearing" entityId={savedEntityId} userId={user!.id} onChange={fetchAttachments} />
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

      {/* Bulk Import Modal */}
      <Modal isOpen={importModalOpen} onClose={() => setImportModalOpen(false)} title="PDF / Excel'den Duruşma Tarihi Algıla" size="lg">
        <div className="space-y-4">
          <div
            onClick={() => importInputRef.current?.click()}
            className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-teal-400 hover:bg-teal-50 cursor-pointer transition-colors"
          >
            {parsing ? (
              <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5 text-teal-500" />
            )}
            <span className="text-sm text-gray-600">
              {parsing ? 'Dosya okunuyor ve tarihler aranıyor...' : importFile ? importFile.name : 'PDF veya Excel dosyası seçin'}
            </span>
            <input ref={importInputRef} type="file" accept=".pdf,.xlsx,.xls" onChange={handleImportFileSelect} className="hidden" />
          </div>

          {detectedDates.length > 0 && (
            <>
              <div className="form-row">
                <div>
                  <label className="label">Başlık (opsiyonel)</label>
                  <input type="text" value={importTitlePrefix} onChange={e => setImportTitlePrefix(e.target.value)} placeholder="Örn: Yargıtay duruşması" className="input-field" />
                </div>
                <div>
                  <label className="label">Mahkeme (opsiyonel)</label>
                  <input type="text" value={importCourt} onChange={e => setImportCourt(e.target.value)} className="input-field" />
                </div>
              </div>
              <div>
                <label className="label">Katılacak Avukat (opsiyonel)</label>
                <input type="text" value={importAttorney} onChange={e => setImportAttorney(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="label">Tespit Edilen Tarihler ({detectedDates.length}) — eklemek istediklerinizi seçin</label>
                <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-100 rounded-xl p-2">
                  {detectedDates.map(d => (
                    <label key={d.date} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedDates.has(d.date)}
                        onChange={() => toggleSelectedDate(d.date)}
                        className="mt-1 w-4 h-4 text-teal-600 rounded"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{formatDate(d.date)}</p>
                        {d.context && <p className="text-xs text-gray-400 line-clamp-1">{d.context}</p>}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button onClick={() => setImportModalOpen(false)} className="btn-secondary">İptal</button>
            <button onClick={handleBulkImport} disabled={importing || detectedDates.length === 0} className="btn-primary">
              {importing ? <><Loader2 className="w-4 h-4 animate-spin" /> Ekleniyor...</> : `${selectedDates.size} Duruşma Ekle`}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Sil" size="sm">
        <p className="text-sm text-gray-600 mb-4">Bu duruşma kaydını silmek istediğinizden emin misiniz?</p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setDeleteId(null)} className="btn-secondary">İptal</button>
          <button onClick={() => deleteId && handleDelete(deleteId)} className="btn-danger">Sil</button>
        </div>
      </Modal>

      <FilePreviewModal file={previewFile} url={previewUrl} loading={previewLoading} onClose={closePreview} />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </AppLayout>
  )
}
