import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { ContactSchema } from '@/features/contact/types';

// 1. Upstash Redis Yapılandırması
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// 2. Rate Limit Tanımlama (Test için 1 saatte 3 yerine 2 dakikada 2 yapabilirsin)
const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(3, "1 h"),
});

export async function POST(request: Request) {
  // Hata Ayıklama Logları - Vercel Logs panelinde görünecek
  console.log("--- API İSTEĞİ BAŞLADI ---");
  console.log("Redis URL Kontrolü:", process.env.UPSTASH_REDIS_REST_URL ? "OK" : "EKSİK!");
  console.log("Redis Token Kontrolü:", process.env.UPSTASH_REDIS_REST_TOKEN ? "OK" : "EKSİK!");

  try {
    // A. IP Bazlı Hız Sınırı Kontrolü
    // Vercel üzerinde daha hassas IP tespiti için x-real-ip eklendi
    const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for") ?? "127.0.0.1";
    console.log("İstek Gelen IP:", ip);

    const { success, limit, reset, remaining } = await ratelimit.limit(ip);
    console.log(`Rate Limit Sonucu: ${success ? "GEÇTİ" : "TAKILDI"} | Kalan Hak: ${remaining}`);

    if (!success) {
      console.warn("DİKKAT: Rate Limit aşıldı, mail gönderimi engelleniyor.");
      return NextResponse.json(
        { 
          error: "Çok fazla istek gönderdiniz. Güvenlik nedeniyle lütfen bir saat sonra tekrar deneyiniz." 
        },
        { 
          status: 429, 
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          }
        }
      );
    }

    // B. Veri Doğrulama (Zod)
    const body = await request.json();
    const result = ContactSchema.safeParse(body);
    
    if (!result.success) {
      console.error("Zod Doğrulama Hatası:", result.error);
      return NextResponse.json({ error: "Girdiğiniz veriler doğrulanamadı." }, { status: 400 });
    }

    const { name, email, message } = result.data;

    // C. Nodemailer - SMTP Yapılandırması
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // D. Mail İçeriği ve Gönderimi
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      replyTo: email,
      subject: `İletişim Formu: ${name}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #4F46E5;">Yeni Bir İletişim Mesajı! 🚀</h2>
          <p><strong>Gönderen:</strong> ${name} (${email})</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="white-space: pre-wrap;">${message}</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 11px; color: #888;">Bu mesaj web siteniz üzerinden Rate Limit korumasıyla iletildi.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("Mail başarıyla gönderildi.");

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error("KRİTİK HATA:", error);
    return NextResponse.json({ error: "Sunucu tarafında bir hata oluştu." }, { status: 500 });
  }
}