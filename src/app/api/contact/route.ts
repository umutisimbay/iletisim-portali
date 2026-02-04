import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { ContactSchema } from '@/features/contact/types';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(3, "1 h"),
});

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for") ?? "127.0.0.1";
    const { success, limit, reset, remaining } = await ratelimit.limit(ip);

    if (!success) {
      return NextResponse.json(
        { error: "Çok fazla istek gönderdiniz. Lütfen daha sonra tekrar deneyiniz." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const result = ContactSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: "Veri doğrulama hatası." }, { status: 400 });
    }

    const { name, email, message } = result.data;

    // SMTP Ayarları
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 1. ADMİN'E (SANA) GİDECEK MAİL
    const mailToAdmin = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      replyTo: email,
      subject: `🔔 Yeni İletişim Formu: ${name}`,
      html: `
        <div style="background-color: #f3f4f6; padding: 20px;">
          <div style="background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #4F46E5; margin-top: 0;">Yeni Mesaj Var!</h2>
            <p><strong>Kimden:</strong> ${name} (<a href="mailto:${email}">${email}</a>)</p>
            <p style="background-color: #f9fafb; padding: 15px; border-left: 4px solid #4F46E5; border-radius: 4px;">${message}</p>
            <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">Bu mesaj web sitenizden gönderildi.</p>
          </div>
        </div>
      `,
    };

    // 2. KULLANICIYA (MÜŞTERİYE) GİDECEK OTOMATİK YANIT
    const mailToUser = {
      from: `"Senin Adın veya Proje Adı" <${process.env.EMAIL_USER}>`, // Gönderen ismi özelleştirme
      to: email, // Formu dolduran kişinin mail adresi
      subject: `Mesajınız bize ulaştı, teşekkürler ${name}! 👋`,
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2 style="color: #10b981;">Merhaba ${name},</h2>
          <p>Bizimle iletişime geçtiğiniz için teşekkür ederiz. Mesajınız başarıyla ekibimize ulaştı.</p>
          <p>En kısa sürede inceleyip size bu e-posta adresi üzerinden dönüş yapacağız.</p>
          <br>
          <p>İyi günler dileriz,</p>
          <p><strong>Yazılım Ekibi</strong></p>
        </div>
      `,
    };

    // İki maili de aynı anda (paralel) göndererek işlemi hızlandırıyoruz
    await Promise.all([
      transporter.sendMail(mailToAdmin),
      transporter.sendMail(mailToUser)
    ]);

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error("Hata:", error);
    return NextResponse.json({ error: "Sunucu hatası oluştu." }, { status: 500 });
  }
}