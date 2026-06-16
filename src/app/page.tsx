'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Bell, CheckSquare, Calendar, FolderOpen, Gavel,
  Loader2, RefreshCw, AlertCircle, Clock, ChevronRight
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import AppLayout from '@/components/layout/AppLayout'
import { formatDate, todayISO } from '@/lib/utils'
import { Reminder } from '@/lib/types'

const sourceConfig = {
  task: {
    label: 'Yapılacak İş',
    icon: CheckSquare,
    color: 'bg-blue-100 text-blue-700',
    href: '/tasks',
    borderColor: 'border-l-blue-500',
  },
  calendar: {
    label: 'Takvim',
    icon: Calendar,
    color: 'bg-purple-100 text-purple-700',
    href: '/calendar',
    borderColor: 'border-l-purple-500',
  },
  case_date: {
    label: 'Dava / Duruşma',
    icon: FolderOpen,
    color: 'bg-orange-100 text-orange-700',
    href: '/cases',
    borderColor: 'border-l-orange-500',
  },
  enforcement: {
    label: 'İcra Kesinleşmesi',
    icon: Gavel,
    color: 'bg-red-100 text-red-700',
    href: '/enforcement',
    borderColor: 'border-l-red-500',
  },
}

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [reminders, setReminders] = useState<Reminder[]>([])
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
    const today = todayISO()
    const results: Reminder[] = []

    // 1. Yapılacak işler - bugün tarihli, tamamlanmamış
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, client_name, due_date')
      .eq('user_id', user!.id)
      .eq('due_date', today)
      .neq('status', 'completed')

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

    // 2. Takvim etkinlikleri - bugün tarihli
    const { data: events } = await supabase
      .from('calendar_events')
      .select('id, title, client_name, event_date, description')
      .eq('user_id', user!.id)
      .eq('event_date', today)
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

    // 3. Dava tarihleri / duruşmalar - bugün
    const { data: caseDates } = await supabase
      .from('case_dates')
      .select('id, date_label, event_date, note, cases(title, client_name)')
      .eq('user_id', user!.id)
      .eq('event_date', today)

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

    // 4. İcra kesinleşme tarihleri - bugün
    const { data: enforcements } = await supabase
      .from('enforcement_cases')
      .select('id, client_name, debtor_name, enforcement_file_number, finalization_date')
      .eq('user_id', user!.id)
      .eq('finalization_date', today)
      .eq('status', 'active')

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

    setReminders(results)
    setFetching(false)
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
                <span className="text-sm font-semibold">{reminders.length}</span>
                <span className="text-blue-300/70 text-sm">hatırlatma</span>
              </div>
            </div>
          </div>
        </div>

        {/* Reminders */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-500" />
              Bugünün Hatırlatmaları
            </h2>
          </div>

          {fetching ? (
            <div className="card flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : reminders.length === 0 ? (
            <div className="card text-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckSquare className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-base font-semibold text-gray-700 mb-1">Bugün için hatırlatma yok</h3>
              <p className="text-sm text-gray-400">Harika! Bugün takviminiz temiz görünüyor.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reminders.map(reminder => {
                const config = sourceConfig[reminder.source]
                const Icon = config.icon
                return (
                  <Link
                    key={reminder.id}
                    href={config.href}
                    className={`card flex items-start gap-4 border-l-4 ${config.borderColor} hover:shadow-md transition-shadow cursor-pointer block`}
                  >
                    <div className={`p-2.5 rounded-xl ${config.color} flex-shrink-0`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-1 ${config.color}`}>
                            {config.label}
                          </span>
                          <h3 className="font-semibold text-gray-900 text-sm leading-snug">{reminder.title}</h3>
                          {reminder.description && (
                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{reminder.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-gray-300 flex-shrink-0 mt-0.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-xs">{formatDate(reminder.date)}</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Yapılacak İşler', href: '/tasks', icon: CheckSquare, color: 'text-blue-600 bg-blue-50' },
            { label: 'Takvim', href: '/calendar', icon: Calendar, color: 'text-purple-600 bg-purple-50' },
            { label: 'Davalar', href: '/cases', icon: FolderOpen, color: 'text-orange-600 bg-orange-50' },
            { label: 'İcralar', href: '/enforcement', icon: Gavel, color: 'text-red-600 bg-red-50' },
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
