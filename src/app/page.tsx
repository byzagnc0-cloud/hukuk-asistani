'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Bell, CheckSquare, Calendar, FolderOpen, Gavel,
  Loader2, RefreshCw, Clock, ChevronRight, AlertTriangle,
  Landmark, Users, StickyNote, Calculator, Archive, CheckCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import AppLayout from '@/components/layout/AppLayout'
import { formatDate, todayISO, isDateToday, isDateTomorrow, isDateOverdue, isDateThisWeek } from '@/lib/utils'
import { Reminder } from '@/lib/types'

const sourceConfig: Record<Reminder['source'], { label: string; icon: any; color: string; href: string; borderColor: string }> = {
  task: { label: 'Yapılacak İş', icon: CheckSquare, color: 'bg-blue-100 text-blue-700', href: '/tasks', borderColor: 'border-l-blue-500' },
  calendar: { label: 'Takvim', icon: Calendar, color: 'bg-purple-100 text-purple-700', href: '/calendar', borderColor: 'border-l-purple-500' },
  case_date: { label: 'Dava / Duruşma', icon: FolderOpen, color: 'bg-orange-100 text-orange-700', href: '/cases', borderColor: 'border-l-orange-500' },
  enforcement: { label: 'İcra Kesinleşmesi', icon: Gavel, color: 'bg-red-100 text-red-700', href: '/enforcement', borderColor: 'border-l-red-500' },
  hearing: { label: 'Duruşma', icon: Landmark, color: 'bg-teal-100 text-teal-700', href: '/hearings', borderColor: 'border-l-teal-500' },
  negotiation: { label: 'Görüşme / Teklif', icon: Users, color: 'bg-pink-100 text-pink-700', href: '/negotiations', borderColor: 'border-l-pink-500' },
  case_note: { label: 'Dosya Notu', icon: StickyNote, color: 'bg-amber-100 text-amber-700', href: '/cases', borderColor: 'border-l-amber-500' },
}

