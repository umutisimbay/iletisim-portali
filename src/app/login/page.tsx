'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
// YENİ: Toast kütüphanesi eklendi
import toast, { Toaster } from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()

  const [view, setView] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // YENİ: Supabase hatalarını Türkçeye çeviren yardımcı fonksiyon
  const getTurkishErrorMessage = (errorMsg: string) => {
    if (errorMsg.includes("Invalid login credentials")) return "E-posta adresi veya şifre hatalı.";
    if (errorMsg.includes("User already registered")) return "Bu e-posta adresi zaten kayıtlı.";
    if (errorMsg.includes("Password should be")) return "Şifre en az 6 karakter olmalıdır.";
    if (errorMsg.includes("rate limit")) return "Çok fazla deneme yaptınız, lütfen biraz bekleyin.";
    return errorMsg; // Tanımlı değilse orijinal mesajı göster
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Önceki toastları temizle
    toast.dismiss()

    try {
      if (view === 'register') {
        // --- KAYIT OLMA İŞLEMİ ---
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`, 
          },
        })
        
        if (error) throw error
        
        // BAŞARILI KAYIT BİLDİRİMİ (Türkçe)
        toast.success('Kayıt başarılı! Lütfen e-posta kutunuzu kontrol edin.', {
          duration: 5000,
          style: {
            border: '1px solid #4caf50',
            padding: '16px',
            color: '#1f2937',
            background: '#ffffff',
          },
          iconTheme: {
            primary: '#4caf50',
            secondary: '#ffffff',
          },
        })
        
      } else {
        // --- GİRİŞ YAPMA İŞLEMİ ---
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        
        // BAŞARILI GİRİŞ BİLDİRİMİ (Türkçe)
        toast.success('Giriş Başarılı! Yönlendiriliyorsunuz...', {
            style: {
                border: '1px solid #4caf50',
                padding: '16px',
                color: '#1f2937',
                fontWeight: '500'
            },
            iconTheme: {
                primary: '#15803d', // Koyu yeşil
                secondary: '#ffffff',
            },
        })

        // Kullanıcı mesajı görsün diye kısa bir bekleme
        setTimeout(() => {
            router.push('/chat') 
        }, 1500)
      }
    } catch (error: any) {
      console.error("Hata oluştu:", error)
      
      // HATA BİLDİRİMİ (Türkçe Çeviri ile)
      const turkishMessage = getTurkishErrorMessage(error.message || "")
      
      toast.error(turkishMessage, {
        duration: 4000,
        style: {
            border: '1px solid #ef4444', // Kırmızı sınır
            padding: '16px',
            color: '#1f2937',
            background: '#fff',
        },
        iconTheme: {
            primary: '#ef4444',
            secondary: '#ffffff',
        },
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
      
      {/* TOASTER BİLEŞENİ (Bildirimlerin çıkması için gerekli) */}
      <Toaster position="top-center" reverseOrder={false} />

      {/* ARKA PLAN KATMANI */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/background-pattern.png"
          alt="Pattern Background"
          fill
          priority
          quality={100}
          className="object-cover" 
        />
      </div>

      {/* FORM KATMANI */}
      <div className="relative z-10 w-full flex justify-center px-4">
        
        <div className="w-full max-w-[400px] bg-white px-8 py-10 rounded-2xl shadow-2xl relative">
          
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 whitespace-nowrap">
              {view === 'login' ? "Umudiye'ye Hoş Geldiniz!" : 'Hesap Oluşturun'}
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              {view === 'login' 
                ? 'Devam etmek için giriş yapın' 
                : 'Yeni bir hesap oluşturun'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                E-posta Adresi
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={view === 'login' ? "ornek@email.com" : "E-posta Adresi"}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-gray-800 focus:ring-1 focus:ring-gray-800 sm:text-sm sm:leading-6 outline-none transition-all"
              />
            </div>

            {/* Şifre */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Şifre
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={view === 'register' ? "En az 6 karakter" : "Şifrenizi giriniz"}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-gray-800 focus:ring-1 focus:ring-gray-800 sm:text-sm sm:leading-6 outline-none transition-all"
              />
            </div>

            {/* Buton */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-green-700 px-3 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 transition-colors disabled:opacity-70 mt-2 cursor-pointer"
            >
              {loading ? 'İşleniyor...' : (view === 'login' ? 'Giriş Yap' : 'Kayıt Ol')}
            </button>
          </form>

          {/* Alt Link (Toggle) */}
          <div className="mt-6 text-center text-sm">
            <p className="text-gray-600">
              {view === 'login' ? 'Hesabınız yok mu? ' : 'Zaten hesabınız var mı? '}
              <button
                onClick={() => setView(view === 'login' ? 'register' : 'login')}
                className="font-semibold text-gray-900 hover:underline ml-1 cursor-pointer"
              >
                {view === 'login' ? 'Kayıt olun' : 'Giriş yapın'}
              </button>
            </p>
          </div>

          {/* Feragatname */}
          <div className="mt-8 pt-4 border-t border-gray-100">
            <p className="text-center text-[11px] leading-relaxed text-gray-400 max-w-xs mx-auto">
              Giriş yaparak, verilerinizin güvenli bir şekilde saklanacağını <br /> kabul etmiş olursunuz.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}