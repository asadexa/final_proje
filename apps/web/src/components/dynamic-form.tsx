"use client";

import { type FormEvent, type ReactElement, useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface FieldDef {
  name: string;
  label?: string;
  type?: string;
  required?: boolean;
  options?: string[];
}
interface FormDef {
  key: string;
  name: string;
  fields: FieldDef[];
}
type Status = "idle" | "sending" | "ok" | "error";

const inputCls =
  "h-[50px] w-full rounded border border-[#a7a7a8] bg-surface px-3 text-sm text-ink outline-none";

// CONTACT_FORM blogunun public yuzu: FormDefinition'i API'den ceker ve
// alanlarini OLDUGU GIBI render eder. Admin'de tanimlanan her form
// (orn. form-test) bir sayfaya bu blokla eklenip aninda test edilebilir.
export function DynamicForm({
  formKey,
  title,
  consentText,
  locale,
}: {
  formKey: string;
  title?: string;
  consentText?: string;
  locale: string;
}): ReactElement | null {
  const tr = locale === "tr";
  const [def, setDef] = useState<FormDef | null>(null);
  const [missing, setMissing] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch(`${API}/api/forms/${formKey}`)
      .then((r) => (r.ok ? (r.json() as Promise<FormDef>) : null))
      .then((d) => (d ? setDef(d) : setMissing(true)))
      .catch(() => setMissing(true));
  }, [formKey]);

  if (missing) {
    // Form tanimi yok/pasif: public sayfada sessiz kal (icerik bozulmasin)
    return null;
  }
  if (!def) return null;

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!def) return;
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
      data: Object.fromEntries(def.fields.map((f) => [f.name, fd.get(f.name) ?? ""])),
      consent,
      hp: String(fd.get("website") ?? ""),
      localeCode: locale,
    };
    try {
      const res = await fetch(`${API}/api/forms/${formKey}/submit`, {
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
    <section className="py-12">
      <div className="mx-auto max-w-[1140px] px-4 sm:px-6">
        <div className="mx-auto max-w-[950px] bg-surface p-6 shadow-[0_6px_12px_-4px_rgba(37,38,41,0.12)] md:p-12">
          <h3 className="mb-6 text-[1.75rem] font-medium text-dark">{title ?? def.name}</h3>
          {status === "ok" ? (
            <p className="text-center text-lg font-medium text-dark">
              {tr ? "Teşekkürler! Gönderiminiz alındı." : "Thank you! Your submission was received."}
            </p>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="hidden"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                {def.fields.map((f) => {
                  const label = f.label ?? f.name;
                  const ph = f.required ? `${label} *` : label;
                  const full = f.type === "textarea" || (f.options?.length ?? 0) > 4;
                  return (
                    <div key={f.name} className={full ? "sm:col-span-2" : ""}>
                      <label htmlFor={`df-${f.name}`} className="sr-only">
                        {label}
                      </label>
                      {f.type === "textarea" ? (
                        <textarea
                          id={`df-${f.name}`}
                          name={f.name}
                          required={f.required}
                          placeholder={ph}
                          rows={3}
                          className="w-full rounded border border-[#a7a7a8] bg-surface px-3 py-3 text-sm text-ink outline-none"
                        />
                      ) : f.type === "select" ? (
                        <select
                          id={`df-${f.name}`}
                          name={f.name}
                          required={f.required}
                          defaultValue=""
                          className={inputCls}
                        >
                          <option value="">{ph}</option>
                          {(f.options ?? []).map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={`df-${f.name}`}
                          name={f.name}
                          type={f.type === "email" ? "email" : f.type === "tel" ? "tel" : "text"}
                          required={f.required}
                          placeholder={ph}
                          className={inputCls}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              {status === "error" && <p className="text-sm text-accent">{error}</p>}
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <label className="flex max-w-xl items-start gap-2 text-xs leading-5 text-ink-soft">
                  <input type="checkbox" name="consent" className="mt-0.5" />
                  <span>
                    {consentText ??
                      (tr
                        ? "Kişisel verilerimin Gizlilik Politikası kapsamında işlenmesini onaylıyorum (KVKK)."
                        : "I consent to the processing of my personal data under the Privacy Policy.")}
                  </span>
                </label>
                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="inline-block shrink-0 rounded-none bg-primary px-[50px] py-3 text-[16px] font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-60"
                >
                  {status === "sending" ? (tr ? "Gönderiliyor..." : "Sending...") : tr ? "Gönder" : "Send"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
