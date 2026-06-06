import type { ReactElement } from "react";

// schema.org JSON-LD enjekte eder. Icerik bizim CMS'imizden gelir (guvenilir kaynak).
export function JsonLd({ data }: { data: Record<string, unknown> }): ReactElement {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
