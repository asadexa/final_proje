"use client";

import { type FormEvent, type ReactElement, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Status = "idle" | "sending" | "ok" | "error";

// Krontech .dark-form input: seffaf zemin, beyaz metin, 46px yukseklik.
const inputCls =
  "h-[46px] w-full rounded border border-white/30 bg-transparent px-3 text-sm text-white " +
  "placeholder:text-white/70 outline-none focus:border-white";

// Footer ustu koyu "Bize Ulasin" bandi (krontech .footer-top.dark-form paritesi):
// koyu gorsel zemin + rgba(0,0,0,.83) overlay, 110px dikey padding,
// sol kolon baslik 32px bold + aciklama, sag kolon 2 sutunlu form.
export function FooterContactForm({ locale }: { locale: string }): ReactElement {
  const tr = locale === "tr";
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const consent = fd.get("consent") === "on";
    if (!consent) {
      setError(tr ? "Devam etmek için KVKK onayı gerekli." : "Consent is required to continue.");
      setStatus("error");
      return;
    }
    setStatus("sending");
    setError("");
    const body = {
      data: {
        firstName: fd.get("firstName"),
        lastName: fd.get("lastName"),
        company: fd.get("company"),
        email: fd.get("email"),
        country: fd.get("country"),
        phone: fd.get("phone"),
      },
      consent,
      hp: String(fd.get("website") ?? ""), // honeypot
      localeCode: locale,
    };
    try {
      const res = await fetch(`${API}/api/forms/footer-contact/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setStatus("ok");
        form.reset();
      } else {
        const j = (await res.json().catch(() => ({}))) as { message?: string };
        setError(j.message ?? (tr ? "Gönderilemedi." : "Could not send."));
        setStatus("error");
      }
    } catch {
      setError(tr ? "Ağ hatası, tekrar deneyin." : "Network error, please retry.");
      setStatus("error");
    }
  }

  return (
    <section
      className="relative bg-cover bg-bottom"
      style={{ backgroundImage: "url(/kron/footer-form-bg.jpg)" }}
    >
      <div className="absolute inset-0 bg-black/[.83]" aria-hidden />
      <div className="relative z-10 mx-auto max-w-[1140px] px-4 py-[110px] sm:px-6">
        <div className="grid gap-10 md:grid-cols-3">
          {/* Sol: baslik + aciklama */}
          <div>
            <div className="mb-[18px] text-[32px] font-bold text-white">
              {tr ? "Bize Ulaşın" : "Contact Us"}
            </div>
            <p className="text-sm leading-6 text-white">
              {tr
                ? "Kron Teknoloji'nin telekom ve siber güvenlik ürünleri hakkında bilgi almak için bize ulaşın."
                : "Contact us to learn more about Kron Technologies' telecom and cybersecurity products."}
            </p>
          </div>

          {/* Sag: 2 sutunlu form */}
          <div className="md:col-span-2">
            {status === "ok" ? (
              <p className="text-lg font-medium text-white">
                {tr
                  ? "Teşekkürler! Mesajınız alındı, en kısa sürede dönüş yapacağız."
                  : "Thank you! Your message was received; we will get back to you shortly."}
              </p>
            ) : (
              <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
                {/* Honeypot: insanlar gormez, botlar doldurur -> sunucu spam isaretler */}
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="hidden"
                />
                <input name="firstName" required placeholder={tr ? "İsim" : "First Name"} className={inputCls} />
                <input name="lastName" required placeholder={tr ? "Soyisim" : "Last Name"} className={inputCls} />
                <input name="company" placeholder={tr ? "Şirket" : "Company"} className={inputCls} />
                <input
                  name="email"
                  type="email"
                  required
                  placeholder={tr ? "E-posta Adresiniz" : "E-Mail"}
                  className={inputCls}
                />
                <input name="country" placeholder={tr ? "Ülke" : "Country"} className={inputCls} />
                <input name="phone" type="tel" placeholder={tr ? "Telefon" : "Phone"} className={inputCls} />

                {/* Sol alt: KVKK onayi (12px, %51 beyaz) */}
                <label className="flex items-start gap-2 text-xs leading-6 text-white/50">
                  <input type="checkbox" name="consent" className="mt-1.5" />
                  <span>
                    {tr
                      ? "Kişisel verilerimin Gizlilik Politikası kapsamında yurt içi ve yurt dışındaki üçüncü kişilere aktarılmasına onay veriyorum (KVKK)."
                      : "I hereby consent to the processing and transfer of my personal data within the scope of the Privacy Policy."}
                  </span>
                </label>

                {/* Sag alt: gonder butonu (btn-block) */}
                <div className="flex flex-col justify-end gap-2">
                  {status === "error" && <p className="text-sm text-red-400">{error}</p>}
                  <button
                    type="submit"
                    disabled={status === "sending"}
                    className="h-[46px] w-full rounded-none bg-primary text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-60"
                  >
                    {status === "sending"
                      ? tr
                        ? "Gönderiliyor..."
                        : "Sending..."
                      : tr
                        ? "Gönder"
                        : "Send"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
