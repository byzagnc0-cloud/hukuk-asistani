'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Gavel, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

export default function AuthPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && user) {
      router.push('/')
    }
  }, [user, loading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSubmitting(true)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/')
      } else if (mode === 'register') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        })
        if (error) throw error
        setSuccess('Kayıt başarılı! E-posta adresinizi doğrulayın veya direkt giriş yapın.')
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        })
        if (error) throw error
        setSuccess('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Gelen kutunuzu kontrol edin.')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Bir hata oluştu'
      if (message.includes('Invalid login credentials')) {
        setError('E-posta veya şifre hatalı.')
      } else if (message.includes('Email not confirmed')) {
        setError('E-posta adresinizi doğrulamanız gerekiyor.')
      } else if (message.includes('User already registered')) {
        setError('Bu e-posta adresi zaten kayıtlı.')
      } else {
        setError(message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f2645]">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f2645] via-[#1e3a5f] to-[#0f2645] p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
            <Gavel className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Hukuk Asistanı</h1>
          <p className="text-blue-300/70 text-sm mt-1">Ofis Yönetim Sistemi</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            {mode === 'login' ? 'Giriş Yapın' : mode === 'register' ? 'Hesap Oluşturun' : 'Şifrenizi Sıfırlayın'}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {mode === 'login'
              ? 'Hesabınıza giriş yaparak devam edin'
              : mode === 'register'
              ? 'Yeni bir hesap oluşturun'
              : 'E-posta adresinize bir sıfırlama bağlantısı gönderelim'}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">E-posta Adresi</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="ornek@email.com"
                  className="input-field pl-10"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <label className="label">Şifre</label>
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
            )}

            {mode === 'login' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(null); setSuccess(null) }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Şifremi unuttum
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full justify-center py-3 mt-2"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> İşleniyor...</>
              ) : mode === 'login' ? 'Giriş Yap' : mode === 'register' ? 'Kayıt Ol' : 'Sıfırlama Bağlantısı Gönder'}
            </button>
          </form>

          <div className="mt-6 text-center">
            {mode === 'forgot' ? (
              <button
                onClick={() => { setMode('login'); setError(null); setSuccess(null) }}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Giriş ekranına dön
              </button>
            ) : (
              <button
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); setSuccess(null) }}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {mode === 'login'
                  ? 'Hesabınız yok mu? Kayıt olun'
                  : 'Zaten hesabınız var mı? Giriş yapın'}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-blue-300/40 text-xs mt-6">
          Verileriniz güvenli şekilde Supabase bulutunda saklanır
        </p>
      </div>
    </div>
  )
}
