'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, CheckSquare, Calendar, FolderOpen, BookOpen,
  Scale, FileText, Gavel, LogOut, Menu, X, ChevronRight,
  Landmark, Handshake, Calculator, Archive, Receipt
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const navigation = [
  { name: 'Ana Sayfa', href: '/', icon: Home, description: 'Günlük hatırlatmalar' },
  { name: 'Yapılacak İşler', href: '/tasks', icon: CheckSquare, description: 'Görev takibi' },
  { name: 'Takvim', href: '/calendar', icon: Calendar, description: 'İleri tarihli işler' },
  { name: 'Davalar & Dosyalar', href: '/cases', icon: FolderOpen, description: 'Dava arşivi' },
  { name: 'Kütüphane', href: '/library', icon: BookOpen, description: 'Hukuk kütüphanesi' },
  { name: 'Emsal Kararlar', href: '/precedents', icon: Scale, description: 'İçtihat arşivi' },
  { name: 'Örnek Dilekçeler', href: '/petitions', icon: FileText, description: 'Dilekçe şablonları' },
  { name: 'Açtığım İcralar', href: '/enforcement', icon: Gavel, description: 'İcra takipleri' },
  { name: 'Duruşma Listesi', href: '/hearings', icon: Landmark, description: 'Duruşma takibi' },
  { name: 'Görüşme ve Teklif Takip', href: '/negotiations', icon: Handshake, description: 'Görüşme ve teklif takibi' },
  { name: 'Hesaplama Araçları', href: '/calculators', icon: Calculator, description: 'Hukuki hesaplamalar' },
  { name: 'İcra Kütüphanesi', href: '/icra-library', icon: Archive, description: 'Kişisel icra notları' },
  { name: 'Asgari Ücret Tarifesi', href: '/tariff', icon: Receipt, description: 'Tarife ve harç notları' },
]

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const currentPage = navigation.find(n => n.href === pathname)

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 bg-[#0f2645] text-white">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
          <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <Gavel className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight">Hukuk Asistanı</h1>
            <p className="text-xs text-blue-300/80">Ofis Yönetim Sistemi</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-blue-100/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-blue-300/70 group-hover:text-blue-200'}`} />
                <span className="text-sm font-medium">{item.name}</span>
                {isActive && <ChevronRight className="w-4 h-4 ml-auto opacity-60" />}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-sm font-bold">
              {user?.email?.[0]?.toUpperCase() ?? 'H'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{user?.email}</p>
              <p className="text-xs text-blue-300/60">Avukat</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-blue-200/70 hover:bg-white/10 hover:text-white transition-all text-sm"
          >
            <LogOut className="w-4 h-4" />
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-[#0f2645] text-white flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center">
                  <Gavel className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-base">Hukuk Asistanı</h1>
                  <p className="text-xs text-blue-300/80">Ofis Yönetim Sistemi</p>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-2 text-blue-200 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                      isActive ? 'bg-blue-600 text-white' : 'text-blue-100/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-medium">{item.name}</span>
                  </Link>
                )
              })}
            </nav>
            <div className="px-3 py-4 border-t border-white/10">
              <button
                onClick={() => { signOut(); setSidebarOpen(false) }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-blue-200/70 hover:bg-white/10 hover:text-white transition-all text-sm"
              >
                <LogOut className="w-4 h-4" />
                Çıkış Yap
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-72 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
          <div className="flex items-center gap-4 px-4 lg:px-6 h-14">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="font-semibold text-gray-900 text-sm">
                {currentPage?.name ?? 'Hukuk Asistanı'}
              </h2>
              {currentPage?.description && (
                <p className="text-xs text-gray-400 hidden sm:block">{currentPage.description}</p>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100 shadow-lg">
          <div className="grid grid-cols-5 h-16">
            {navigation.slice(0, 5).map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                    isActive ? 'text-blue-600' : 'text-gray-400'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium leading-tight text-center px-1 line-clamp-1">
                    {item.name.split(' ')[0]}
                  </span>
                </Link>
              )
            })}
          </div>
        </nav>
        {/* Mobile bottom padding */}
        <div className="lg:hidden h-16" />
      </div>
    </div>
  )
}
