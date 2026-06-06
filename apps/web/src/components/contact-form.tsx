"use client";

import { type FormEvent, type ReactElement, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Status = "idle" | "sending" | "ok" | "error";

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
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-ink-soft">
        {label}
        {required && <span className="text-accent"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-primary"
      />
    </div>
  );
}

export function ContactForm({ locale }: { locale: string }): ReactElement {
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
        fullName: fd.get("fullName"),
        email: fd.get("email"),
        subject: fd.get("subject"),
        message: fd.get("message"),
      },
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
      <div className="rounded-lg border border-line bg-surface p-8 text-center">
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
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-line bg-surface p-6">
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
        <Field name="fullName" label={tr ? "Ad Soyad" : "Full name"} required />
        <Field name="email" type="email" label={tr ? "E-posta" : "E-mail"} required />
      </div>
      <Field name="subject" label={tr ? "Konu" : "Subject"} required />
      <div>
        <label htmlFor="message" className="mb-1 block text-sm font-medium text-ink-soft">
          {tr ? "Mesaj" : "Message"}
          <span className="text-accent"> *</span>
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>
      <label className="flex items-start gap-2 text-sm text-ink-soft">
        <input type="checkbox" name="consent" className="mt-1" />
        <span>
          {tr
            ? "Kişisel verilerimin Gizlilik Politikası kapsamında işlenmesini onaylıyorum (KVKK)."
            : "I consent to the processing of my personal data under the Privacy Policy."}
        </span>
      </label>
      {status === "error" && <p className="text-sm text-accent">{error}</p>}
      <button
        type="submit"
        disabled={status === "sending"}
        className="inline-block rounded-none bg-primary px-[50px] py-3 text-[18px] font-normal leading-[34px] text-white transition-colors hover:bg-primary-600 disabled:opacity-60"
      >
        {status === "sending" ? (tr ? "Gönderiliyor..." : "Sending...") : tr ? "Gönder" : "Send"}
      </button>
    </form>
  );
}
