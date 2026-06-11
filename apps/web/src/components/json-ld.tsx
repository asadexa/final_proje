import type { ReactElement } from "react";

// schema.org JSON-LD enjekte eder. Icerik CMS'ten gelir; baslik/FAQ gibi alanlar
// editor tarafindan duzenlenebildigi icin `<` karakterini <'ye kacirarak
// </script> ile script-breakout'u engelleriz (JSON.stringify bunu yapmaz).
export function JsonLd({ data }: { data: Record<string, unknown> }): ReactElement {
  const json = JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
