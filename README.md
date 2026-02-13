# 💬 Next.js Real-Time Chat Application

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![Supabase](https://img.shields.io/badge/Supabase-Realtime-green)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue)

Bu proje, **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS** ve **Supabase** teknolojileri kullanılarak geliştirilmiş, modern, hızlı ve tam kapsamlı bir gerçek zamanlı mesajlaşma uygulamasıdır. 

WhatsApp benzeri bir kullanıcı deneyimi sunar; Grup sohbetleri, medya paylaşımı, gelişmiş görsel inceleme araçları ve detaylı mesaj durum takibi (okundu/iletildi) gibi özelliklere sahiptir.

## ✨ Özellikler

### 📱 Mesajlaşma Deneyimi
* **Gerçek Zamanlı İletişim:** Supabase Realtime altyapısı ile mesajlar anlık olarak iletilir.
* **Birebir (DM) ve Grup Sohbetleri:** Kişilerle özel mesajlaşabilir veya çoklu katılımcılı gruplar oluşturabilirsiniz.
* **Emoji Desteği:** Entegre emoji seçici ile zengin içerikli mesajlar.
* **Mesaj Durumları (WhatsApp Tarzı):**
    * 🕒 **Gönderiliyor:** İstemci tarafında işlemde.
    * ✔️ **Gönderildi:** Sunucuya ulaştı (Tek Gri Tik).
    * ✔️✔️ **İletildi:** Alıcıya ulaştı (Çift Gri Tik).
    * ✅ **Okundu:** Alıcı mesajı görüntüledi (Çift Mavi Tik).

### 🖼️ Gelişmiş Medya Yönetimi
* **Görsel Gönderimi:** Yüksek kaliteli fotoğraf paylaşımı.
* **Profesyonel Görsel Önizleme Modu:**
    * **Zoom Kontrolü:** `+` ve `-` butonları ile görsellere yakınlaşma/uzaklaşma.
    * **Sıfırla (Reset):** Zoom yapıldığında beliren "SIFIRLA" butonu ile görseli tek tıkla %100 boyutuna döndürme.
    * **Pan:** Yakınlaştırılmış görsel üzerinde gezinme.
    * **İndirme:** Görseli orijinal kalitede cihaza kaydetme.
    * **Animasyonlar:** Açılış ve zoom işlemleri için yumuşak geçiş efektleri.

### 🛡️ Gizlilik ve Yönetim
* **Mesaj Silme:**
    * **Benden Sil:** Mesajı sadece kendi geçmişinizden kaldırın.
    * **Herkesten Sil:** Gönderdiğiniz mesajı tüm alıcılardan kalıcı olarak silin.
* **Kullanıcı Engelleme:** İstemediğiniz kişileri engelleyerek mesaj almayı durdurun.
* **Sohbet Sabitleme:** Önemli sohbetleri listenin en başına tutturun.
* **Son Görülme:** Kullanıcıların çevrimiçi durumunu ve son görülme zamanını takip edin.

### 🎨 Arayüz (UI/UX)
* **Yeniden Boyutlandırılabilir Kenar Çubuğu (Resizable Sidebar):** Sohbet listesi genişliğini tercihinize göre ayarlayın.
* **Sağ Tık Menüleri:** Sohbetler ve mesajlar üzerinde sağ tık ile hızlı aksiyon menüleri.
* **Detaylı Bilgi Ekranı:** Mesajın kimler tarafından ne zaman okunduğunu veya kime iletildiğini gösteren detay paneli.
* **Responsive Tasarım:** Mobil ve masaüstü uyumlu modern arayüz.

---

## 🛠️ Kullanılan Teknolojiler

* **Frontend:** Next.js 14, React, TypeScript
* **Styling:** Tailwind CSS, Heroicons (SVG)
* **Backend & Database:** Supabase (PostgreSQL)
* **Storage:** Supabase Storage (Görseller için)
* **Diğer Kütüphaneler:** `react-hot-toast` (Bildirimler), `emoji-picker-react`

---

## 📂 Proje Yapısı

Projenin temel dosya ve klasör yapısı aşağıdadır. Bu yapı, **Next.js App Router** standartlarına uygun olarak düzenlenmiştir.

```text
📦 nextjs-chat-app
├── 📂 app
│   ├── 📄 globals.css       # Global stiller ve Tailwind direktifleri
│   ├── 📄 layout.tsx        # Kök düzen (Fontlar, Toaster vb.)
│   ├── 📄 page.tsx          # Ana Sohbet Arayüzü (UI Bileşenleri)
│   └── 📄 useChat.ts        # Özel Hook (Tüm mantık, state ve Supabase işlemleri)
├── 📂 lib
│   └── 📄 supabase.ts       # Supabase istemci konfigürasyonu
├── 📂 public
│   └── 📂 ...               # Statik görseller ve ikonlar
├── 📄 .env.local            # Çevre değişkenleri (API Anahtarları)
├── 📄 next.config.mjs       # Next.js ayar dosyası
├── 📄 package.json          # Proje bağımlılıkları
├── 📄 tailwind.config.ts    # Tailwind CSS konfigürasyonu
└── 📄 tsconfig.json         # TypeScript ayarları

---