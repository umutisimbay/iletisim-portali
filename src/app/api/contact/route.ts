import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { ContactSchema } from '@/features/contact/types'; 
// Not: Eğer types import hatası alırsan kendi dosya yolunu kontrol et.

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Backend tarafında veriyi tekrar doğrula (Güvenlik)
    const result = ContactSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Veri doğrulama hatası" }, { status: 400 });
    }

    const { name, email, message } = result.data;

    // 2. Transporter Oluştur (Postacı)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 3. Mail Seçeneklerini Hazırla
    const mailOptions = {
      from: process.env.EMAIL_USER, // Gönderen (Senin sunucun)
      to: process.env.EMAIL_USER,   // Alıcı (Yine sen - kendine bildirim atıyorsun)
      replyTo: email,               // "Yanıtla" deyince formu dolduran kişiye yanıtla
      subject: `Yeni İletişim Formu Mesajı: ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #4F46E5;">Yeni Bir Mesajın Var! 🚀</h2>
          <p><strong>Kimden:</strong> ${name} (${email})</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 16px; color: #333;">${message}</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #888;">Bu mesaj web sitendeki iletişim formundan gönderildi.</p>
        </div>
      `,
    };

    // 4. Maili Gönder
    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error("Mail gönderme hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası oluştu" }, { status: 500 });
  }
}