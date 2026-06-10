"use client";

import type { ReactElement } from "react";
import { MediaPicker } from "./media-picker";

// Son-kullanici dostu blok editoru: ham JSON yerine blok tipine gore form.
// Alan tanimlari @kron/shared Zod semalariyla birebir eslesir (tek kaynak orada;
// burasi onun UI izdusumu). Bilinmeyen tip -> JSON fallback (editor sayfasinda).

type Kind =
  | "text"
  | "textarea"
  | "richtext"
  | "number"
  | "checkbox"
  | "select"
  | "link"
  | "image"
  | "stringlist"
  | "list";

export interface FieldSpec {
  key: string;
  label: string;
  kind: Kind;
  hint?: string;
  options?: string[]; // select
  fields?: FieldSpec[]; // list satir alanlari
}

const LINK: (key: string, label: string) => FieldSpec = (key, label) => ({
  key,
  label,
  kind: "link",
});
const IMG: (key: string, label: string) => FieldSpec = (key, label) => ({
  key,
  label,
  kind: "image",
});

export const BLOCK_FORMS: Record<string, FieldSpec[]> = {
  HERO: [
    { key: "variant", label: "Görünüm", kind: "select", options: ["", "product"], hint: "product = ürün sayfası banner'ı" },
    { key: "eyebrow", label: "Üst etiket", kind: "text" },
    { key: "title", label: "Başlık", kind: "text", hint: "<b>...</b> = mavi vurgu" },
    { key: "subtitle", label: "Alt başlık", kind: "textarea" },
    LINK("cta", "Buton"),
    IMG("image", "Arka plan görseli"),
    {
      key: "buttons", label: "Butonlar (ürün banner'ı)", kind: "list",
      fields: [
        { key: "label", label: "Etiket", kind: "text" },
        { key: "href", label: "Bağlantı", kind: "text", hint: "boş = tıklanamaz" },
      ],
    },
    {
      key: "slides", label: "Slaytlar (ana sayfa karuseli)", kind: "list",
      fields: [
        { key: "eyebrow", label: "Üst etiket", kind: "text" },
        { key: "title", label: "Başlık", kind: "text", hint: "<b>...</b> = mavi vurgu" },
        { key: "subtitle", label: "Alt başlık", kind: "textarea" },
        LINK("cta", "Buton"),
        IMG("image", "Zemin görseli"),
        IMG("graphic", "Sağ grafik (şeffaf png)"),
      ],
    },
  ],
  SECTION_HEADING: [
    { key: "title", label: "Başlık", kind: "text" },
    { key: "intro", label: "Giriş metni", kind: "textarea" },
    { key: "align", label: "Hizalama", kind: "select", options: ["left", "center"] },
  ],
  FEATURE_GRID: [
    { key: "title", label: "Başlık", kind: "text" },
    {
      key: "items", label: "Öğeler", kind: "list",
      fields: [
        { key: "title", label: "Başlık", kind: "text" },
        { key: "description", label: "Açıklama", kind: "textarea" },
        { key: "icon", label: "İkon (URL)", kind: "text" },
      ],
    },
  ],
  PRODUCT_SHOWCASE: [
    { key: "title", label: "Başlık", kind: "text" },
    { key: "subtitle", label: "Alt başlık", kind: "textarea" },
    { key: "moreLabel", label: "Kart buton metni", kind: "text" },
    {
      key: "products", label: "Ürünler", kind: "list",
      fields: [
        { key: "name", label: "Ad", kind: "text" },
        { key: "description", label: "Açıklama", kind: "textarea" },
        { key: "href", label: "Bağlantı", kind: "text" },
        { key: "features", label: "Özellikler (her satır bir madde)", kind: "stringlist" },
        IMG("image", "Görsel"),
      ],
    },
  ],
  VALUE_PROP: [
    { key: "title", label: "Başlık", kind: "text", hint: "<b>...</b> = mavi vurgu" },
    { key: "body", label: "Metin", kind: "textarea" },
    LINK("cta", "Buton"),
    IMG("image", "Görsel"),
  ],
  STATS: [
    { key: "title", label: "Başlık", kind: "text" },
    { key: "subtitle", label: "Alt başlık", kind: "textarea" },
    {
      key: "items", label: "Sayılar", kind: "list",
      fields: [
        { key: "value", label: "Değer", kind: "text" },
        { key: "label", label: "Etiket", kind: "text" },
        IMG("icon", "İkon"),
      ],
    },
  ],
  CASE_STUDY: [
    { key: "title", label: "Başlık", kind: "text", hint: "<b>...</b> = mavi kutu vurgu" },
    { key: "excerpt", label: "Özet", kind: "textarea" },
    IMG("image", "Görsel"),
    LINK("cta", "Buton"),
  ],
  BLOG_CAROUSEL: [
    { key: "title", label: "Başlık", kind: "text" },
    { key: "limit", label: "Yazı sayısı", kind: "number" },
  ],
  RICH_TEXT: [
    { key: "html", label: "İçerik (HTML)", kind: "richtext", hint: "h2/h3/p/ul/ol/blockquote/a kullanılabilir" },
  ],
  MEDIA_TEXT: [
    { key: "title", label: "Başlık", kind: "text", hint: "<b>...</b> = mavi kutu vurgu" },
    { key: "body", label: "Metin", kind: "textarea", hint: "Boş satırla ayırarak çok paragraf" },
    IMG("image", "Görsel"),
    { key: "imageSide", label: "Görsel tarafı", kind: "select", options: ["left", "right"] },
    LINK("cta", "Buton (opsiyonel)"),
  ],
  LOGO_CLOUD: [
    { key: "title", label: "Başlık", kind: "text" },
    { key: "logos", label: "Logolar", kind: "list", fields: [{ key: "url", label: "Görsel URL", kind: "text" }, { key: "alt", label: "Alt metin", kind: "text" }] },
  ],
  CTA_BANNER: [
    { key: "title", label: "Başlık", kind: "text" },
    LINK("cta", "Buton"),
  ],
  CONTACT_FORM: [
    { key: "title", label: "Başlık", kind: "text" },
    { key: "formKey", label: "Form anahtarı", kind: "text", hint: "Formlar sayfasındaki key (örn. contact)" },
    { key: "consentText", label: "KVKK metni", kind: "textarea" },
  ],
  FAQ: [
    { key: "title", label: "Başlık", kind: "text" },
    {
      key: "items", label: "Sorular", kind: "list",
      fields: [
        { key: "question", label: "Soru", kind: "text" },
        { key: "answer", label: "Cevap", kind: "textarea" },
      ],
    },
  ],
  PRODUCT_TABS: [
    { key: "breadcrumb", label: "Breadcrumb (her satır bir öğe)", kind: "stringlist" },
    {
      key: "tabs", label: "Sekmeler", kind: "list",
      fields: [
        { key: "label", label: "Etiket", kind: "text" },
        { key: "href", label: "Bağlantı", kind: "text", hint: "boş = tıklanamaz" },
        { key: "icon", label: "İkon URL", kind: "text" },
        { key: "active", label: "Aktif sekme", kind: "checkbox" },
      ],
    },
  ],
  TESTIMONIAL: [
    {
      key: "items", label: "Referanslar", kind: "list",
      fields: [
        { key: "title", label: "Başlık", kind: "text", hint: "<b>...</b> = beyaz kutu vurgu" },
        { key: "quote", label: "Alıntı", kind: "textarea" },
        { key: "author", label: "Yazar", kind: "text" },
        IMG("image", "Görsel"),
        IMG("logo", "Müşteri logosu"),
      ],
    },
  ],
};

