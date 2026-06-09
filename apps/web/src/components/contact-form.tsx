"use client";

import { type FormEvent, type ReactElement, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Status = "idle" | "sending" | "ok" | "error";

// krontech .big-from input: 50px yukseklik, #a7a7a8 cerceve, golgesiz
const inputCls =
  "h-[50px] w-full rounded border border-[#a7a7a8] bg-surface px-3 text-sm text-ink outline-none";

function Field({
  name,
  label,
  type = "text",
  required,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}): ReactElement {
  const ph = required ? `${label} *` : label;
  return (
    <div>
      <label htmlFor={name} className="sr-only">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={ph}
        className={inputCls}
      />
    </div>
  );
}

function Select({
  name,
  placeholder,
  options,
  required,
}: {
  name: string;
  placeholder: string;
  options: string[];
  required?: boolean;
}): ReactElement {
  return (
    <div>
      <label htmlFor={name} className="sr-only">
        {placeholder}
      </label>
      <select id={name} name={name} required={required} defaultValue="" className={inputCls}>
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

// Iletisim formu — krontech contactPageForm birebir alan seti:
// Isim/Soyisim/E-posta/Unvan/Departman(select)/Sirket/Ulke/Telefon/
// arama-istegi(select)/Konu/Mesaj + KVKK. Client + sunucu validasyon,
// honeypot spam korumasi (`contact` FormDefinition ile eslesir).
export function ContactForm({ locale }: { locale: string }): ReactElement {
  const tr = locale === "tr";
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  const L = tr
    ? {
        firstName: "İsim", lastName: "Soyisim", email: "E-posta Adresiniz", jobtitle: "Ünvan",
        department: "Departman *", company: "Şirket", country: "Ülke", phone: "Telefon",
        call: "Yardımcı olmak için aramamızı ister misiniz?", subject: "Konu", message: "Mesaj",
        departments: ["İş Geliştirme", "Satın Alma", "Denetim/Uyumluluk", "Bulut/Dijital Dönüşüm", "Ar-Ge/Mühendislik", "Pazarlama", "Satış", "Finans", "Analiz"],
        callOpts: ["Evet", "Hayır"],
        kvkk: "Kişisel verilerimin Gizlilik Politikası uyarınca yurtiçi ve yurtdışındaki üçüncü kişilere aktarılmasına izin veriyorum ve bu konuda gereği gibi bilgilendirildiğimi kabul ediyorum.",
        send: "Gönder", sending: "Gönderiliyor...",
      }
    : {
        firstName: "First Name", lastName: "Last Name", email: "E-Mail", jobtitle: "Job Title",
        department: "Department *", company: "Company", country: "Country", phone: "Phone",
        call: "Do you need a call for assistance?", subject: "Subject", message: "Message",
        departments: ["Business Partnership", "Purchasing", "Audit/Compliance", "Cloud/Digital Transformation", "R&D", "Marketing", "Sales", "Finance", "Analysis"],
        callOpts: ["Yes", "No"],
        kvkk: "I hereby consent to the transfer of my personal data to third parties settled in Türkiye and abroad within the scope of the Privacy Policy and I accept that I have been duly informed regarding the subject.",
        send: "Send", sending: "Sending...",
      };

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
    const names = [
      "firstName", "lastName", "email", "jobtitle", "department",
      "company", "country", "phone", "call", "subject", "message",
    ] as const;
    const body = {
      data: Object.fromEntries(names.map((n) => [n, fd.get(n) ?? ""])),
      consent,
      hp: String(fd.get("website") ?? ""), // honeypot
      localeCode: locale,
    };
    try {
      const res = await fetch(`${API}/api/forms/contact/submit`, {
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

  if (status === "ok") {
    return (
      <div className="bg-surface p-8 text-center shadow-sm">
        <p className="text-lg font-medium text-dark">
          {tr ? "Teşekkürler! Mesajınız alındı." : "Thank you! Your message was received."}
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          {tr ? "En kısa sürede dönüş yapacağız." : "We will get back to you shortly."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Honeypot: insanlar gormez, botlar doldurur -> sunucu spam isaretler */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="firstName" label={L.firstName} required />
        <Field name="lastName" label={L.lastName} required />
        <Field name="email" type="email" label={L.email} required />
        <Field name="jobtitle" label={L.jobtitle} required />
        <Select name="department" placeholder={L.department} options={L.departments} required />
        <Field name="company" label={L.company} required />
        <Field name="country" label={L.country} />
        <Field name="phone" type="tel" label={L.phone} />
      </div>
      <Select name="call" placeholder={L.call} options={L.callOpts} />
      <Field name="subject" label={L.subject} required />
      <div>
        <label htmlFor="message" className="sr-only">
          {L.message}
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={3}
          placeholder={`${L.message} *`}
          className="w-full rounded border border-[#a7a7a8] bg-surface px-3 py-3 text-sm text-ink outline-none"
        />
      </div>
      {status === "error" && <p className="text-sm text-accent">{error}</p>}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <label className="flex max-w-xl items-start gap-2 text-xs leading-5 text-ink-soft">
          <input type="checkbox" name="consent" className="mt-0.5" />
          <span>{L.kvkk}</span>
        </label>
        <button
          type="submit"
          disabled={status === "sending"}
          className="inline-block shrink-0 rounded-none bg-primary px-[50px] py-3 text-[16px] font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-60"
        >
          {status === "sending" ? L.sending : L.send}
        </button>
      </div>
    </form>
  );
}
