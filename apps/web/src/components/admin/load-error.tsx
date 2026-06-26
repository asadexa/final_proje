"use client";

import type { ReactElement } from "react";

// Paylasilan yukleme-hatasi kutusu (C3): liste sayfalari API coktugunde sessiz bos tablo
// yerine bunu gosterir — kullanici "hata" ile "veri yok"u ayirt eder + tekrar deneyebilir.
export function LoadError({
  onRetry,
  label,
}: {
  onRetry: () => void;
  label?: string;
}): ReactElement {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
      <p className="text-sm font-medium text-red-800">
        {label ?? "Veriler yüklenemedi — sunucuya ulaşılamadı."}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700"
      >
        Tekrar dene
      </button>
    </div>
  );
}
