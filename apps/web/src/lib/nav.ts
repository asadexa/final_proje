// Header navigasyon yapisi (moduler: menuyu degistirmek icin sadece burayi duzenle).
// slug'lar krontech'in gercek URL'leriyle eslesir; icerik eklendikce linkler calisir.

export type NavKey =
  | "products"
  | "solutions"
  | "partners"
  | "resources"
  | "about"
  | "contact";

export interface NavChild {
  label: string;
  slug?: string; // /[locale]/<slug>
  href?: string; // dis link
}

export interface NavItem {
  key: NavKey;
  slug?: string; // dropdown yoksa dogrudan link
  children?: NavChild[];
}

export const NAV: NavItem[] = [
  {
    key: "products",
    children: [
      { label: "Kron PAM", slug: "kron-pam" },
      { label: "Cloud PAM", slug: "cloudpam" },
      { label: "Password Vault", slug: "password-vault" },
      { label: "Privileged Session Manager", slug: "privileged-session-manager" },
      { label: "Database Access Manager", slug: "database-access-manager" },
      { label: "Dynamic Data Masking", slug: "dynamic-data-masking" },
      { label: "Multi-Factor Authentication", slug: "multi-factor-authentication" },
      { label: "AAA Server", slug: "aaa" },
      { label: "Telemetry Pipeline", slug: "telemetry-pipeline" },
    ],
  },
  {
    key: "solutions",
    children: [
      { label: "Zero Trust & Least Privilege", slug: "zero-trust-and-least-privilege" },
      { label: "Secure Remote Access", slug: "secure-remote-access" },
      { label: "Insider Threat Protection", slug: "insider-threat-protection" },
      { label: "PAM as a Service", slug: "pam-as-a-service" },
      { label: "Audit & Regulatory Compliance", slug: "audit-and-regulatory-compliance" },
      { label: "OT Security with Kron PAM", slug: "ot-security-with-kron-pam" },
    ],
  },
  {
    key: "partners",
    children: [
      { label: "Partner Portal", href: "https://partner.krontech.com/" },
      { label: "Events", href: "https://partner.krontech.com/kron-expo-meetings" },
    ],
  },
  {
    key: "resources",
    children: [
      { label: "Datasheets", slug: "kron-pam-resources" },
      { label: "Case Studies", slug: "case-studies" },
      { label: "Blog", slug: "blog" },
      { label: "Podcast", slug: "podcast" },
      { label: "Resources Hub", slug: "cybersecurity-resources" },
    ],
  },
  {
    key: "about",
    children: [
      { label: "About Us", slug: "about-us" },
      { label: "Management", slug: "management" },
      { label: "Careers", slug: "human-resources" },
      { label: "Newsroom", slug: "newsroom" },
      { label: "Awards", slug: "awards" },
    ],
  },
  { key: "contact", slug: "contact" },
];
