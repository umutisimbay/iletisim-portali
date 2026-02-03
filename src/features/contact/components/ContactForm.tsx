"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ContactSchema, ContactFormData } from "../types";

export const ContactForm: React.FC = () => {
  const [showSuccess, setShowSuccess] = useState(false);

  const { 
    register, 
    handleSubmit, 
    formState: { errors, isSubmitting }, 
    reset 
  } = useForm<ContactFormData>({
    resolver: zodResolver(ContactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      // 1. Rate Limit (429) Hatası Kontrolü
      if (response.status === 429) {
        alert(result.error || "Çok fazla mesaj gönderdiniz. Lütfen bir saat sonra tekrar deneyiniz.");
        return;
      }

      // 2. Diğer Hataların Kontrolü
      if (!response.ok) {
        throw new Error(result.error || 'Bir hata oluştu');
      }

      // Başarılı durum
      setShowSuccess(true);
      reset();

      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);

    } catch (error: any) {
      console.error(error);
      alert(error.message || "Mesaj gönderilirken bir hata oluştu.");
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto relative">
      
      {/* Başarı Bildirimi */}
      {showSuccess && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-10 fade-in duration-500">
          <div className="bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-2xl shadow-emerald-200 flex items-center gap-3 border border-emerald-400">
            <div className="bg-white/20 rounded-full p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="font-bold text-sm">Mesajınız iletildi!</span>
          </div>
        </div>
      )}

      <div className={`transition-all duration-500 ${showSuccess ? 'opacity-50 scale-[0.98] pointer-events-none' : 'opacity-100'}`}>
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-600 dark:text-zinc-400 ml-1">Ad Soyad</label>
              <input 
                {...register("name")}
                placeholder="Adınızı giriniz..."
                className={`w-full px-4 py-3 rounded-xl border bg-zinc-50/50 dark:bg-zinc-800/50 transition-all outline-none focus:ring-4 
                  ${errors.name ? 'border-red-500 focus:ring-red-100' : 'border-zinc-200 dark:border-zinc-700 focus:border-indigo-500 focus:ring-indigo-100'}`}
              />
              {errors.name && <p className="text-xs text-red-500 font-medium ml-1">İsim en az 2 karakter olmalıdır</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-600 dark:text-zinc-400 ml-1">E-posta Adresi</label>
              <input 
                {...register("email")}
                type="email"
                placeholder="ornek@sirket.com"
                className={`w-full px-4 py-3 rounded-xl border bg-zinc-50/50 dark:bg-zinc-800/50 transition-all outline-none focus:ring-4 
                  ${errors.email ? 'border-red-500 focus:ring-red-100' : 'border-zinc-200 dark:border-zinc-700 focus:border-indigo-500 focus:ring-indigo-100'}`}
              />
              {errors.email && <p className="text-xs text-red-500 font-medium ml-1">Geçerli bir e-posta adresi giriniz</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-600 dark:text-zinc-400 ml-1">Mesajınız</label>
              <textarea 
                {...register("message")}
                rows={4}
                placeholder="Size nasıl yardımcı olabiliriz?"
                className={`w-full px-4 py-3 rounded-xl border bg-zinc-50/50 dark:bg-zinc-800/50 transition-all outline-none focus:ring-4 resize-none
                  ${errors.message ? 'border-red-500 focus:ring-red-100' : 'border-zinc-200 dark:border-zinc-700 focus:border-indigo-500 focus:ring-indigo-100'}`}
              />
              {errors.message && <p className="text-xs text-red-500 font-medium ml-1">Mesaj en az 10 karakter olmalıdır</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || showSuccess}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : showSuccess ? (
                "Gönderildi!"
              ) : (
                <>
                  <span>Mesajı Gönder</span>
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};