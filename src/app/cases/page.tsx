'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Trash2, Edit2, Loader2, FolderOpen, ChevronDown, ChevronUp, CalendarPlus, StickyNote, CheckCircle2, Circle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import AppLayout from '@/components/layout/AppLayout'
import Modal from '@/components/ui/Modal'
import FileUpload from '@/components/ui/FileUpload'
import ToastContainer, { useToast } from '@/components/ui/Toast'
import { Case, CaseDate, CaseNote, Task, CASE_TYPE_OPTIONS } from '@/lib/types'
import { formatDate } from '@/lib/utils'

const emptyForm = {
  title: '',
  client_name: '',
  case_type: '',
  court: '',
  case_number: '',
  description: '',
}

const emptyDateForm = {
  date_label: '',
  event_date: '',
  note: '',
}

const emptyNoteForm = {
  note: '',
  note_date: '',
}

export default function CasesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toasts, addToast, removeToast } = useToast()

  const [cases, setCases] = useState<Case[]>([])
  const [caseDates, setCaseDates] = useState<Record<string, CaseDate[]>>({})
  const [caseNotes, setCaseNotes] = useState<Record<string, CaseNote[]>>({})
  const [caseTasks, setCaseTasks] = useState<Record<string, Task[]>>({})
  const [fetching, setFetching] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [savedEntityId, setSavedEntityId] = useState<string | null>(null)

  const [dateModalOpen, setDateModalOpen] = useState(false)
  const [dateModalCaseId, setDateModalCaseId] = useState<string | null>(null)
  const [dateForm, setDateForm] = useState(emptyDateForm)
  const [dateEditingId, setDateEditingId] = useState<string | null>(null)

  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [noteModalCaseId, setNoteModalCaseId] = useState<string | null>(null)
  const [noteForm, setNoteForm] = useState(emptyNoteForm)
  const [noteEditingId, setNoteEditingId] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) router.push('/auth')
  }, [user, loading, router])

  useEffect(() => {
    if (user) fetchCases()
  }, [user])

  async function fetchCases() {
    setFetching(true)
    const [{ data }, { data: dates }, { data: notes }, { data: tasks }] = await Promise.all([
      supabase.from('cases').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
      supabase.from('case_dates').select('*').eq('user_id', user!.id).order('event_date', { ascending: true }),
      supabase.from('case_notes').select('*').eq('user_id', user!.id).order('note_date', { ascending: true }),
      supabase.from('tasks').select('*').eq('user_id', user!.id).not('case_id', 'is', null),
    ])
    setCases(data ?? [])

    const dateMap: Record<string, CaseDate[]> = {}
    dates?.forEach(d => {
      if (!dateMap[d.case_id]) dateMap[d.case_id] = []
      dateMap[d.case_id].push(d)
    })
    setCaseDates(dateMap)

    const noteMap: Record<string, CaseNote[]> = {}
    notes?.forEach(n => {
      if (!noteMap[n.case_id]) noteMap[n.case_id] = []
      noteMap[n.case_id].push(n)
    })
    setCaseNotes(noteMap)

    const taskMap: Record<string, Task[]> = {}
    tasks?.forEach(t => {
      if (!t.case_id) return
      if (!taskMap[t.case_id]) taskMap[t.case_id] = []
      taskMap[t.case_id].push(t)
    })
    setCaseTasks(taskMap)

    setFetching(false)
  }

  function openAdd() {
    setEditingId(null)
    setForm(emptyForm)
    setSavedEntityId(null)
    setModalOpen(true)
  }

  function openEdit(c: Case) {
    setEditingId(c.id)
    setForm({
      title: c.title,
      client_name: c.client_name ?? '',
      case_type: c.case_type ?? '',
      court: c.court ?? '',
      case_number: c.case_number ?? '',
      description: c.description ?? '',
    })
    setSavedEntityId(c.id)
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.title.trim()) return addToast('Başlık zorunludur', 'error')
    setSaving(true)

    const payload = {
      user_id: user!.id,
      title: form.title,
      client_name: form.client_name || null,
      case_type: form.case_type || null,
      court: form.court || null,
      case_number: form.case_number || null,
      description: form.description || null,
    }

    if (editingId) {
      const { error } = await supabase.from('cases').update(payload).eq('id', editingId)
      if (error) { addToast('Güncellenemedi', 'error'); setSaving(false); return }
      addToast('Güncellendi', 'success')
    } else {
      const { data, error } = await supabase.from('cases').insert(payload).select().single()
      if (error) { addToast('Eklenemedi', 'error'); setSaving(false); return }
      setSavedEntityId(data.id)
      setEditingId(data.id)
    }
    setSaving(false)
    fetchCases()
  }

  async function handleDelete(id: string) {
    await supabase.from('cases').delete().eq('id', id)
    addToast('Silindi', 'success')
    setDeleteId(null)
    fetchCases()
  }

  function openDateModal(caseId: string, date?: CaseDate) {
    setDateModalCaseId(caseId)
    setDateEditingId(date?.id ?? null)
    setDateForm(date ? { date_label: date.date_label, event_date: date.event_date, note: date.note ?? '' } : emptyDateForm)
    setDateModalOpen(true)
  }

  async function handleSaveDate() {
    if (!dateForm.date_label.trim() || !dateForm.event_date) return addToast('Başlık ve tarih zorunludur', 'error')

    const payload = {
      case_id: dateModalCaseId,
      user_id: user!.id,
      date_label: dateForm.date_label,
      event_date: dateForm.event_date,
      note: dateForm.note || null,
    }

    if (dateEditingId) {
      await supabase.from('case_dates').update(payload).eq('id', dateEditingId)
    } else {
      await supabase.from('case_dates').insert(payload)
    }
    addToast('Tarih kaydedildi', 'success')
    setDateModalOpen(false)
    fetchCases()
  }

  async function deleteDate(id: string) {
    await supabase.from('case_dates').delete().eq('id', id)
    addToast('Tarih silindi', 'success')
    fetchCases()
  }

  function openNoteModal(caseId: string, note?: CaseNote) {
    setNoteModalCaseId(caseId)
    setNoteEditingId(note?.id ?? null)
    setNoteForm(note ? { note: note.note, note_date: note.note_date ?? '' } : emptyNoteForm)
    setNoteModalOpen(true)
  }

  async function handleSaveNote() {
    if (!noteForm.note.trim()) return addToast('Not metni zorunludur', 'error')

    const payload = {
      case_id: noteModalCaseId,
      user_id: user!.id,
      note: noteForm.note,
      note_date: noteForm.note_date || null,
    }

    if (noteEditingId) {
      await supabase.from('case_notes').update(payload).eq('id', noteEditingId)
    } else {
      await supabase.from('case_notes').insert(payload)
    }
    addToast('Not kaydedildi', 'success')
    setNoteModalOpen(false)
    fetchCases()
  }

  async function deleteNote(id: string) {
    await supabase.from('case_notes').delete().eq('id', id)
    addToast('Not silindi', 'success')
    fetchCases()
  }

  async function toggleTaskStatus(task: Task) {
    const completed = task.status !== 'completed'
    await supabase.from('tasks').update({
      status: completed ? 'completed' : 'pending',
      completed_at: completed ? new Date().toISOString() : null,
    }).eq('id', task.id)
    fetchCases()
  }

  const filtered = cases.filter(c =>
    !search ||
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.case_number?.toLowerCase().includes(search.toLowerCase()) ||
    c.court?.toLowerCase().includes(search.toLowerCase())
  )

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
            <h1 className="page-title">Davalar & Dosyalar</h1>
            <p className="text-sm text-gray-500 mt-0.5">{cases.length} dosya</p>
          </div>
          <button onClick={openAdd} className="btn-primary">
            <Plus className="w-4 h-4" /> Yeni Dosya
          </button>
        </div>

        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Dava, müvekkil, mahkeme veya esas no ara..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10" />
        </div>

        {filtered.length === 0 ? (
          <div className="card text-center py-16">
            <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-500">Dosya bulunamadı</h3>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(c => {
              const isExpanded = expandedId === c.id
              const dates = caseDates[c.id] ?? []
              const notes = caseNotes[c.id] ?? []
              const linkedTasks = caseTasks[c.id] ?? []
              return (
                <div key={c.id} className="card">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-orange-100 text-orange-600 rounded-xl flex-shrink-0">
                      <FolderOpen className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">{c.title}</h3>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
                            {c.client_name && <span>👤 {c.client_name}</span>}
                            {c.court && <span>🏛️ {c.court}</span>}
                            {c.case_number && <span>📋 {c.case_number}</span>}
                            {c.case_type && <span>⚖️ {c.case_type}</span>}
                          </div>
                          {c.description && <p className="text-sm text-gray-500 mt-1">{c.description}</p>}
                          {(dates.length > 0 || notes.length > 0 || linkedTasks.length > 0) && (
                            <p className="text-xs text-gray-400 mt-1">
                              {dates.length > 0 && `${dates.length} tarih kaydı`}
                              {dates.length > 0 && (notes.length > 0 || linkedTasks.length > 0) && ' • '}
                              {notes.length > 0 && `${notes.length} not`}
                              {notes.length > 0 && linkedTasks.length > 0 && ' • '}
                              {linkedTasks.length > 0 && `${linkedTasks.length} bağlı görev`}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => openEdit(c)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteId(c.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => setExpandedId(isExpanded ? null : c.id)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded: Dates & Files */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                      {/* Dates */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-700">Tarihler / Duruşmalar</h4>
                          <button onClick={() => openDateModal(c.id)} className="text-xs btn-secondary py-1.5">
                            <CalendarPlus className="w-3.5 h-3.5" /> Tarih Ekle
                          </button>
                        </div>
                        {dates.length === 0 ? (
                          <p className="text-xs text-gray-400">Henüz tarih eklenmedi</p>
                        ) : (
                          <div className="space-y-2">
                            {dates.map(d => (
                              <div key={d.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg">
                                <div className="flex-1">
                                  <span className="text-sm font-medium text-gray-700">{d.date_label}</span>
                                  <span className="mx-2 text-gray-400">—</span>
                                  <span className="text-sm text-blue-600">{formatDate(d.event_date)}</span>
                                  {d.note && <p className="text-xs text-gray-500 mt-0.5">{d.note}</p>}
                                </div>
                                <div className="flex gap-1">
                                  <button onClick={() => openDateModal(c.id, d)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg transition-colors">
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => deleteDate(d.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-700">Dosya İçi Notlar</h4>
                          <button onClick={() => openNoteModal(c.id)} className="text-xs btn-secondary py-1.5">
                            <StickyNote className="w-3.5 h-3.5" /> Not Ekle
                          </button>
                        </div>
                        {notes.length === 0 ? (
                          <p className="text-xs text-gray-400">Henüz not eklenmedi</p>
                        ) : (
                          <div className="space-y-2">
                            {notes.map(n => (
                              <div key={n.id} className="flex items-start gap-3 p-2.5 bg-amber-50 rounded-lg">
                                <div className="flex-1">
                                  <p className="text-sm text-gray-700">{n.note}</p>
                                  {n.note_date && <p className="text-xs text-amber-600 mt-0.5">📅 {formatDate(n.note_date)}</p>}
                                </div>
                                <div className="flex gap-1">
                                  <button onClick={() => openNoteModal(c.id, n)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg transition-colors">
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => deleteNote(n.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Linked Tasks */}
                      {linkedTasks.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">Bağlı Görevler</h4>
                          <div className="space-y-2">
                            {linkedTasks.map(t => (
                              <div key={t.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg">
                                <button onClick={() => toggleTaskStatus(t)} className="flex-shrink-0">
                                  {t.status === 'completed'
                                    ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    : <Circle className="w-4 h-4 text-gray-300" />}
                                </button>
                                <span className={`flex-1 text-sm ${t.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                  {t.title}
                                </span>
                                {t.due_date && <span className="text-xs text-gray-400">{formatDate(t.due_date)}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Files */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Dosya Ekleri</h4>
                        <FileUpload entityType="case" entityId={c.id} userId={user!.id} />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Case Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Dosyayı Düzenle' : 'Yeni Dosya Ekle'} size="lg">
        <div className="space-y-4">
          <div>
            <label className="label">Dosya Başlığı *</label>
            <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Dava başlığı..." className="input-field" />
          </div>
          <div className="form-row">
            <div>
              <label className="label">Müvekkil Adı</label>
              <input type="text" value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="label">Dosya Türü</label>
              <select value={form.case_type} onChange={e => setForm(f => ({ ...f, case_type: e.target.value }))} className="input-field">
                <option value="">Seçiniz...</option>
                {CASE_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div>
              <label className="label">Mahkeme / Kurum</label>
              <input type="text" value={form.court} onChange={e => setForm(f => ({ ...f, court: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="label">Esas No</label>
              <input type="text" value={form.case_number} onChange={e => setForm(f => ({ ...f, case_number: e.target.value }))} className="input-field" />
            </div>
          </div>
          <div>
            <label className="label">Açıklama</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="input-field resize-none" />
          </div>
          {savedEntityId && (
            <div>
              <label className="label">Dosya Ekleri</label>
              <FileUpload entityType="case" entityId={savedEntityId} userId={user!.id} />
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

      {/* Date Modal */}
      <Modal isOpen={dateModalOpen} onClose={() => setDateModalOpen(false)} title="Tarih / Duruşma Ekle" size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Başlık *</label>
            <input type="text" value={dateForm.date_label} onChange={e => setDateForm(f => ({ ...f, date_label: e.target.value }))} placeholder="Duruşma, tebliğ tarihi..." className="input-field" />
          </div>
          <div>
            <label className="label">Tarih *</label>
            <input type="date" value={dateForm.event_date} onChange={e => setDateForm(f => ({ ...f, event_date: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="label">Not</label>
            <input type="text" value={dateForm.note} onChange={e => setDateForm(f => ({ ...f, note: e.target.value }))} placeholder="Kısa not..." className="input-field" />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button onClick={() => setDateModalOpen(false)} className="btn-secondary">İptal</button>
            <button onClick={handleSaveDate} className="btn-primary">Kaydet</button>
          </div>
        </div>
      </Modal>

      {/* Note Modal */}
      <Modal isOpen={noteModalOpen} onClose={() => setNoteModalOpen(false)} title="Dosya İçi Not" size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Not *</label>
            <textarea value={noteForm.note} onChange={e => setNoteForm(f => ({ ...f, note: e.target.value }))} rows={4} placeholder="Not metni..." className="input-field resize-none" />
          </div>
          <div>
            <label className="label">Tarih (opsiyonel)</label>
            <input type="date" value={noteForm.note_date} onChange={e => setNoteForm(f => ({ ...f, note_date: e.target.value }))} className="input-field" />
            <p className="text-xs text-gray-400 mt-1">Tarih girilirse, tarih geldiğinde ana sayfada hatırlatma olarak gösterilir.</p>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button onClick={() => setNoteModalOpen(false)} className="btn-secondary">İptal</button>
            <button onClick={handleSaveNote} className="btn-primary">Kaydet</button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Dosyayı Sil" size="sm">
        <p className="text-sm text-gray-600 mb-4">Bu dosyayı ve tüm tarih kayıtlarını silmek istediğinizden emin misiniz?</p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setDeleteId(null)} className="btn-secondary">İptal</button>
          <button onClick={() => deleteId && handleDelete(deleteId)} className="btn-danger">Sil</button>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </AppLayout>
  )
}