function ReminderCard({ reminder, onComplete }: { reminder: Reminder; onComplete?: (r: Reminder) => void }) {
  const config = sourceConfig[reminder.source]
  const Icon = config.icon
  return (
    <div className={`card flex items-start gap-4 border-l-4 ${config.borderColor} hover:shadow-md transition-shadow`}>
      {onComplete && reminder.source === 'task' && (
        <button
          onClick={() => onComplete(reminder)}
          className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 border-gray-300 hover:border-green-500 transition-colors"
          title="Tamamlandı olarak işaretle"
        >
          <CheckCircle className="w-full h-full text-transparent hover:text-green-500" />
        </button>
      )}
      <Link href={config.href} className="flex-1 min-w-0 flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`p-2 rounded-xl ${config.color} flex-shrink-0`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-1 ${config.color}`}>
              {config.label}
            </span>
            <h3 className="font-semibold text-gray-900 text-sm leading-snug">{reminder.title}</h3>
            {reminder.description && (
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{reminder.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 text-gray-300 flex-shrink-0 mt-0.5">
          <Clock className="w-3.5 h-3.5" />
          <span className="text-xs">{formatDate(reminder.date)}</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </Link>
    </div>
  )
}

function ReminderSection({ title, icon: Icon, accent, items, onComplete, emptyText }: {
  title: string
  icon: any
  accent: string
  items: Reminder[]
  onComplete?: (r: Reminder) => void
  emptyText: string
}) {
  if (items.length === 0) return null
  return (
    <div>
      <h2 className={`text-base font-bold text-gray-900 flex items-center gap-2 mb-3`}>
        <Icon className={`w-4 h-4 ${accent}`} />
        {title}
        <span className="text-xs font-medium text-gray-400">({items.length})</span>
      </h2>
      <div className="space-y-2">
        {items.map(r => <ReminderCard key={r.id} reminder={r} onComplete={onComplete} />)}
      </div>
    </div>
  )
}

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [allItems, setAllItems] = useState<Reminder[]>([])
  const [tomorrowHearings, setTomorrowHearings] = useState<Reminder[]>([])
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) fetchReminders()
  }, [user])

  async function fetchReminders() {
    setFetching(true)
    const results: Reminder[] = []

    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, client_name, due_date')
      .eq('user_id', user!.id)
      .neq('status', 'completed')
      .not('due_date', 'is', null)

    tasks?.forEach(t => {
      results.push({
        id: `task_${t.id}`,
        source: 'task',
        title: t.title,
        client_name: t.client_name,
        date: t.due_date,
        entity_id: t.id,
        url: '/tasks',
        description: t.client_name ? `Müvekkil: ${t.client_name}` : undefined,
      })
    })

    const { data: events } = await supabase
      .from('calendar_events')
      .select('id, title, client_name, event_date, description')
      .eq('user_id', user!.id)
      .neq('status', 'completed')

    events?.forEach(e => {
      results.push({
        id: `cal_${e.id}`,
        source: 'calendar',
        title: e.title,
        client_name: e.client_name,
        date: e.event_date,
        entity_id: e.id,
        url: '/calendar',
        description: e.description || (e.client_name ? `Müvekkil: ${e.client_name}` : undefined),
      })
    })

    const { data: caseDates } = await supabase
      .from('case_dates')
      .select('id, date_label, event_date, note, cases(title, client_name)')
      .eq('user_id', user!.id)

    caseDates?.forEach((cd: any) => {
      results.push({
        id: `case_date_${cd.id}`,
        source: 'case_date',
        title: `${cd.date_label}: ${cd.cases?.title ?? 'Dava'}`,
        client_name: cd.cases?.client_name,
        date: cd.event_date,
        entity_id: cd.id,
        url: '/cases',
        description: cd.note || (cd.cases?.client_name ? `Müvekkil: ${cd.cases.client_name}` : undefined),
      })
    })

    const { data: enforcements } = await supabase
      .from('enforcement_cases')
      .select('id, client_name, debtor_name, enforcement_file_number, finalization_date')
      .eq('user_id', user!.id)
      .eq('status', 'active')
      .not('finalization_date', 'is', null)

    enforcements?.forEach(e => {
      results.push({
        id: `enf_${e.id}`,
        source: 'enforcement',
        title: `İcra Kesinleşti: ${e.debtor_name ?? e.enforcement_file_number ?? 'İcra Dosyası'}`,
        client_name: e.client_name,
        date: e.finalization_date,
        entity_id: e.id,
        url: '/enforcement',
        description: `Müvekkil: ${e.client_name}${e.enforcement_file_number ? ` | Dosya No: ${e.enforcement_file_number}` : ''} — Talep atabilirsiniz!`,
      })
    })

    const { data: hearings } = await supabase
      .from('hearings')
      .select('id, title, court, hearing_date, note, attorney')
      .eq('user_id', user!.id)
      .eq('status', 'pending')

    const hearingReminders: Reminder[] = (hearings ?? []).map(h => ({
      id: `hearing_${h.id}`,
      source: 'hearing',
      title: h.title,
      date: h.hearing_date,
      entity_id: h.id,
      url: '/hearings',
      description: [h.court, h.attorney ? `Avukat: ${h.attorney}` : null, h.note].filter(Boolean).join(' — ') || undefined,
    }))
    results.push(...hearingReminders)
    setTomorrowHearings(hearingReminders.filter(h => isDateTomorrow(h.date)))

    const { data: negotiations } = await supabase
      .from('negotiations')
      .select('id, client_name, opposing_party, follow_up_date, summary')
      .eq('user_id', user!.id)
      .neq('status', 'closed')
      .not('follow_up_date', 'is', null)

    negotiations?.forEach(n => {
      results.push({
        id: `negotiation_${n.id}`,
        source: 'negotiation',
        title: `Tekrar Aranacak: ${n.client_name ?? n.opposing_party ?? 'Görüşme'}`,
        client_name: n.client_name,
        date: n.follow_up_date,
        entity_id: n.id,
        url: '/negotiations',
        description: n.summary || undefined,
      })
    })

    const { data: caseNotes } = await supabase
      .from('case_notes')
      .select('id, note, note_date, cases(title, client_name)')
      .eq('user_id', user!.id)
      .not('note_date', 'is', null)

    caseNotes?.forEach((cn: any) => {
      results.push({
        id: `case_note_${cn.id}`,
        source: 'case_note',
        title: `Dosya Notu: ${cn.cases?.title ?? 'Dosya'}`,
        client_name: cn.cases?.client_name,
        date: cn.note_date,
        entity_id: cn.id,
        url: '/cases',
        description: cn.note,
      })
    })

    setAllItems(results)
    setFetching(false)
  }

  async function quickCompleteTask(reminder: Reminder) {
    if (reminder.source !== 'task') return
    await supabase.from('tasks').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    }).eq('id', reminder.entity_id)
    fetchReminders()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  if (!user) return null

  const today = new Date()
  const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
  const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

  const overdueItems = allItems.filter(r => isDateOverdue(r.date))
  const todayItems = allItems.filter(r => isDateToday(r.date))
  const tomorrowItems = allItems.filter(r => isDateTomorrow(r.date))
  const weekItems = allItems.filter(r => isDateThisWeek(r.date) && !isDateToday(r.date) && !isDateTomorrow(r.date))

  const totalCount = overdueItems.length + todayItems.length + tomorrowItems.length + weekItems.length

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
        {/* Date Header */}
        <div className="card bg-gradient-to-r from-[#0f2645] to-[#1e3a5f] text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-blue-300/70 text-sm font-medium uppercase tracking-wide">Bugün</p>
              <h1 className="text-3xl font-bold mt-1">
                {today.getDate()} {monthNames[today.getMonth()]} {today.getFullYear()}
              </h1>
              <p className="text-blue-200/70 mt-0.5">{dayNames[today.getDay()]}</p>
            </div>
            <div className="flex items-center gap-2">
              {fetching ? (
                <Loader2 className="w-5 h-5 text-blue-300 animate-spin" />
              ) : (
                <button
                  onClick={fetchReminders}
                  className="p-2 text-blue-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                  title="Yenile"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              )}
              <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-xl">
                <Bell className="w-4 h-4 text-blue-300" />
                <span className="text-sm font-semibold">{totalCount}</span>
                <span className="text-blue-300/70 text-sm">hatırlatma</span>
              </div>
            </div>
          </div>
        </div>

        {fetching ? (
          <div className="card flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Yarınki Duruşmalar - öncelikli vurgu */}
            {tomorrowHearings.length > 0 && (
              <div className="card border-2 border-teal-200 bg-teal-50/50">
                <h2 className="text-base font-bold text-teal-800 flex items-center gap-2 mb-3">
                  <Landmark className="w-4 h-4" />
                  Yarınki Duruşmalar
                  <span className="text-xs font-medium text-teal-500">({tomorrowHearings.length})</span>
                </h2>
                <div className="space-y-2">
                  {tomorrowHearings.map(h => <ReminderCard key={h.id} reminder={h} />)}
                </div>
              </div>
            )}

            <ReminderSection
              title="Geciken İşler"
              icon={AlertTriangle}
              accent="text-red-500"
              items={overdueItems}
              onComplete={quickCompleteTask}
              emptyText=""
            />
            <ReminderSection
              title="Bugün Yapılacaklar"
              icon={Bell}
              accent="text-blue-500"
              items={todayItems}
              onComplete={quickCompleteTask}
              emptyText=""
            />
            <ReminderSection
              title="Yarın Yapılacaklar"
              icon={Calendar}
              accent="text-purple-500"
              items={tomorrowItems}
              onComplete={quickCompleteTask}
              emptyText=""
            />
            <ReminderSection
              title="Bu Hafta Yapılacaklar"
              icon={Clock}
              accent="text-gray-500"
              items={weekItems}
              onComplete={quickCompleteTask}
              emptyText=""
            />

            {totalCount === 0 && tomorrowHearings.length === 0 && (
              <div className="card text-center py-12">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CheckSquare className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-base font-semibold text-gray-700 mb-1">Hatırlatma yok</h3>
                <p className="text-sm text-gray-400">Harika! Önümüzdeki hafta için takviminiz temiz görünüyor.</p>
              </div>
            )}
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Yapılacak İşler', href: '/tasks', icon: CheckSquare, color: 'text-blue-600 bg-blue-50' },
            { label: 'Takvim', href: '/calendar', icon: Calendar, color: 'text-purple-600 bg-purple-50' },
            { label: 'Davalar', href: '/cases', icon: FolderOpen, color: 'text-orange-600 bg-orange-50' },
            { label: 'İcralar', href: '/enforcement', icon: Gavel, color: 'text-red-600 bg-red-50' },
            { label: 'Duruşmalar', href: '/hearings', icon: Landmark, color: 'text-teal-600 bg-teal-50' },
            { label: 'Görüşmeler', href: '/negotiations', icon: Users, color: 'text-pink-600 bg-pink-50' },
            { label: 'Hesaplama', href: '/calculators', icon: Calculator, color: 'text-indigo-600 bg-indigo-50' },
            { label: 'İcra Kütüphanesi', href: '/icra-library', icon: Archive, color: 'text-amber-600 bg-amber-50' },
          ].map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="card flex flex-col items-center gap-2 py-4 hover:shadow-md transition-shadow text-center"
            >
              <div className={`p-3 rounded-xl ${item.color}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-gray-600">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