// ----------------------------- jenerik renderer -----------------------------

type Obj = Record<string, unknown>;
const inputCls =
  "w-full rounded border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-primary";

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function obj(v: unknown): Obj {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {};
}
function arr(v: unknown): Obj[] {
  return Array.isArray(v) ? (v as Obj[]) : [];
}

function Field({
  spec,
  value,
  onChange,
}: {
  spec: FieldSpec;
  value: unknown;
  onChange: (v: unknown) => void;
}): ReactElement {
  const label = (
    <label className="mb-1 block text-xs font-medium text-ink-soft">
      {spec.label}
      {spec.hint && <span className="ml-2 font-normal text-muted">({spec.hint})</span>}
    </label>
  );
  switch (spec.kind) {
    case "text":
      return (
        <div>
          {label}
          <input className={inputCls} value={str(value)} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    case "textarea":
    case "richtext":
      return (
        <div>
          {label}
          <textarea
            className={inputCls}
            rows={spec.kind === "richtext" ? 8 : 3}
            value={str(value)}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
    case "number":
      return (
        <div>
          {label}
          <input
            type="number"
            className={inputCls}
            value={typeof value === "number" ? value : ""}
            onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          />
        </div>
      );
    case "checkbox":
      return (
        <label className="flex items-center gap-2 text-xs text-ink-soft">
          <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
          {spec.label}
        </label>
      );
    case "select":
      return (
        <div>
          {label}
          <select className={inputCls} value={str(value)} onChange={(e) => onChange(e.target.value || undefined)}>
            {(spec.options ?? []).map((o) => (
              <option key={o} value={o}>
                {o === "" ? "(varsayılan)" : o}
              </option>
            ))}
          </select>
        </div>
      );
    case "link": {
      const v = obj(value);
      return (
        <div>
          {label}
          <div className="grid grid-cols-2 gap-2">
            <input
              className={inputCls}
              placeholder="Etiket"
              value={str(v.label)}
              onChange={(e) => onChange({ ...v, label: e.target.value })}
            />
            <input
              className={inputCls}
              placeholder="/tr/contact"
              value={str(v.href)}
              onChange={(e) => onChange({ ...v, href: e.target.value })}
            />
          </div>
        </div>
      );
    }
    case "image": {
      const v = obj(value);
      return (
        <div>
          {label}
          <div className="flex items-start gap-3">
            {str(v.url) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={str(v.url)} alt="" className="h-12 w-20 shrink-0 rounded border border-line object-cover" />
            ) : (
              <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded border border-dashed border-line text-[10px] text-muted">
                yok
              </div>
            )}
            <div className="min-w-0 grow space-y-1">
              <input
                className={inputCls}
                placeholder="Görsel URL"
                value={str(v.url)}
                onChange={(e) => onChange({ ...v, url: e.target.value })}
              />
              <input
                className={inputCls}
                placeholder="Alt metin (erişilebilirlik)"
                value={str(v.alt)}
                onChange={(e) => onChange({ ...v, alt: e.target.value })}
              />
              <MediaPicker onPick={(m) => onChange({ ...v, url: m.url })} />
            </div>
          </div>
        </div>
      );
    }
    case "stringlist":
      return (
        <div>
          {label}
          <textarea
            className={inputCls}
            rows={3}
            value={Array.isArray(value) ? (value as string[]).join("\n") : ""}
            onChange={(e) => onChange(e.target.value.split("\n").filter((s) => s.trim() !== ""))}
          />
        </div>
      );
    case "list": {
      const rows = arr(value);
      return (
        <div>
          <div className="mb-1 flex items-center justify-between">
            {label}
            <button
              type="button"
              onClick={() => onChange([...rows, {}])}
              className="text-xs font-medium text-primary hover:underline"
            >
              + Ekle
            </button>
          </div>
          <div className="space-y-2">
            {rows.map((row, i) => (
              <div key={i} className="rounded border border-line bg-surface-muted p-3">
                <div className="mb-2 flex items-center justify-between text-xs text-muted">
                  <span>#{i + 1}</span>
                  <span className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...rows];
                        if (i > 0) [next[i - 1], next[i]] = [next[i], next[i - 1]];
                        onChange(next);
                      }}
                      className="hover:text-primary"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...rows];
                        if (i < next.length - 1) [next[i + 1], next[i]] = [next[i], next[i + 1]];
                        onChange(next);
                      }}
                      className="hover:text-primary"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange(rows.filter((_, j) => j !== i))}
                      className="text-accent hover:underline"
                    >
                      Sil
                    </button>
                  </span>
                </div>
                <div className="space-y-2">
                  {(spec.fields ?? []).map((f) => (
                    <Field
                      key={f.key}
                      spec={f}
                      value={row[f.key]}
                      onChange={(v) => {
                        const next = [...rows];
                        next[i] = { ...row, [f.key]: v };
                        onChange(next);
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
            {rows.length === 0 && <p className="text-xs text-muted">Henüz öğe yok — &quot;+ Ekle&quot;.</p>}
          </div>
        </div>
      );
    }
  }
}

export function BlockForm({
  type,
  data,
  onChange,
}: {
  type: string;
  data: Obj;
  onChange: (data: Obj) => void;
}): ReactElement | null {
  const specs = BLOCK_FORMS[type];
  if (!specs) return null;
  return (
    <div className="space-y-3">
      {specs.map((spec) => (
        <Field
          key={spec.key}
          spec={spec}
          value={data[spec.key]}
          onChange={(v) => onChange({ ...data, [spec.key]: v })}
        />
      ))}
    </div>
  );
}
