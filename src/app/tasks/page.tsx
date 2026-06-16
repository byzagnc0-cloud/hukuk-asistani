'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Filter, Trash2, Edit2, CheckCircle, Loader2, ClipboardList } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import AppLayout from '@/components/layout/AppLayout'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import FileUpload from '@/components/ui/FileUpload'
import ToastContainer, { useToast } from '@/components/ui/Toast'
import { Task, TaskStatus, TaskPriority, TaskChannel, PRIORITY_LABELS, STATUS_LABELS, CHANNEL_LABELS } from '@/lib/types'
import { formatDate, STATUS_COLORS, PRIORITY_COLORS } from '@/lib/utils'

const emptyForm = {
  title: '',
  description: '',
  client_name: '',
  file_info: '',
  due_date: '',
  channel: '' as TaskChannel | '',
  priority: 'medium' as TaskPriority,
  status: 'pending' as TaskStatus,
}

export default function TasksPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toasts, addToast, removeToast } = useToast()

  const [tasks, setTasks] = useState<Task[]>([])
  const [fetching, setFetching] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')

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
    if (user) fetchTasks()
  }, [user])

  async function fetchTasks() {
    setFetching(true)
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user!.id)
      .order('due_date', { ascending: true, nullsFirst: false })
    setTasks(data ?? [])
    setFetching(false)
  }

  function openAdd() {
    setEditingId(null)
    setForm(emptyForm)
    setSavedEntityId(null)
    setModalOpen(true)
  }

  function openEdit(task: Task) {
    setEditingId(task.id)
    setForm({
      title: task.title,
      description: task.description ?? '',
      client_name: task.client_name ?? '',
      file_info: task.file_info ?? '',
      due_date: task.due_date ?? '',
      channel: (task.channel ?? '') as TaskChannel | '',
      priority: task.priority,
      status: task.status,
    })
    setSavedEntityId(task.id)
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.title.trim()) return addToast('Başlık zorunludur', 'error')
    setSaving(true)

    const payload = {
      user_id: user!.id,
      title: form.title,
      description: form.description || null,
      client_name: form.client_name || null,
      file_info: form.file_info || null,
      due_date: form.due_date || null,
      channel: form.channel || null,
      priority: form.priority,
      status: form.status,
      completed_at: form.status === 'completed' ? new Date().toISOString() : null,
    }

    if (editingId) {
      const { error } = await supabase.from('tasks').update(payload).eq('id', editingId)
      if (error) { addToast('Kayıt güncellenemedi', 'error'); setSaving(false); return }
      addToast('Görev güncellendi', 'success')
    } else {
      const { data, error } = await supabase.from('tasks').insert(payload).select().single()
      if (error) { addToast('Kayıt eklenemedi', 'error'); setSaving(false); return }
      setSavedEntityId(data.id)
      setEditingId(data.id)
    }

    setSaving(false)
    fetchTasks()
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) { addToast('Silinemedi', 'error'); return }
    addToast('Görev silindi', 'success')
    setDeleteId(null)
    fetchTasks()
  }

  async function quickComplete(task: Task) {
    await supabase.from('tasks').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    }).eq('id', task.id)
    addToast('Görev tamamlandı!', 'success')
    fetchTasks()
  }

  const filtered = tasks.filter(t => {
    const matchSearch = !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.client_name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || t.status === statusFilter
    return matchSearch && matchStatus
  })

  const statusBadge = (status: TaskStatus) => {
    const v = status === 'completed' ? 'success' : status === 'in_progress' ? 'info' : 'warning'
    return <Badge variant={v}>{STATUS_LABELS[status]}</Badge>
  }

  const priorityBadge = (priority: TaskPriority) => {
    const v = priority === 'high' ? 'danger' : priority === 'medium' ? 'warning' : 'default'
    return <Badge variant={v}>{PRIORITY_LABELS[priority]}</Badge>
  }

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
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Yapılacak İşler</h1>
            <p className="text-sm text-gray-500 mt-0.5">{tasks.length} görev • {tasks.filter(t => t.status === 'completed').length} tamamlandı</p>
          </div>
          <button onClick={openAdd} className="btn-primary">
            <Plus className="w-4 h-4" /> Yeni Görev
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Görev veya müvekkil ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as TaskStatus | 'all')}
              className="input-field w-auto"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="pending">Bekliyor</option>
              <option value="in_progress">Devam Ediyor</option>
              <option value="completed">Tamamlandı</option>
            </select>
          </div>
        </div>

        {/* Task List */}
        {filtered.length === 0 ? (
          <div className="card text-center py-16">
            <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-500">Görev bulunamadı</h3>
            <p className="text-sm text-gray-400 mt-1">
              {search ? 'Arama kriterlerinizi değiştirin' : 'Yeni görev eklemek için + butonuna tıklayın'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(task => (
              <div
                key={task.id}
                className={`card hover:shadow-md transition-shadow ${task.status === 'completed' ? 'opacity-70' : ''}`}
              >
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => task.status !== 'completed' && quickComplete(task)}
                    className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 transition-colors ${
                      task.status === 'completed'
                        ? 'bg-green-500 border-green-500'
                        : 'border-gray-300 hover:border-green-500'
                    }`}
                  >
                    {task.status === 'completed' && <CheckCircle className="w-full h-full text-white" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start gap-2">
                      <h3 className={`font-semibold text-gray-900 ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                        {task.title}
                      </h3>
                      {statusBadge(task.status)}
                      {priorityBadge(task.priority)}
                      {task.channel && (
                        <Badge variant="purple">{CHANNEL_LABELS[task.channel]}</Badge>
                      )}
                    </div>

                    {task.description && (
                      <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                    )}

                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-400">
                      {task.client_name && <span>👤 {task.client_name}</span>}
                      {task.file_info && <span>📁 {task.file_info}</span>}
                      {task.due_date && (
                        <span className={`font-medium ${
                          !task.due_date ? '' :
                          new Date(task.due_date) < new Date() && task.status !== 'completed'
                            ? 'text-red-500'
                            : task.due_date === new Date().toISOString().split('T')[0]
                            ? 'text-orange-500'
                            : 'text-gray-400'
                        }`}>
                          📅 {formatDate(task.due_date)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEdit(task)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(task.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
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
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Görevi Düzenle' : 'Yeni Görev Ekle'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="label">İş Başlığı *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Görev başlığı..."
              className="input-field"
            />
          </div>

          <div>
            <label className="label">Açıklama</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Detaylı açıklama..."
              rows={3}
              className="input-field resize-none"
            />
          </div>

          <div className="form-row">
            <div>
              <label className="label">Müvekkil Adı</label>
              <input
                type="text"
                value={form.client_name}
                onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
                placeholder="Müvekkil adı..."
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Dosya Bilgisi</label>
              <input
                type="text"
                value={form.file_info}
                onChange={e => setForm(f => ({ ...f, file_info: e.target.value }))}
                placeholder="Dosya no, esas no..."
                className="input-field"
              />
            </div>
          </div>

          <div className="form-row">
            <div>
              <label className="label">Görevin Tarihi</label>
              <input
                type="date"
                value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">İşin Geldiği Kanal</label>
              <select
                value={form.channel}
                onChange={e => setForm(f => ({ ...f, channel: e.target.value as TaskChannel | '' }))}
                className="input-field"
              >
                <option value="">Seçiniz</option>
                <option value="mail">Mail</option>
                <option value="verbal">Sözlü</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div>
              <label className="label">Öncelik</label>
              <select
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value as TaskPriority }))}
                className="input-field"
              >
                <option value="low">Düşük</option>
                <option value="medium">Orta</option>
                <option value="high">Yüksek</option>
              </select>
            </div>
            <div>
              <label className="label">Durum</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as TaskStatus }))}
                className="input-field"
              >
                <option value="pending">Bekliyor</option>
                <option value="in_progress">Devam Ediyor</option>
                <option value="completed">Tamamlandı</option>
              </select>
            </div>
          </div>

          {/* File Upload - only after saving */}
          {savedEntityId && (
            <div>
              <label className="label">Dosya Ekleri</label>
              <FileUpload
                entityType="task"
                entityId={savedEntityId}
                userId={user!.id}
              />
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

      {/* Delete Confirm */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Görevi Sil"
        size="sm"
      >
        <p className="text-sm text-gray-600 mb-4">Bu görevi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setDeleteId(null)} className="btn-secondary">İptal</button>
          <button onClick={() => deleteId && handleDelete(deleteId)} className="btn-danger">Sil</button>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </AppLayout>
  )
}
