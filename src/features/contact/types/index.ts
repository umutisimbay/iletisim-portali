import { z } from "zod";

/**
 * Formun doğrulama kuralları (Zod Schema)
 * Dökümandaki "Strict Validation" kuralına uygun olarak oluşturulmuştur.
 */
export const ContactSchema = z.object({
  name: z.string().min(2, "İsim en az 2 karakter olmalıdır"),
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  subject: z.string().min(3, "Konu en az 3 karakter olmalıdır").optional().or(z.literal("")),
  message: z.string().min(10, "Mesajınız en az 10 karakter olmalıdır"),
});

/**
 * TypeScript tipini Zod şemasından otomatik olarak türetiyoruz.
 * Bu sayede şema güncellendiğinde tip de otomatik güncellenir.
 */
export type ContactFormData = z.infer<typeof ContactSchema>;

/**
 * API'den dönecek yanıtın yapısı
 * (Bu yapı şemadan bağımsız olduğu için interface olarak kalabilir)
 */
export interface ContactResponse {
  success: boolean;
  message: string;
}