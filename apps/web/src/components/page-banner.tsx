import type { ReactElement } from "react";

// krontech `pages-top-image` + `breadcrumb-desktop` birebir (resources/contact):
// 1140 kapsayici icinde 226px gorsel bant (`.gray-bg-top`, no-overlay), h1 SEO/erisilebilirlik
// icin var ama gorunmez (krontech `display-3 invisible`); altinda 11px breadcrumb (son oge bold).
export function PageBanner({
  title,
  image,
  crumbs,
}: {
  title: string;
  image: string;
  crumbs: string[];
}): ReactElement {
  return (
    <>
      <section>
        <div className="mx-auto max-w-[1140px] sm:px-6">
          <div
            className="flex h-[226px] items-center bg-black bg-cover bg-center"
            style={{ backgroundImage: `url('${image}')` }}
          >
            <h1 className="sr-only">{title}</h1>
          </div>
        </div>
      </section>
      <nav aria-label="breadcrumb" className="mt-3">
        <div className="mx-auto max-w-[1140px] px-4 sm:px-6">
          <ol className="flex flex-wrap items-center gap-1 text-[11px] text-[#333]">
            {crumbs.map((c, i) => (
              <li key={i} className={i === crumbs.length - 1 ? "font-semibold" : ""}>
                {i > 0 && <span className="mx-1 font-normal text-[#999]">/</span>}
                {c}
              </li>
            ))}
          </ol>
        </div>
      </nav>
    </>
  );
}
