# 🚀 Modern İletişim Formu Sistemi (Next.js & Redis)

Bu proje, **Next.js 14 App Router** mimarisi kullanılarak geliştirilmiş, yüksek güvenlikli ve performans odaklı bir iletişim formu uygulamasıdır. 

Sadece bir form arayüzü değil; arka planda **Rate Limiting (Hız Sınırlama)**, **Server-Side Validation (Sunucu Taraflı Doğrulama)** ve **SMTP Entegrasyonu** içeren tam kapsamlı bir full-stack çözümdür.

## 🌟 Öne Çıkan Özellikler

### 🛡️ Güvenlik ve Performans
* **IP Tabanlı Rate Limiting:** Upstash Redis kullanılarak, aynı IP adresinden gelen istekler sınırlandırılır (Örn: Saatte max 3 istek). Spam ve bot saldırılarına karşı korumalıdır.
* **Zod ile Veri Doğrulama:** Hem frontend hem de backend tarafında "Type-safe" veri doğrulama yapılır. Hatalı veriler sunucuya ulaşmadan filtrelenir.
* **Serverless Mimari:** Vercel üzerinde sunucusuz fonksiyonlar (API Routes) ile çalışır.

### 📧 Gelişmiş Mail Yönetimi (SMTP)
* **Çift Yönlü Bildirim:** Form gönderildiğinde yöneticiye bildirim maili giderken, kullanıcıya da profesyonel bir "Otomatik Yanıt" (Auto-reply) maili iletilir.
* **Nodemailer Entegrasyonu:** Gmail SMTP servisi üzerinden güvenli mail gönderimi sağlanır.
* **Asenkron Gönderim:** `Promise.all` yapısı ile mailler paralel gönderilerek API yanıt süresi optimize edilmiştir.

### 🎨 Modern Arayüz (UI/UX)
* **React Hook Form:** Form durum yönetimi (state management) optimize edilmiştir.
* **Tailwind CSS:** Responsive ve modern tasarım.
* **Kullanıcı Geri Bildirimi:** Başarılı/Başarısız durumlarda kullanıcıya anlık toast bildirimleri (Alert) gösterilir.

---

## 🛠️ Kullanılan Teknolojiler

| Alan | Teknoloji | Amaç |
| :--- | :--- | :--- |
| **Framework** | Next.js 14 (App Router) | Full-stack uygulama çatısı |
| **Dil** | TypeScript | Tip güvenliği ve kod kalitesi |
| **Database/Cache** | Upstash Redis | Hız sınırı (Rate Limit) verilerini tutmak için |
| **Form & Validasyon** | React Hook Form & Zod | Form yönetimi ve şema doğrulama |
| **Mail Servisi** | Nodemailer | SMTP üzerinden mail gönderimi |
| **Styling** | Tailwind CSS | Hızlı ve esnek stillendirme |

---

## 📂 Proje Yapısı (Project Structure)

Proje, sürdürülebilirlik ve modülerlik için **Feature-based** (Özellik tabanlı) bir yapıda kurgulanmıştır.

```bash
src/
├── app/
│   ├── api/contact/route.ts    # Backend API (Redis & SMTP mantığı)
│   ├── layout.tsx              # Ana yerleşim
│   └── page.tsx                # Anasayfa
├── features/
│   └── contact/                # İletişim özelliği modülü
│       ├── components/         # ContactForm.tsx (UI)
│       └── types.ts            # Zod şemaları ve TS tipleri
└── components/                 # Genel bileşenler