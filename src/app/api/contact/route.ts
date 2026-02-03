import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { ContactSchema } from '@/features/contact/types';

// 1. Upstash Redis Yapılandırması (Hız Sınırı Kontrolü İçin)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// 2. Rate Limit Tanımlama: IP başına 1 saatte en fazla 3 başarılı istek
const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(3, "1 h"),
});

export async function POST(request: Request) {
  try {
    // A. IP Bazlı Hız Sınırı Kontrolü
    const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
    const { success, limit, reset, remaining } = await ratelimit.limit(ip);

    if (!success) {
      return NextResponse.json(
        { 
          error: "Çok fazla istek gönderdiniz. Güvenlik nedeniyle lütfen bir saat sonra tekrar deneyiniz." 
        },
        { 
          status: 429, // Too Many Requests
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
      to: process.env.EMAIL_USER, // Form mesajı size gelecek
      replyTo: email,           // Yanıtla dendiğinde kullanıcıya gitsin
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

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error("İşlem hatası:", error);
    return NextResponse.json({ error: "Sunucu tarafında bir hata oluştu." }, { status: 500 });
  }
}