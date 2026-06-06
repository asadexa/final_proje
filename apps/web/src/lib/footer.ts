// Footer yapisi (moduler: footer linklerini degistirmek icin sadece burayi duzenle).
// krontech footer'i birebir: Products / Sectors / About Us / Social Media + alt yasal bar.

export interface FooterLink {
  label: string;
  slug?: string; // /[locale]/<slug>
  href?: string; // dis link
}

export interface FooterColumn {
  titleKey: "products" | "sectors" | "about";
  links: FooterLink[];
}

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    titleKey: "products",
    links: [
      { label: "Kron PAM", slug: "kron-pam" },
      { label: "Network Performance Monitoring", slug: "network-performance-monitoring" },
      { label: "Authentication, Authorization, Accounting", slug: "aaa" },
      { label: "IPDR Logging", slug: "ipdr-logging" },
      { label: "Quality Assurance", slug: "quality-assurance" },
    ],
  },
  {
    titleKey: "sectors",
    links: [
      { label: "Energy", slug: "energy" },
      { label: "Finance", slug: "finance" },
      { label: "Government", slug: "government" },
      { label: "Telecom", slug: "telecom" },
    ],
  },
  {
    titleKey: "about",
    links: [
      { label: "Management", slug: "management" },
      { label: "Board of Directors", slug: "board-of-directors" },
      { label: "Human Resources", slug: "human-resources" },
      { label: "Newsroom", slug: "newsroom" },
      { label: "Announcements", slug: "announcements" },
      { label: "Awards", slug: "awards" },
    ],
  },
];

export type SocialIconName = "linkedin" | "x" | "instagram" | "youtube";

export interface SocialLink {
  label: string;
  href: string;
  icon: SocialIconName;
}

export const SOCIALS: SocialLink[] = [
  { label: "Linkedin", href: "https://www.linkedin.com/company/krontech", icon: "linkedin" },
  { label: "X", href: "https://x.com/kron_tech", icon: "x" },
  { label: "Instagram", href: "https://www.instagram.com/kron.tech/", icon: "instagram" },
  { label: "Youtube", href: "https://www.youtube.com/channel/UCMV3_pdImKw-DeL6TC0uQQA", icon: "youtube" },
];

// Alt yasal bar (subfooter) linkleri.
export const FOOTER_LEGAL: FooterLink[] = [
  {
    label: "Information Society Services",
    href: "https://e-sirket.mkk.com.tr/esir/Dashboard.jsp#/sirketbilgileri/10854",
  },
  { label: "Privacy Policy", slug: "privacy-policy" },
  { label: "Information Note", slug: "information-note" },
  { label: "Cookie Policy", slug: "cookie-policy" },
];
