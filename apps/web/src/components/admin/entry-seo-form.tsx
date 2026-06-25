"use client";

import type { ReactElement } from "react";
import type { SeoData } from "@/lib/types";

// Entry editor SEO formu (C2'de editorden cikarildi — sunumsal, davranis birebir ayni).
// Veri editorde tutulur; bu bilesen yalniz mevcut seo + degisiklik callback'i alir.
export function EntrySeoForm({
  seo,
  onChange,
}: {
  seo?: SeoData | null;
  onChange: (p: Partial<SeoData>) => void;
}): ReactElement {
  const inputCls = "w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";
  return (
    <div className="space-y-4 rounded-lg border border-line bg-surface p-5">
      <h2 className="text-sm font-semibold text-dark">SEO</h2>
      <div>
        <label className="mb-1 block text-sm font-medium text-ink-soft">Meta Title</label>
        <input
          className={inputCls}
          value={seo?.metaTitle ?? ""}
          onChange={(e) => onChange({ metaTitle: e.target.value })}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-ink-soft">Meta Description</label>
        <textarea
          className={inputCls}
          rows={2}
          value={seo?.metaDescription ?? ""}
          onChange={(e) => onChange({ metaDescription: e.target.value })}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-ink-soft">
          Canonical URL <span className="font-normal text-muted">(boş = otomatik)</span>
        </label>
        <input
          className={inputCls}
          placeholder="https://..."
          value={seo?.canonicalUrl ?? ""}
          onChange={(e) => onChange({ canonicalUrl: e.target.value || null })}
        />
      </div>
      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={seo?.robotsIndex ?? true}
            onChange={(e) => onChange({ robotsIndex: e.target.checked })}
          />
          Index
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={seo?.robotsFollow ?? true}
            onChange={(e) => onChange({ robotsFollow: e.target.checked })}
          />
          Follow
        </label>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-ink-soft">OG Title</label>
        <input
          className={inputCls}
          value={seo?.ogTitle ?? ""}
          onChange={(e) => onChange({ ogTitle: e.target.value || null })}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-ink-soft">OG Description</label>
        <textarea
          className={inputCls}
          rows={2}
          value={seo?.ogDescription ?? ""}
          onChange={(e) => onChange({ ogDescription: e.target.value || null })}
        />
      </div>
    </div>
  );
}
