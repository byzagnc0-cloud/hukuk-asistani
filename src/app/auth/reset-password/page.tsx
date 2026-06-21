'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Gavel, Lock, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [expired, setExpired] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })

    const timeout = setTimeout(() => {
      setReady(prevReady => {
        if (!prevReady) setExpired(true)
        return prevReady
      })
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.')
      return
    }
    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor.')
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setDone(true)
      setTimeout(() => router.push('/'), 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Şifre güncellenemedi')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f2645] via-[#1e3a5f] to-[#0f2645] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
            <Gavel className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Hukuk Asistanı</h1>
          <p className="text-blue-300/70 text-sm mt-1">Ofis Yönetim Sistemi</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {done ? (
            <div className="text-center py-4">
              <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-gray-900 mb-1">Şifreniz güncellendi</h2>
              <p className="text-sm text-gray-500">Yönlendiriliyorsunuz...</p>
            </div>
          ) : expired ? (
            <div className="text-center py-4">
              <h2 className="text-lg font-bold text-gray-900 mb-2">Bağlantı geçersiz veya süresi dolmuş</h2>
              <p className="text-sm text-gray-500 mb-4">Lütfen giriş ekranından şifre sıfırlama işlemini tekrar başlatın.</p>
              <button onClick={() => router.push('/auth')} className="btn-primary w-full justify-center py-3">
                Giriş ekranına dön
              </button>
            </div>
          ) : !ready ? (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
              <p className="text-sm text-gray-500">Bağlantı doğrulanıyor...</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Yeni Şifre Belirleyin</h2>
              <p className="text-sm text-gray-500 mb-6">Hesabınız için yeni bir şifre oluşturun</p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Yeni Şifre</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="En az 6 karakter"
                      className="input-field pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="label">Yeni Şifre (Tekrar)</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="Şifrenizi tekrar girin"
                      className="input-field pl-10"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full justify-center py-3 mt-2"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Güncelleniyor...</>
                  ) : 'Şifreyi Güncelle'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
