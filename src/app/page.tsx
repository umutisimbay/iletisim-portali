import { ContactForm } from "../features/contact/components/ContactForm";

export default function Home() {
  return (
    /* Ana Konteynır */
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-6 antialiased bg-gradient-to-br from-zinc-50 via-white to-indigo-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-indigo-950">
      
      {/* Arka Plan Dekorasyonu */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[10%] left-[15%] w-64 h-64 bg-indigo-200/30 dark:bg-indigo-900/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[10%] right-[15%] w-80 h-80 bg-zinc-200/40 dark:bg-zinc-800/20 rounded-full blur-3xl" />
      </div>

      {/* Merkezlenmiş Başlık Alanı */}
      <header className="z-10 w-full max-w-lg flex flex-col items-center mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white text-center leading-tight">
          İletişim Bilgi Formu
        </h1>
        {/* Opsiyonel: Başlığın altına çok ince bir dekoratif çizgi */}
        <div className="mt-4 w-12 h-1 bg-indigo-600 rounded-full opacity-20" />
      </header>

      {/* Form Alanı (Aynı max-w-lg genişliğinde) */}
      <main className="relative z-10 w-full flex justify-center">
        <ContactForm />
      </main>

      {/* Alt Bilgi */}
      <footer className="mt-12 text-sm text-zinc-400 dark:text-zinc-600">
        <p>© 2026 Geliştirici Portalı. Tüm hakları saklıdır.</p>
      </footer>
    </div>
  );
}