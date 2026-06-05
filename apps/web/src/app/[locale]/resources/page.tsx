import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "@/lib/i18n";

export default async function ResourcesPage({ params }: PageProps<"/[locale]/resources">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <div className="mx-auto max-w-[1140px] px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-dark">{dict.nav.resources}</h1>
      <p className="mt-4 text-ink-soft">
        {locale === "tr"
          ? "Datasheet, vaka çalışması ve teknik dökümanlar burada listelenecek."
          : "Datasheets, case studies and technical documents will be listed here."}
      </p>
    </div>
  );
}
