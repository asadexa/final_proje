import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { PrismaClient, type Prisma } from '../src/generated/prisma/client';

// Idempotent seed: tekrar calistirilabilir (upsert). docker compose up sirasinda otomatik calisir.
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL tanimli degil — seed calistirilamaz.');
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main(): Promise<void> {
  // 1) Diller
  await prisma.locale.upsert({
    where: { code: 'tr' },
    update: {},
    create: { code: 'tr', name: 'Turkce', isDefault: true, sortOrder: 0 },
  });
  await prisma.locale.upsert({
    where: { code: 'en' },
    update: {},
    create: { code: 'en', name: 'English', isDefault: false, sortOrder: 1 },
  });

  // 2) Admin kullanici (ortam degiskenlerinden)
  const email = process.env.ADMIN_EMAIL ?? 'admin@kron.local';
  const password = process.env.ADMIN_PASSWORD ?? 'Admin123!';
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, name: 'Admin', role: 'ADMIN' },
  });
  // Onay akisi demosu icin EDITOR rolu (yayinlayamaz; REVIEW'a gonderir)
  await prisma.user.upsert({
    where: { email: 'editor@kron.local' },
    update: {},
    create: {
      email: 'editor@kron.local',
      passwordHash: await bcrypt.hash('Editor123!', 10),
      name: 'Editor',
      role: 'EDITOR',
    },
  });

  // 3) Form tanimlari (demo talep + iletisim)
  await prisma.formDefinition.upsert({
    where: { key: 'demo' },
    update: {},
    create: {
      key: 'demo',
      name: 'Demo Talep',
      fields: [
        { name: 'fullName', label: 'Ad Soyad', type: 'text', required: true },
        { name: 'email', label: 'E-posta', type: 'email', required: true },
        { name: 'company', label: 'Sirket', type: 'text', required: true },
        { name: 'phone', label: 'Telefon', type: 'tel', required: false },
        { name: 'message', label: 'Mesaj', type: 'textarea', required: false },
      ],
    },
  });
  // krontech contactPageForm birebir alan seti (departman/arama-istegi select dahil)
  const contactFields = [
    { name: 'firstName', label: 'Isim', type: 'text', required: true },
    { name: 'lastName', label: 'Soyisim', type: 'text', required: true },
    { name: 'email', label: 'E-posta', type: 'email', required: true },
    { name: 'jobtitle', label: 'Unvan', type: 'text', required: true },
    { name: 'department', label: 'Departman', type: 'select', required: true },
    { name: 'company', label: 'Sirket', type: 'text', required: true },
    { name: 'country', label: 'Ulke', type: 'text', required: false },
    { name: 'phone', label: 'Telefon', type: 'tel', required: false },
    { name: 'call', label: 'Arama istegi', type: 'select', required: false },
    { name: 'subject', label: 'Konu', type: 'text', required: true },
    { name: 'message', label: 'Mesaj', type: 'textarea', required: true },
  ];
  await prisma.formDefinition.upsert({
    where: { key: 'contact' },
    update: { fields: contactFields },
    create: {
      key: 'contact',
      name: 'Iletisim',
      fields: contactFields,
    },
  });
  // Footer ustu "Bize Ulasin" formu (krontech footer-top paritesi)
  await prisma.formDefinition.upsert({
    where: { key: 'footer-contact' },
    update: {},
    create: {
      key: 'footer-contact',
      name: 'Footer Iletisim',
      fields: [
        { name: 'firstName', label: 'Isim', type: 'text', required: true },
        { name: 'lastName', label: 'Soyisim', type: 'text', required: true },
        { name: 'company', label: 'Sirket', type: 'text', required: false },
        { name: 'email', label: 'E-posta', type: 'email', required: true },
        { name: 'country', label: 'Ulke', type: 'text', required: false },
        { name: 'phone', label: 'Telefon', type: 'tel', required: false },
      ],
    },
  });

  // 3b) Ornek yonlendirmeler (301) — idempotent
  for (const r of [
    { source: '/eski-pam', destination: '/tr/kron-pam', statusCode: 301 },
    { source: '/old-blog', destination: '/en/blog', statusCode: 301 },
  ]) {
    await prisma.redirect.upsert({ where: { source: r.source }, update: {}, create: r });
  }

  // 4) Ornek icerik (idempotent: tr ana sayfa yoksa olustur)
  const homeExists = await prisma.entry.findUnique({
    where: { localeCode_slug: { localeCode: 'tr', slug: 'anasayfa' } },
  });
  if (!homeExists) {
    // --- Ana sayfa (PAGE) — tr + en ayni ceviri grubunda ---
    const homeGroup = await prisma.translationGroup.create({ data: { type: 'PAGE' } });
    await prisma.entry.create({
      data: {
        type: 'PAGE', slug: 'anasayfa', title: 'Ana Sayfa',
        status: 'PUBLISHED', publishedAt: new Date(),
        locale: { connect: { code: 'tr' } }, group: { connect: { id: homeGroup.id } },
        seo: { create: { metaTitle: 'Kron — Ayricalikli Erisim Yonetimi', metaDescription: 'Kurumsal siber guvenlik: PAM, veri guvenligi ve telekom cozumleri.' } },
        blocks: {
          create: [
            { type: 'HERO', order: 0, data: { eyebrow: 'KuppingerCole Lideri', title: 'Ayricalikli Erisimi Guvenle Yonetin', subtitle: 'Kron PAM ile kimlik, erisim ve veri guvenligi tek platformda.', cta: { label: 'Demo Talep Et', href: '/tr/contact' }, slides: [
              { eyebrow: 'KuppingerCole 2025', image: { url: '/kron/hero/slider-kc.png' }, graphic: { url: '/kron/hero/products/kuppinger-logo.png' }, title: 'Kron <b>lider</b> olarak tanindi', subtitle: 'KuppingerCole Analysts tarafindan ayricalikli erisim yonetiminde lider secildi.', cta: { label: 'Raporu Inceleyin', href: '/tr/resources' } },
              { eyebrow: 'Ayricalikli Erisim Yonetimi', graphic: { url: '/kron/hero/products/pam.png' }, title: 'Her <b>ayricalikli oturumu</b> denetleyin', subtitle: 'Ayricalikli hesaplari tek platformdan kaydedin, izleyin ve yonetin.', cta: { label: "Kron PAM'i Kesfet", href: '/tr/kron-pam' } },
              { eyebrow: 'Veri Guvenligi', image: { url: '/kron/hero/slider-kc.png' }, graphic: { url: '/kron/hero/products/ddm.png' }, title: 'Hassas veriyi <b>kaynaginda maskeleyin</b>', subtitle: 'Dinamik veri maskeleme ile veritabani degismeden korunur.', cta: { label: 'Incele', href: '/tr/dynamic-data-masking' } },
              { eyebrow: 'Telekom', graphic: { url: '/kron/hero/products/aaa.png' }, title: 'Telekom icin <b>kimlik dogrulama</b>', subtitle: 'RADIUS/TACACS+ ve IPDR loglama ile operator guvenligi.', cta: { label: 'Incele', href: '/tr/aaa' } },
              { eyebrow: 'Telemetri', image: { url: '/kron/hero/slider-kc.png' }, graphic: { url: '/kron/hero/products/tlmp.png' }, title: 'Log ve telemetriyi <b>guvenle yonetin</b>', subtitle: 'Veriyi toplayin, zenginlestirin, filtreleyin ve hedeflere yonlendirin.', cta: { label: 'Incele', href: '/tr/telemetry-pipeline' } },
            ] } },
            { type: 'PRODUCT_SHOWCASE', order: 1, data: { title: 'Kron Urunleri', subtitle: "Kron'un yenilikci teknoloji ve siber guvenlik yazilim urunleri.", moreLabel: 'Daha Fazla', products: [
              { name: 'Kron PAM', description: 'Ayricalikli kullanicilari ve oturumlari yoneterek verinizi ve kritik altyapinizi koruyun.', href: '/tr/kron-pam', image: { url: '/kron/products/pam.jpg', alt: 'Kron PAM' }, features: ['Sifre yonetimi', 'Sifir Guven oturum yonetimi', 'Mevzuat ve denetim uyumu'] },
              { name: 'Dinamik Veri Maskeleme', description: 'Hassas veriyi kaynaginda gercek zamanli maskeleyin.', href: '/tr/dynamic-data-masking', image: { url: '/kron/products/ddm.png', alt: 'Dinamik Veri Maskeleme' }, features: ['Gercek zamanli maskeleme', 'Veritabani degismeden koruma'] },
              { name: 'Veritabani Erisim Yoneticisi', description: 'Veritabani erisimini merkezi yonetin ve denetleyin.', href: '/tr/database-access-manager', image: { url: '/kron/products/dam.png', alt: 'Veritabani Erisim Yoneticisi' }, features: ['Erisim denetimi', 'Sorgu izleme'] },
              { name: 'Kron AAA', description: 'Telekom icin kimlik dogrulama, yetkilendirme ve loglama.', href: '/tr/aaa', image: { url: '/kron/products/aaa.png', alt: 'Kron AAA' }, features: ['RADIUS / TACACS+', 'IPDR loglama'] },
              { name: 'Telemetri Pipeline', description: 'Log ve telemetri verisini guvenle toplayin, zenginlestirin ve yonlendirin.', href: '/tr/telemetry-pipeline', image: { url: '/kron/products/tlmp.png', alt: 'Kron Telemetri Pipeline' }, features: ['Log yonlendirme', 'Hacim azaltma'] },
            ] } },
            { type: 'VALUE_PROP', order: 2, data: { title: 'Neden Kron<b>?</b>', body: 'Kron; BT erisim kontrol sistemleri, servis aktivasyonu ve siber guvenlik alanlarindaki yenilikci yazilim urunleriyle isinize deger katar.', cta: { label: 'Bizimle Iletisime Gecin', href: '/tr/contact' }, image: { url: '/kron/sections/why-kron.png', alt: 'Neden Kron' } } },
            { type: 'STATS', order: 3, data: { title: 'Rakamlarla Kron', subtitle: '18 yillik deneyim, yuzlerce proje ve dunya capinda guven.', items: [
              { value: '6', label: 'Kita', icon: { url: '/kron/icons/continents.png', alt: 'Kita' } },
              { value: '35+', label: 'Ulke', icon: { url: '/kron/icons/countries.jpg', alt: 'Ulke' } },
              { value: '200+', label: 'Is Ortagi', icon: { url: '/kron/icons/partners.png', alt: 'Is Ortagi' } },
              { value: '1500+', label: 'Kurulum', icon: { url: '/kron/icons/deployments.png', alt: 'Kurulum' } },
            ] } },
            { type: 'CASE_STUDY', order: 4, data: { title: 'Kron, dunyanin onde gelen bankalarindan birine <b>3 ayda PAM</b> kurulumunda yardimci oldu', excerpt: 'Binlerce ayricalikli hesap tek platformda denetlenir hale geldi; denetim ve uyumluluk sureleri belirgin sekilde kisaldi.', image: { url: '/kron/sections/case-bank.png', alt: 'Banka basari hikayesi' }, cta: { label: "Kron PAM'i Kesfet", href: '/tr/kron-pam' } } },
            { type: 'BLOG_CAROUSEL', order: 5, data: { title: 'Gelismelerden Haberdar Olun', limit: 6 } },
          ],
        },
      },
    });
    await prisma.entry.create({
      data: {
        type: 'PAGE', slug: 'home', title: 'Home',
        status: 'PUBLISHED', publishedAt: new Date(),
        locale: { connect: { code: 'en' } }, group: { connect: { id: homeGroup.id } },
        seo: { create: { metaTitle: 'Kron — Privileged Access Management', metaDescription: 'Enterprise cybersecurity: PAM, data security and telecom solutions.' } },
        blocks: {
          create: [
            { type: 'HERO', order: 0, data: { eyebrow: 'KuppingerCole Leader', title: 'Secure Privileged Access', subtitle: 'Identity, access and data security in one platform with Kron PAM.', cta: { label: 'Request a Demo', href: '/en/contact' }, slides: [
              { eyebrow: 'KuppingerCole 2025', image: { url: '/kron/hero/slider-kc.png' }, graphic: { url: '/kron/hero/products/kuppinger-logo.png' }, title: 'Kron recognized as a <b>leader</b>', subtitle: 'Named a leader in privileged access management by KuppingerCole Analysts.', cta: { label: 'Get the Reports', href: '/en/resources' } },
              { eyebrow: 'Privileged Access Management', graphic: { url: '/kron/hero/products/pam.png' }, title: 'Control every <b>privileged session</b>', subtitle: 'Record, monitor and govern privileged accounts from a single platform.', cta: { label: 'Explore Kron PAM', href: '/en/kron-pam' } },
              { eyebrow: 'Data Security', image: { url: '/kron/hero/slider-kc.png' }, graphic: { url: '/kron/hero/products/ddm.png' }, title: 'Mask sensitive data <b>at the source</b>', subtitle: 'Dynamic data masking protects data without changing the database.', cta: { label: 'Learn More', href: '/en/dynamic-data-masking' } },
              { eyebrow: 'Telecom', graphic: { url: '/kron/hero/products/aaa.png' }, title: 'Authentication for <b>telecom operators</b>', subtitle: 'RADIUS/TACACS+ and IPDR logging for operator security.', cta: { label: 'Learn More', href: '/en/aaa' } },
              { eyebrow: 'Telemetry', image: { url: '/kron/hero/slider-kc.png' }, graphic: { url: '/kron/hero/products/tlmp.png' }, title: 'Manage logs and telemetry <b>securely</b>', subtitle: 'Collect, enrich, filter and route data to any destination.', cta: { label: 'Learn More', href: '/en/telemetry-pipeline' } },
            ] } },
            { type: 'PRODUCT_SHOWCASE', order: 1, data: { title: 'Kron Products', subtitle: "Kron's cutting edge technology and cyber security software products.", moreLabel: 'Learn More', products: [
              { name: 'Privileged Access Management', description: 'Protect your data and critical infrastructure by managing privileged users and sessions.', href: '/en/kron-pam', image: { url: '/kron/products/pam.jpg', alt: 'Privileged Access Management' }, features: ['Password management', 'Zero-trust session management', 'Regulation & audit compliance'] },
              { name: 'Dynamic Data Masking', description: 'Mask sensitive data in real time, right at the source.', href: '/en/dynamic-data-masking', image: { url: '/kron/products/ddm.png', alt: 'Dynamic Data Masking' }, features: ['Real-time masking', 'No database changes required'] },
              { name: 'Database Access Manager', description: 'Centrally manage and audit database access.', href: '/en/database-access-manager', image: { url: '/kron/products/dam.png', alt: 'Database Access Manager' }, features: ['Access control', 'Query monitoring'] },
              { name: 'Kron AAA', description: 'Authentication, authorization and accounting for telecom.', href: '/en/aaa', image: { url: '/kron/products/aaa.png', alt: 'Kron AAA' }, features: ['RADIUS / TACACS+', 'IPDR logging'] },
              { name: 'Telemetry Pipeline', description: 'Collect, enrich and route log and telemetry data securely.', href: '/en/telemetry-pipeline', image: { url: '/kron/products/tlmp.png', alt: 'Kron Telemetry Pipeline' }, features: ['Log routing', 'Volume reduction'] },
            ] } },
            { type: 'VALUE_PROP', order: 2, data: { title: 'Why Kron<b>?</b>', body: 'Kron adds value to your business with its cutting edge software products in ICT access control systems, service activation and cyber security fields.', cta: { label: 'Get in Touch', href: '/en/contact' }, image: { url: '/kron/sections/why-kron.png', alt: 'Why Kron' } } },
            { type: 'STATS', order: 3, data: { title: 'Kron in Numbers', subtitle: '18 years of experience, hundreds of projects and trust worldwide.', items: [
              { value: '6', label: 'Continents', icon: { url: '/kron/icons/continents.png', alt: 'Continents' } },
              { value: '35+', label: 'Countries', icon: { url: '/kron/icons/countries.jpg', alt: 'Countries' } },
              { value: '200+', label: 'Partners', icon: { url: '/kron/icons/partners.png', alt: 'Partners' } },
              { value: '1500+', label: 'Deployments', icon: { url: '/kron/icons/deployments.png', alt: 'Deployments' } },
            ] } },
            { type: 'CASE_STUDY', order: 4, data: { title: 'Kron helps one of the world&rsquo;s leading banks to <b>deploy PAM in 3 months</b>', excerpt: 'Thousands of privileged accounts are now governed from a single platform, sharply reducing audit and compliance time.', image: { url: '/kron/sections/case-bank.png', alt: 'Bank success story' }, cta: { label: 'Explore Kron PAM', href: '/en/kron-pam' } } },
            { type: 'BLOG_CAROUSEL', order: 5, data: { title: 'Keep up to Date', limit: 6 } },
          ],
        },
      },
    });

    // --- Urunler (PRODUCT) — krontech urun sayfalari 1:1 ---
    // Icerik krontech.com'dan cikarildi (scripts/extract-product-pages.py);
    // gorseller /kron/products/<slug>/ altinda sharp ile optimize kopyalar.
    // NOT (bilincli sapma, decision-log): krontech'in /tr urun sayfalari govdeyi
    // Ingilizce birakmis; biz CMS cok-dilliligini gostermek icin TR'yi gercek ceviriyle veriyoruz.
    const TABS = {
      'solution': { en: 'SOLUTION', tr: 'ÇÖZÜM', page: { en: 'Solution', tr: 'Çözüm' }, icon: '/kron/products/tabs/tetris3x.png' },
      'how-it-works': { en: 'HOW IT WORKS?', tr: 'NASIL ÇALIŞIR?', page: { en: 'How It Works', tr: 'Nasıl Çalışır?' }, icon: '/kron/products/tabs/seo-and-web-13x.png' },
      'key-benefits': { en: 'KEY BENEFITS', tr: 'TEMEL FAYDALAR', page: { en: 'Key Benefits', tr: 'Temel Faydalar' }, icon: '/kron/products/tabs/business-and-finance-13x.png' },
      'product-family': { en: 'PRODUCT FAMILY', tr: 'ÜRÜN AİLESİ', page: { en: 'Product Family', tr: 'Ürün Ailesi' }, icon: '/kron/products/tabs/duplicate3x.png' },
      'resources': { en: 'RESOURCES', tr: 'KAYNAKLAR', page: { en: 'Resources', tr: 'Kaynaklar' }, icon: '/kron/products/tabs/ui-53x.png' },
      'videos': { en: 'VIDEOS', tr: 'VİDEOLAR', page: { en: 'Videos', tr: 'Videolar' }, icon: '/kron/products/tabs/shape3x.png' },
    } as const;
    type TabKey = keyof typeof TABS;
    type StubKey = Exclude<TabKey, 'solution'>;
    interface L { en: string; tr: string }
    interface PSection { title: L; body: L; side: 'left' | 'right'; img: string; cta?: { label: L; href: string } }
    interface PDef {
      slug: string; imgDir: string; title: L; category: L; tagline: L; excerpt: L; lead: L;
      tabs: StubKey[]; sections: PSection[];
      testimonials?: { title: L; quote: L; author: L; img: string }[];
      extra?: PSection[]; // testimonial sonrasi bolumler (orn. Sekerbank)
    }
    const plain = (s: string) => s.replace(/<[^>]+>/g, '');
    const PRODUCTS: PDef[] = [
      {
        slug: 'kron-pam', imgDir: 'kron-pam',
        title: { en: 'Kron PAM', tr: 'Kron PAM' },
        category: { en: 'Identity & Access Management', tr: 'Kimlik ve Erişim Yönetimi' },
        tagline: { en: 'Privileged access in one platform', tr: 'Tek platformda ayrıcalıklı erişim' },
        excerpt: { en: 'Privileged Access Management', tr: 'Ayrıcalıklı Erişim Yönetimi' },
        lead: {
          en: "Establish a flexible, centrally managed and layered defense security architecture against insider threats with the world's leading Privileged Access Management platform.",
          tr: 'Dünyanın önde gelen Ayrıcalıklı Erişim Yönetimi platformu ile iç tehditlere karşı esnek, merkezi yönetilen ve katmanlı bir savunma güvenlik mimarisi kurun.',
        },
        tabs: ['how-it-works', 'key-benefits', 'product-family', 'resources', 'videos'],
        sections: [
          {
            title: { en: 'Protect What You <b>Connect™</b>', tr: 'Bağladığınız Her Şeyi <b>Koruyun</b>' },
            body: {
              en: 'The Kron PAM™ Privileged Access Management Suite is known as the fastest to deploy and the most secure PAM solution in the marketplace, delivering IT operational security and efficiency to Enterprises and Telcos globally.',
              tr: 'Kron PAM™ Ayrıcalıklı Erişim Yönetimi Paketi, pazardaki en hızlı devreye alınan ve en güvenli PAM çözümü olarak bilinir; dünya genelinde kurumlara ve telekom operatörlerine BT operasyon güvenliği ve verimliliği sunar.',
            },
            side: 'right', img: 'section-1.jpg',
          },
          {
            title: { en: 'Unified Management of <b>Privileged Access Control</b>', tr: 'Ayrıcalıklı Erişim Kontrolünün <b>Tek Noktadan Yönetimi</b>' },
            body: {
              en: 'Kron PAM enables IT managers and network admins to efficiently secure the access, control configurations and indisputably record all activities in the data center or network infrastructure, in which any breach in privileged accounts access might have material impact on business continuity.',
              tr: 'Kron PAM; BT yöneticilerinin ve ağ yöneticilerinin, ayrıcalıklı hesap erişimindeki bir ihlalin iş sürekliliğini doğrudan etkileyebileceği veri merkezi ve ağ altyapısında erişimi güvence altına almasını, yapılandırmaları kontrol etmesini ve tüm aktiviteleri inkâr edilemez biçimde kaydetmesini sağlar.',
            },
            side: 'left', img: 'section-2.jpg',
          },
          {
            title: { en: 'Regulatory <b>Compliance</b>', tr: 'Mevzuata <b>Uyumluluk</b>' },
            body: {
              en: 'Kron PAM provides tools, capabilities, indisputable log records and audit trails to help organizations comply with regulations including ISO 27001, ISO 31000: 2009, KVKK, PCI DSS, EPDK, SOX, HIPAA, GDPR in highly regulated industries like finance, energy, health, and telecommunications.',
              tr: 'Kron PAM; finans, enerji, sağlık ve telekomünikasyon gibi yoğun düzenlemeye tabi sektörlerde ISO 27001, ISO 31000:2009, KVKK, PCI DSS, EPDK, SOX, HIPAA ve GDPR dahil regülasyonlara uyum için araçlar, yetenekler, inkâr edilemez log kayıtları ve denetim izleri sunar.',
            },
            side: 'right', img: 'section-3.jpg',
          },
          {
            title: { en: 'Stronger, Simpler and <b>More Secure</b>', tr: 'Daha Güçlü, Daha Basit ve <b>Daha Güvenli</b>' },
            body: {
              en: 'Cloud-native and designed to support Software Defined Networks today and in the future, Kron PAM prevents and detects breaches, maintains individual accountability, and increases operational efficiency significantly by managing credentials and delegating privileged actions.',
              tr: 'Bulut-yerel mimarisi ve Yazılım Tanımlı Ağları bugün ve gelecekte destekleyecek tasarımıyla Kron PAM; ihlalleri önler ve tespit eder, bireysel hesap verebilirliği korur, kimlik bilgilerini yöneterek ve ayrıcalıklı işlemleri delege ederek operasyonel verimliliği önemli ölçüde artırır.',
            },
            side: 'left', img: 'section-4.jpg',
          },
        ],
        testimonials: [
          {
            title: {
              en: "Anadolu Efes Ensures Data and Access Security with Kron's Cybersecurity Solutions",
              tr: "Anadolu Efes, Kron'un Siber Güvenlik Çözümleriyle Veri ve Erişim Güvenliğini Sağlıyor",
            },
            quote: {
              en: 'With Kron PAM, system and application experts started managing their authorized servers more easily and with visually enriched screens. This has led to increased convenience, speed, and motivation.',
              tr: 'Kron PAM ile sistem ve uygulama uzmanlarımız yetkili oldukları sunucuları daha kolay ve görsel olarak zenginleştirilmiş ekranlarla yönetmeye başladı. Bu; kolaylık, hız ve motivasyon artışı sağladı.',
            },
            author: { en: 'Mehmet Temiz - Information Security Manager', tr: 'Mehmet Temiz - Bilgi Güvenliği Müdürü' },
            img: 'testimonial-1.jpg',
          },
          {
            title: {
              en: 'Turkcell <b>Secures Hundreds of Thousands of Devices</b> and Privileged Accounts <b>with Kron PAM</b>',
              tr: 'Turkcell, <b>Yüz Binlerce Cihazı</b> ve Ayrıcalıklı Hesabı <b>Kron PAM ile</b> Güvence Altına Alıyor',
            },
            quote: {
              en: 'The most significant advantage Kron PAM provided us was the management of privileged accounts accessing a large number of devices, as well as the use and recording of passwords in all of them, without sharing passwords with anyone else.',
              tr: "Kron PAM'in bize sağladığı en önemli avantaj; çok sayıda cihaza erişen ayrıcalıklı hesapların yönetimi ve parolaların kimseyle paylaşılmadan tümünde kullanılması ve kaydedilmesi oldu.",
            },
            author: { en: 'Alper Eryılmaz - Identity Access Management Associate Director', tr: 'Alper Eryılmaz - Kimlik ve Erişim Yönetimi Direktör Yardımcısı' },
            img: 'testimonial-2.jpg',
          },
        ],
        extra: [
          {
            title: { en: 'How Sekerbank Assures Data and Access Security?', tr: 'Şekerbank Veri ve Erişim Güvenliğini Nasıl Sağlıyor?' },
            body: {
              en: "Sekerbank, one of Turkey's leading banks with a long history, secures and manages privileged account password information with Kron PAM in order to maximize data and access security.",
              tr: "Türkiye'nin köklü bankalarından Şekerbank, veri ve erişim güvenliğini en üst düzeye çıkarmak için ayrıcalıklı hesap parola bilgilerini Kron PAM ile güvence altına alıyor ve yönetiyor.",
            },
            side: 'left', img: 'section-5.jpg',
            cta: { label: { en: 'Watch the Customer Story', tr: 'Müşteri Hikayesini İzleyin' }, href: 'https://youtu.be/wnBRv_CVAQQ' },
          },
        ],
      },
      {
        slug: 'dynamic-data-masking', imgDir: 'dynamic-data-masking',
        title: { en: 'Dynamic Data Masking', tr: 'Dinamik Veri Maskeleme' },
        category: { en: 'Data Security & Data Management', tr: 'Veri Güvenliği ve Veri Yönetimi' },
        tagline: { en: 'Protect sensitive data at the source', tr: 'Hassas veriyi kaynağında koruyun' },
        excerpt: { en: 'Dynamic Data Masking', tr: 'Dinamik Veri Maskeleme' },
        lead: {
          en: "Secure, monitor, and centrally manage access to your databases with Kron's Database Access Manager (DAM). Leverage advanced role-based access control, dynamic data masking, and comprehensive database activity monitoring to ensure sensitive data protection and real-time oversight of database actions.",
          tr: 'Kron Veritabanı Erişim Yöneticisi (DAM) ile veritabanlarınıza erişimi güvence altına alın, izleyin ve merkezi olarak yönetin. Hassas verilerin korunması ve veritabanı işlemlerinin gerçek zamanlı gözetimi için gelişmiş rol tabanlı erişim kontrolü, dinamik veri maskeleme ve kapsamlı veritabanı aktivite izlemeden yararlanın.',
        },
        tabs: ['how-it-works', 'key-benefits', 'resources'],
        sections: [
          {
            title: { en: 'Centralized Database <b>Access Control & Security</b>', tr: 'Merkezi Veritabanı <b>Erişim Kontrolü ve Güvenliği</b>' },
            body: {
              en: 'Kron DAM&DDM provides robust access control by monitoring and logging database activities while enforcing role-based policies for enhanced data protection. Kron Database Access Manager adds an extra layer of security by reserving connections and requiring managerial approval for sensitive actions.',
              tr: 'Kron DAM&DDM, rol tabanlı politikaları uygularken veritabanı aktivitelerini izleyip loglayarak güçlü erişim kontrolü sağlar. Kron Veritabanı Erişim Yöneticisi; bağlantıları rezerve ederek ve hassas işlemler için yönetici onayı gerektirerek ek bir güvenlik katmanı ekler.',
            },
            side: 'right', img: 'section-1.jpg',
          },
          {
            title: { en: 'Protect Your <b>Sensitive Data</b>', tr: '<b>Hassas Verilerinizi</b> Koruyun' },
            body: {
              en: 'Using role-based rules, Kron DAM&DDM determines who can access real data and who sees masked or fictional versions, ensuring secure, customized access. Privileged users can safely view data without exposing sensitive information. With flexible masking techniques, including regular expressions, Kron DAM&DDM offers tailored data protection to meet your business needs.',
              tr: 'Kron DAM&DDM, rol tabanlı kurallarla kimin gerçek veriye erişebileceğini, kimin maskelenmiş veya kurgusal sürümleri göreceğini belirleyerek güvenli ve kişiselleştirilmiş erişim sağlar. Ayrıcalıklı kullanıcılar hassas bilgileri ifşa etmeden veriyi güvenle görüntüleyebilir. Düzenli ifadeler dahil esnek maskeleme teknikleriyle Kron DAM&DDM, iş ihtiyaçlarınıza özel veri koruması sunar.',
            },
            side: 'left', img: 'section-2.jpg',
          },
          {
            title: { en: 'Sensitive <b>Data Discovery</b>', tr: 'Hassas <b>Veri Keşfi</b>' },
            body: {
              en: 'Sensitive Data Discovery helps you locate and manage sensitive data across your databases. Kron DAM&DDM uses dictionary types, which are predefined data patterns, and regular expressions, to accurately identify sensitive information. Ensure your sensitive data is securely identified, managed, and protected with ease.',
              tr: 'Hassas Veri Keşfi, veritabanlarınızdaki hassas verileri bulmanıza ve yönetmenize yardımcı olur. Kron DAM&DDM; önceden tanımlı veri desenleri olan sözlük tipleri ve düzenli ifadeler kullanarak hassas bilgileri isabetle tanımlar. Hassas verilerinizin güvenle tanımlandığından, yönetildiğinden ve korunduğundan kolayca emin olun.',
            },
            side: 'right', img: 'section-3.jpg',
          },
        ],
      },
      {
        slug: 'database-access-manager', imgDir: 'database-access-manager',
        title: { en: 'Database Access Manager', tr: 'Veritabanı Erişim Yöneticisi' },
        category: { en: 'Identity & Access Management', tr: 'Kimlik ve Erişim Yönetimi' },
        tagline: { en: 'Centralize database access', tr: 'Veritabanı erişimini merkezileştirin' },
        excerpt: { en: 'Database Access Management', tr: 'Veritabanı Erişim Yönetimi' },
        lead: {
          en: "Empower your data security with Kron PAM's stronger and simpler Database Access Manager.",
          tr: "Kron PAM'in daha güçlü ve daha basit Veritabanı Erişim Yöneticisi ile veri güvenliğinizi güçlendirin.",
        },
        tabs: ['how-it-works', 'key-benefits', 'product-family', 'resources'],
        sections: [
          {
            title: { en: 'Utmost Security for <b>Database Access</b>', tr: 'Veritabanı Erişimi için <b>En Üst Düzey Güvenlik</b>' },
            body: {
              en: 'The Database Access Manager is the single point of access control management for the database layer and secures data access with logging and policy enforcement.',
              tr: 'Veritabanı Erişim Yöneticisi, veritabanı katmanı için tek noktadan erişim kontrolü yönetimidir; loglama ve politika uygulamayla veri erişimini güvence altına alır.',
            },
            side: 'right', img: 'section-1.jpg',
          },
          {
            title: { en: 'Enhanced Policy <b>Control</b>', tr: 'Gelişmiş Politika <b>Kontrolü</b>' },
            body: {
              en: "The Database Access Manager's advanced rule engine makes it simple to create restrictions for accessing sensitive data.",
              tr: "Veritabanı Erişim Yöneticisi'nin gelişmiş kural motoru, hassas verilere erişim için kısıtlamalar oluşturmayı kolaylaştırır.",
            },
            side: 'left', img: 'section-2.jpg',
          },
          {
            title: { en: 'Full Visibility with <b>Data Access Logging</b>', tr: '<b>Veri Erişim Loglamasıyla</b> Tam Görünürlük' },
            body: {
              en: "Kron PAM's DAM provides session logging functionality to database admins (DBAs).",
              tr: 'Kron PAM DAM, veritabanı yöneticilerine (DBA) oturum loglama işlevi sunar.',
            },
            side: 'right', img: 'section-3.jpg',
          },
        ],
      },
      {
        slug: 'aaa', imgDir: 'aaa',
        title: { en: 'AAA Server & Subscriber Management', tr: 'AAA Sunucu ve Abone Yönetimi' },
        category: { en: 'Identity & Access Management', tr: 'Kimlik ve Erişim Yönetimi' },
        tagline: { en: 'Authentication for telecom', tr: 'Telekom için kimlik doğrulama' },
        excerpt: { en: 'Authentication, Authorization, Accounting', tr: 'Kimlik Doğrulama, Yetkilendirme, Ücretlendirme' },
        lead: {
          en: 'Authorization, authentication and accounting platform with advanced profiling features',
          tr: 'Gelişmiş profilleme özellikleriyle yetkilendirme, kimlik doğrulama ve ücretlendirme platformu',
        },
        tabs: ['how-it-works', 'key-benefits', 'resources'],
        sections: [
          {
            title: { en: 'Top-Notch <b>AAA & Provisioning Platform</b>', tr: 'Birinci Sınıf <b>AAA ve Provizyon Platformu</b>' },
            body: {
              en: "Kron's AAA is an authorization, authentication and accounting platform with advanced profiling and provisioning features that provides complex capabilities to enable campaign differentiation in addition to network access control functions.",
              tr: 'Kron AAA; ağ erişim kontrolü işlevlerine ek olarak kampanya farklılaştırmaya imkân veren gelişmiş yeteneklere sahip, profilleme ve provizyon özellikleri sunan bir yetkilendirme, kimlik doğrulama ve ücretlendirme platformudur.',
            },
            side: 'right', img: 'section-1.jpg',
          },
          {
            title: { en: 'Flawless <b>Compatibility</b>', tr: 'Kusursuz <b>Uyumluluk</b>' },
            body: {
              en: "With its Telco cloud NFVI state of the art design, Kron's AAA is compatible with fixed and mobile networks at service providers and both wired and wireless 802.1X solutions in enterprise networks. Kron's AAA offers both software and hardware high availability to ensure system reliability.",
              tr: 'Telco bulut NFVI mimarisindeki modern tasarımıyla Kron AAA; servis sağlayıcılardaki sabit ve mobil ağlarla, kurumsal ağlardaki kablolu ve kablosuz 802.1X çözümleriyle uyumludur. Kron AAA, sistem güvenilirliği için hem yazılım hem donanım yüksek erişilebilirliği sunar.',
            },
            side: 'left', img: 'section-2.jpg',
          },
          {
            title: { en: 'Authenticating <b>Millions</b>', tr: '<b>Milyonlarca</b> Aboneyi Doğrulama' },
            body: {
              en: "With its powerful and sustainable infrastructure, Kron's AAA authenticates millions of subscribers concurrently tracking accounting data for millions over multiple transport mediums, e.g. xDSL, fiber, mobile and Wi-Fi.",
              tr: 'Güçlü ve sürdürülebilir altyapısıyla Kron AAA; xDSL, fiber, mobil ve Wi-Fi gibi birden çok iletim ortamında milyonlarca abonenin kimliğini eşzamanlı doğrular ve ücretlendirme verilerini izler.',
            },
            side: 'right', img: 'section-3.jpg',
          },
          {
            title: { en: 'Safely Manages Thousands of <b>Endpoint Devices</b>', tr: 'Binlerce <b>Uç Cihazı</b> Güvenle Yönetir' },
            body: {
              en: 'The Kron AAA solution safely manages thousands of endpoint devices of banking, telecommunications and service providers in device verification with advanced device authorization, authentication and charging/accounting capabilities.',
              tr: 'Kron AAA çözümü; gelişmiş cihaz yetkilendirme, kimlik doğrulama ve ücretlendirme yetenekleriyle bankacılık, telekomünikasyon ve servis sağlayıcıların binlerce uç cihazını cihaz doğrulamada güvenle yönetir.',
            },
            side: 'left', img: 'section-4.jpg',
          },
        ],
      },
      {
        slug: 'telemetry-pipeline', imgDir: 'kron-telemetry-pipeline',
        title: { en: 'Telemetry Pipeline', tr: 'Telemetry Pipeline' },
        category: { en: 'Data Security & Data Management', tr: 'Veri Güvenliği ve Veri Yönetimi' },
        tagline: { en: 'Manage logs and telemetry securely', tr: 'Log ve telemetriyi güvenle yönetin' },
        excerpt: { en: 'Telemetry Pipeline', tr: 'Telemetri Pipeline' },
        lead: {
          en: 'Kron Telemetry Pipeline enables organizations to manage their observability and security data streams, mitigates vendor lock-in, and assists in breaking down data silos.',
          tr: 'Kron Telemetry Pipeline; kuruluşların gözlemlenebilirlik ve güvenlik veri akışlarını yönetmesini sağlar, tedarikçiye bağımlılığı azaltır ve veri silolarını kırmaya yardımcı olur.',
        },
        tabs: ['how-it-works', 'key-benefits', 'resources'],
        sections: [
          {
            title: { en: '<b>Simplifying</b> Log Management and <b>Enhancing</b> Observability', tr: 'Log Yönetimini <b>Basitleştirin</b>, Gözlemlenebilirliği <b>Güçlendirin</b>' },
            body: {
              en: 'Large enterprises are struggling to manage increasing volumes of logs as they modernize their IT environments with technologies like containerization, necessitating enhanced observability. Kron Telemetry Pipeline is a purpose-built telemetry pipeline solution covering on-prem and cloud platforms prioritizing cost-efficiency and performance.',
              tr: 'Büyük kuruluşlar, BT ortamlarını konteynerleştirme gibi teknolojilerle modernleştirirken artan log hacimlerini yönetmekte zorlanıyor ve gelişmiş gözlemlenebilirliğe ihtiyaç duyuyor. Kron Telemetry Pipeline; maliyet verimliliği ve performansı önceliklendiren, şirket içi ve bulut platformlarını kapsayan, amaca özel bir telemetri pipeline çözümüdür.',
            },
            side: 'right', img: 'section-1.jpg',
          },
          {
            title: { en: '<b>Break down data silos</b> by Decoupling Sources from Destinations', tr: 'Kaynakları Hedeflerden Ayırarak <b>Veri Silolarını Kırın</b>' },
            body: {
              en: 'Forward multiple data sources to various destinations without the need for additional agents. Efficiently send transformed, noise-free data to the appropriate destinations while routing raw data to cost-effective long-term storage solutions such as S3. Retain a full-fidelity copy in a low-cost data lake for later rehydration when needed.',
              tr: 'Ek ajanlara ihtiyaç duymadan birden çok veri kaynağını çeşitli hedeflere iletin. Dönüştürülmüş, gürültüden arındırılmış veriyi doğru hedeflere verimli biçimde gönderirken ham veriyi S3 gibi maliyet-etkin uzun süreli depolama çözümlerine yönlendirin. Gerektiğinde geri yükleme için tam kopyayı düşük maliyetli bir veri gölünde saklayın.',
            },
            side: 'left', img: 'section-2.jpg',
          },
          {
            title: { en: '<b>Control Your Cost</b> by Eliminating Low Value Data', tr: 'Düşük Değerli Veriyi Eleyerek <b>Maliyetinizi Kontrol Edin</b>' },
            body: {
              en: 'Reduce up to 50% of streaming log volume for cost control and performance improvement purposes. Remove duplicate fields, null values, and other insignificant elements using a low-code interface. Apply sampling to discard repetitive events, or deduplicate logs to reduce ingested volume',
              tr: "Maliyet kontrolü ve performans iyileştirmesi için akan log hacmini %50'ye kadar azaltın. Düşük kod arayüzüyle yinelenen alanları, boş değerleri ve diğer önemsiz öğeleri kaldırın. Tekrarlayan olayları örnekleme ile eleyin veya logları tekilleştirerek alınan hacmi düşürün.",
            },
            side: 'right', img: 'section-3.jpg',
          },
          {
            title: { en: '<b>Enrich your log data</b> with Context Information', tr: 'Log Verinizi Bağlam Bilgisiyle <b>Zenginleştirin</b>' },
            body: {
              en: 'Improve the visibility of your streaming logs by adding contextual data, enhancing observability platforms. Adding threat intelligence information helps SIEM tools for root-cause analysis or threat hunting. Data-in-motion enrichment reduces the post-processing overhead for destination tools.',
              tr: 'Bağlamsal veri ekleyerek akan loglarınızın görünürlüğünü artırın, gözlemlenebilirlik platformlarını güçlendirin. Tehdit istihbaratı bilgisi eklemek, SIEM araçlarına kök neden analizi ve tehdit avcılığında yardımcı olur. Hareket halindeki veri zenginleştirme, hedef araçlardaki son işleme yükünü azaltır.',
            },
            side: 'left', img: 'section-4.jpg',
          },
          {
            title: { en: '<b>Rehydration</b> from S3 Compatible Object Storages', tr: 'S3 Uyumlu Nesne Depolamadan <b>Geri Yükleme</b>' },
            body: {
              en: 'Utilize the Kron Telemetry Pipeline to ingest complete datasets into object storages and enable time-based ad-hoc object rehydration for analysis tools. Optimize the system for cost-effectiveness and data integrity, reducing retention periods on analysis tools while ensuring accessibility for investigations.',
              tr: 'Kron Telemetry Pipeline ile eksiksiz veri kümelerini nesne depolamaya alın ve analiz araçları için zamana dayalı, ihtiyaç anında nesne geri yüklemeyi etkinleştirin. Analiz araçlarındaki saklama sürelerini kısaltıp incelemeler için erişilebilirliği koruyarak sistemi maliyet-etkinlik ve veri bütünlüğü için optimize edin.',
            },
            side: 'right', img: 'section-5.jpg',
          },
        ],
      },
    ];

    // Sekme stub sayfalari icin kisa govde (tab tipine gore; urun adi enjekte edilir).
    const stubBody: Record<StubKey, { en: (n: string) => string; tr: (n: string) => string }> = {
      'how-it-works': {
        en: (n) => `<p>${n} is deployed on-premises or in the cloud and integrates with your existing directory, ticketing and SIEM stack. Policies are managed centrally and enforced in real time across all connected systems.</p><p>Contact us for a guided walkthrough of the architecture.</p>`,
        tr: (n) => `<p>${n}; şirket içinde veya bulutta konumlandırılır, mevcut dizin, talep yönetimi ve SIEM altyapınızla entegre olur. Politikalar merkezi olarak yönetilir ve bağlı tüm sistemlerde gerçek zamanlı uygulanır.</p><p>Mimari turu için bizimle iletişime geçin.</p>`,
      },
      'key-benefits': {
        en: (n) => `<p>Key benefits of ${n} include reduced breach risk, faster audits and lower operational overhead.</p><ul><li>Centralized policy management</li><li>Indisputable audit trails</li><li>Rapid deployment</li></ul>`,
        tr: (n) => `<p>${n} ürününün temel faydaları; azalan ihlal riski, hızlanan denetimler ve düşen operasyon yüküdür.</p><ul><li>Merkezi politika yönetimi</li><li>İnkâr edilemez denetim izleri</li><li>Hızlı devreye alma</li></ul>`,
      },
      'product-family': {
        en: (n) => `<p>${n} is part of the Kron product family and works seamlessly with Kron PAM modules such as Password Vault, Session Manager and Database Access Manager.</p>`,
        tr: (n) => `<p>${n}, Kron ürün ailesinin bir parçasıdır; Password Vault, Session Manager ve Veritabanı Erişim Yöneticisi gibi Kron PAM modülleriyle sorunsuz çalışır.</p>`,
      },
      'resources': {
        en: (n) => `<p>Datasheets, case studies and webinars for ${n} are gathered in the <a href="/en/resources">resources hub</a>.</p>`,
        tr: (n) => `<p>${n} için datasheet, vaka çalışması ve webinar içerikleri <a href="/tr/resources">kaynaklar merkezinde</a> toplanmıştır.</p>`,
      },
      'videos': {
        en: (n) => `<p>Product demos and customer stories for ${n} are published on Kron's YouTube channel.</p>`,
        tr: (n) => `<p>${n} için ürün demoları ve müşteri hikayeleri Kron'un YouTube kanalında yayınlanmaktadır.</p>`,
      },
    };

    for (const p of PRODUCTS) {
      // sekme cubugu (locale'e gore): SOLUTION = urun sayfasi, digerleri stub sayfalar
      const tabsFor = (code: 'tr' | 'en', activeKey: TabKey) => [
        { label: TABS.solution[code], href: `/${code}/${p.slug}`, icon: TABS.solution.icon, active: activeKey === 'solution' },
        ...p.tabs.map((k) => ({ label: TABS[k][code], href: `/${code}/${p.slug}-${k}`, icon: TABS[k].icon, active: activeKey === k })),
      ];

      const group = await prisma.translationGroup.create({ data: { type: 'PRODUCT' } });
      for (const code of ['tr', 'en'] as const) {
        const home = code === 'tr' ? 'Ana Sayfa' : 'Home';
        const allSections = [...p.sections, ...(p.extra ?? [])];
        const mediaBlocks = allSections.map((s, i) => ({
          type: 'MEDIA_TEXT' as const,
          // extra bolumler TESTIMONIAL'dan sonra gelir (krontech sirasi)
          order: i < p.sections.length ? 2 + i : 3 + i,
          data: {
            title: s.title[code], body: s.body[code],
            image: { url: `/kron/products/${p.imgDir}/${s.img}`, alt: plain(s.title.en) },
            imageSide: s.side,
            ...(s.cta ? { cta: { label: s.cta.label[code], href: s.cta.href } } : {}),
          },
        }));
        const blocks: Prisma.ContentBlockCreateWithoutEntryInput[] = [
          {
            type: 'HERO', order: 0,
            data: {
              variant: 'product', title: p.title[code], subtitle: p.lead[code],
              image: { url: `/kron/products/${p.imgDir}/hero.jpg` },
              buttons: [
                { label: code === 'tr' ? 'Datasheet İndir' : 'Download Datasheet', href: `/${code}/resources` },
                { label: code === 'tr' ? 'Demo Talep Et' : 'Request a Demo', href: `/${code}/contact` },
              ],
            },
          },
          { type: 'PRODUCT_TABS', order: 1, data: { breadcrumb: [home, p.category[code]], tabs: tabsFor(code, 'solution') } },
          ...mediaBlocks,
        ];
        if (p.testimonials) {
          blocks.push({
            type: 'TESTIMONIAL', order: 2 + p.sections.length,
            data: {
              items: p.testimonials.map((t) => ({
                title: t.title[code], quote: t.quote[code], author: t.author[code],
                image: { url: `/kron/products/${p.imgDir}/${t.img}`, alt: plain(t.title.en) },
              })),
            },
          });
        }
        await prisma.entry.create({
          data: {
            type: 'PRODUCT', slug: p.slug, title: p.title[code], excerpt: p.excerpt[code],
            status: 'PUBLISHED', publishedAt: new Date(),
            locale: { connect: { code } }, group: { connect: { id: group.id } },
            product: { create: { tagline: p.tagline[code] } },
            seo: { create: { metaTitle: p.title[code], metaDescription: p.lead[code] } },
            blocks: { create: blocks },
          },
        });
      }

      // Sekme stub sayfalari (PAGE): banner + ayni sekme cubugu (ilgili sekme aktif) + kisa govde
      for (const k of p.tabs) {
        const stubGroup = await prisma.translationGroup.create({ data: { type: 'PAGE' } });
        for (const code of ['tr', 'en'] as const) {
          const home = code === 'tr' ? 'Ana Sayfa' : 'Home';
          const title = `${p.title[code]} — ${TABS[k].page[code]}`;
          await prisma.entry.create({
            data: {
              type: 'PAGE', slug: `${p.slug}-${k}`, title,
              excerpt: p.excerpt[code],
              status: 'PUBLISHED', publishedAt: new Date(),
              locale: { connect: { code } }, group: { connect: { id: stubGroup.id } },
              seo: { create: { metaTitle: title, metaDescription: p.lead[code] } },
              blocks: {
                create: [
                  {
                    type: 'HERO', order: 0,
                    data: {
                      variant: 'product', title: p.title[code], subtitle: p.lead[code],
                      image: { url: `/kron/products/${p.imgDir}/hero.jpg` },
                    },
                  },
                  { type: 'PRODUCT_TABS', order: 1, data: { breadcrumb: [home, p.category[code], p.title[code]], tabs: tabsFor(code, k) } },
                  { type: 'RICH_TEXT', order: 2, data: { html: stubBody[k][code](p.title[code]) } },
                ],
              },
            },
          });
        }
      }
    }

    // --- Blog (POST) — tr + en ---
    const postGroup = await prisma.translationGroup.create({ data: { type: 'POST' } });
    await prisma.entry.create({
      data: {
        type: 'POST', slug: 'sifir-guven-ve-kron-pam', title: 'Sifir Guven (Zero Trust) ve Kron PAM',
        excerpt: 'Sifir guven mimarisinde ayricalikli erisimin rolu.',
        status: 'PUBLISHED', publishedAt: new Date('2025-07-08'),
        locale: { connect: { code: 'tr' } }, group: { connect: { id: postGroup.id } },
        post: { create: { readingMin: 4, tags: ['zero-trust', 'pam'] } },
        coverImage: { create: { key: 'seed/blog/sifir-guven-ve-kron-pam', url: '/kron/blog/non-human.png', mime: 'image/png', size: 0, alt: 'Sifir Guven ve Kron PAM' } },
        seo: { create: { metaTitle: 'Sifir Guven ve Kron PAM', metaDescription: 'Zero Trust mimarisinde PAM.' } },
        blocks: {
          create: [
            { type: 'HERO', order: 0, data: { title: 'Sifir Guven ve Kron PAM' } },
            { type: 'RICH_TEXT', order: 1, data: { html: '<p>Sifir guven yaklasiminda her erisim dogrulanir. Kron PAM ayricalikli oturumlari merkezi denetler.</p>' } },
            { type: 'FAQ', order: 2, data: { items: [{ question: 'Zero Trust nedir?', answer: 'Hicbir istek varsayilan olarak guvenilmez; her erisim dogrulanir.' }] } },
          ],
        },
      },
    });
    await prisma.entry.create({
      data: {
        type: 'POST', slug: 'zero-trust-with-kron-pam', title: 'Zero Trust with Kron PAM',
        excerpt: 'The role of privileged access in a zero trust architecture.',
        status: 'PUBLISHED', publishedAt: new Date('2025-07-08'),
        locale: { connect: { code: 'en' } }, group: { connect: { id: postGroup.id } },
        post: { create: { readingMin: 4, tags: ['zero-trust', 'pam'] } },
        coverImage: { create: { key: 'seed/blog/zero-trust-with-kron-pam', url: '/kron/blog/non-human.png', mime: 'image/png', size: 0, alt: 'Zero Trust with Kron PAM' } },
        seo: { create: { metaTitle: 'Zero Trust with Kron PAM', metaDescription: 'PAM in a Zero Trust architecture.' } },
        blocks: {
          create: [
            { type: 'HERO', order: 0, data: { title: 'Zero Trust with Kron PAM' } },
            { type: 'RICH_TEXT', order: 1, data: { html: '<p>In a zero trust approach every access is verified. Kron PAM centrally controls privileged sessions.</p>' } },
          ],
        },
      },
    });

    // --- Ek bloglar (blog carousel'in dolu gorunmesi icin) ---
    const postGroup2 = await prisma.translationGroup.create({ data: { type: 'POST' } });
    await prisma.entry.create({
      data: {
        type: 'POST', slug: 'en-az-ayricalik-ilkesi', title: 'En Az Ayricalik Ilkesi ve Kron PAM',
        excerpt: 'Saldiri yuzeyini daraltmak icin en az ayricalik nasil uygulanir.',
        status: 'PUBLISHED', publishedAt: new Date('2025-06-17'),
        locale: { connect: { code: 'tr' } }, group: { connect: { id: postGroup2.id } },
        post: { create: { readingMin: 5, tags: ['least-privilege', 'pam'] } },
        coverImage: { create: { key: 'seed/blog/en-az-ayricalik-ilkesi', url: '/kron/blog/multi-tenant.jpg', mime: 'image/jpeg', size: 0, alt: 'En Az Ayricalik Ilkesi' } },
        seo: { create: { metaTitle: 'En Az Ayricalik Ilkesi', metaDescription: 'En az ayricalik ve Kron PAM.' } },
        blocks: { create: [
          { type: 'HERO', order: 0, data: { title: 'En Az Ayricalik Ilkesi ve Kron PAM' } },
          { type: 'RICH_TEXT', order: 1, data: { html: '<p>En az ayricalik ilkesi her kullaniciya yalnizca ihtiyaci kadar yetki verir. Kron PAM bunu merkezi olarak uygular.</p>' } },
        ] },
      },
    });
    await prisma.entry.create({
      data: {
        type: 'POST', slug: 'least-privilege-with-kron-pam', title: 'Least Privilege with Kron PAM',
        excerpt: 'How to apply least privilege to shrink the attack surface.',
        status: 'PUBLISHED', publishedAt: new Date('2025-06-17'),
        locale: { connect: { code: 'en' } }, group: { connect: { id: postGroup2.id } },
        post: { create: { readingMin: 5, tags: ['least-privilege', 'pam'] } },
        coverImage: { create: { key: 'seed/blog/least-privilege-with-kron-pam', url: '/kron/blog/multi-tenant.jpg', mime: 'image/jpeg', size: 0, alt: 'Least Privilege with Kron PAM' } },
        seo: { create: { metaTitle: 'Least Privilege with Kron PAM', metaDescription: 'Least privilege and Kron PAM.' } },
        blocks: { create: [
          { type: 'HERO', order: 0, data: { title: 'Least Privilege with Kron PAM' } },
          { type: 'RICH_TEXT', order: 1, data: { html: '<p>Least privilege grants each user only the access they need. Kron PAM enforces it centrally.</p>' } },
        ] },
      },
    });

    const postGroup3 = await prisma.translationGroup.create({ data: { type: 'POST' } });
    await prisma.entry.create({
      data: {
        type: 'POST', slug: 'veri-maskeleme-neden-onemli', title: 'Veri Maskeleme Neden Onemli?',
        excerpt: 'Dinamik veri maskeleme ile hassas veriyi kaynaginda koruyun.',
        status: 'PUBLISHED', publishedAt: new Date('2025-05-22'),
        locale: { connect: { code: 'tr' } }, group: { connect: { id: postGroup3.id } },
        post: { create: { readingMin: 4, tags: ['data-masking', 'data-security'] } },
        coverImage: { create: { key: 'seed/blog/veri-maskeleme-neden-onemli', url: '/kron/blog/oracle-rac.png', mime: 'image/png', size: 0, alt: 'Veri Maskeleme Neden Onemli' } },
        seo: { create: { metaTitle: 'Veri Maskeleme Neden Onemli', metaDescription: 'Dinamik veri maskeleme.' } },
        blocks: { create: [
          { type: 'HERO', order: 0, data: { title: 'Veri Maskeleme Neden Onemli?' } },
          { type: 'RICH_TEXT', order: 1, data: { html: '<p>Dinamik veri maskeleme hassas veriyi uygulama katmaninda gercek zamanli maskeler; veritabani degismeden korunur.</p>' } },
        ] },
      },
    });
    await prisma.entry.create({
      data: {
        type: 'POST', slug: 'why-data-masking-matters', title: 'Why Data Masking Matters',
        excerpt: 'Protect sensitive data at the source with dynamic data masking.',
        status: 'PUBLISHED', publishedAt: new Date('2025-05-22'),
        locale: { connect: { code: 'en' } }, group: { connect: { id: postGroup3.id } },
        post: { create: { readingMin: 4, tags: ['data-masking', 'data-security'] } },
        coverImage: { create: { key: 'seed/blog/why-data-masking-matters', url: '/kron/blog/oracle-rac.png', mime: 'image/png', size: 0, alt: 'Why Data Masking Matters' } },
        seo: { create: { metaTitle: 'Why Data Masking Matters', metaDescription: 'Dynamic data masking.' } },
        blocks: { create: [
          { type: 'HERO', order: 0, data: { title: 'Why Data Masking Matters' } },
          { type: 'RICH_TEXT', order: 1, data: { html: '<p>Dynamic data masking masks sensitive data in real time at the application layer, without changing the database.</p>' } },
        ] },
      },
    });

    // --- Blog arsivi (liste sayfasi + pagination + Highlights icin) ---
    // Kapaklar: krontech blog gorselleri (sharp ile optimize, public/kron/blog/).
    // featured=true olanlar sidebar "Highlights" widget'inda listelenir.
    const BLOG_ARCHIVE: Array<{
      date: string; img: string; featured: boolean; min: number; tags: string[];
      tr: { slug: string; title: string; excerpt: string; body: string };
      en: { slug: string; title: string; excerpt: string; body: string };
    }> = [
      {
        date: '2026-05-12', img: 'enhancing-log-routing-with-for-security-and-audit-with-kron-.jpg',
        featured: true, min: 6, tags: ['telemetry-pipeline', 'mssp'],
        tr: {
          slug: 'kron-telemetry-pipeline-ile-guvenlik-ve-denetim-icin-log-yonlendirme',
          title: 'Kron Telemetry Pipeline ile Güvenlik ve Denetim için Log Yönlendirme: Bir MSSP Senaryosu',
          excerpt: 'MSP/MSSP ortamlarında hızla büyüyen log hacmini doğru analiz platformlarına, düşük maliyetle ve uyumlu şekilde yönlendirme yaklaşımı.',
          body: '<p>Güvenlik operasyon merkezlerinde log hacmi her yıl katlanarak büyüyor. Kron Telemetry Pipeline, kaynaktan gelen veriyi filtreleyip zenginleştirerek yalnızca gerekli kısmı pahalı analiz platformlarına gönderir; geri kalanı uygun maliyetli depolamaya yönlendirir.</p><p>Bu senaryoda bir MSSP, müşteri bazında yönlendirme kuralları tanımlayarak hem SIEM maliyetini düşürür hem de denetim için tam kopyayı saklar.</p>',
        },
        en: {
          slug: 'enhancing-log-routing-for-security-and-audit-an-mssp-use-case',
          title: 'Enhancing Log Routing for Security and Audit with Kron Telemetry Pipeline: An MSSP Use Case',
          excerpt: 'How MSPs and MSSPs can route fast-growing log volumes to the right analytics platforms at lower cost while staying audit-ready.',
          body: '<p>Log volume in security operations grows every year. Kron Telemetry Pipeline filters and enriches data at the source so only what matters reaches expensive analytics platforms, while the rest goes to cost-effective storage.</p><p>In this scenario an MSSP defines per-tenant routing rules, cutting SIEM cost while keeping a full copy for audit.</p>',
        },
      },
      {
        date: '2026-05-11', img: 'what-is-phishing-and-how-can-you-prevent-phishing.jpg',
        featured: true, min: 5, tags: ['phishing', 'security-101'],
        tr: {
          slug: 'phishing-oltalama-nedir-nasil-onlenir',
          title: 'Phishing (Oltalama) Nedir, Nasıl Önlenir?',
          excerpt: 'Oltalama saldırılarının yaygın türleri ve kurumların alabileceği temel önlemler.',
          body: '<p>Oltalama, kullanıcıları sahte e-posta ve sitelerle kandırarak kimlik bilgisi çalmayı amaçlar. MFA, kullanıcı eğitimi ve ayrıcalıklı hesapların izolasyonu riski belirgin şekilde azaltır.</p>',
        },
        en: {
          slug: 'what-is-phishing-and-how-can-you-prevent-it',
          title: 'What Is Phishing and How Can You Prevent Phishing?',
          excerpt: 'Common phishing techniques and the core measures organizations can take against them.',
          body: '<p>Phishing tricks users into giving up credentials through fake emails and sites. MFA, user training and isolating privileged accounts significantly reduce the risk.</p>',
        },
      },
      {
        date: '2026-05-08', img: 'what-is-identity-and-access-management-iam-and-why-does-it-m.jpg',
        featured: false, min: 5, tags: ['iam'],
        tr: {
          slug: 'kimlik-ve-erisim-yonetimi-iam-nedir-neden-onemlidir',
          title: 'Kimlik ve Erişim Yönetimi (IAM) Nedir, Neden Önemlidir?',
          excerpt: 'IAM kavramları, PAM ile ilişkisi ve kurumsal güvenlikteki yeri.',
          body: '<p>IAM, kullanıcıların kim olduğunu ve neye erişebileceğini yöneten disiplindir. PAM ise bu yapının en kritik katmanı olan ayrıcalıklı hesapları kapsar.</p>',
        },
        en: {
          slug: 'what-is-identity-and-access-management-iam',
          title: 'What Is Identity and Access Management (IAM) and Why Does It Matter?',
          excerpt: 'IAM fundamentals, how it relates to PAM, and its role in enterprise security.',
          body: '<p>IAM governs who users are and what they can access. PAM covers the most critical layer of that structure: privileged accounts.</p>',
        },
      },
      {
        date: '2026-04-30', img: 'discover-everything-miss-nothing-device-account-discovery-in.jpg',
        featured: false, min: 4, tags: ['pam', 'discovery'],
        tr: {
          slug: 'kron-pam-ile-cihaz-ve-hesap-kesfi',
          title: 'Her Şeyi Keşfedin: Kron PAM ile Cihaz ve Hesap Keşfi',
          excerpt: 'Ağ üzerindeki cihazların ve ayrıcalıklı hesapların otomatik keşfi neden ilk adımdır.',
          body: '<p>Göremediğiniz hesabı koruyamazsınız. Kron PAM keşif modülü, ağdaki cihazları ve üzerlerindeki ayrıcalıklı hesapları otomatik bulup envantere ekler.</p>',
        },
        en: {
          slug: 'device-and-account-discovery-in-kron-pam',
          title: 'Discover Everything, Miss Nothing: Device & Account Discovery in Kron PAM',
          excerpt: 'Why automated discovery of devices and privileged accounts is the first step of any PAM program.',
          body: '<p>You cannot protect an account you cannot see. Kron PAM discovery automatically finds devices on the network and the privileged accounts on them.</p>',
        },
      },
      {
        date: '2026-03-23', img: 'your-biggest-security-risk-isn-t-human-fixing-non-human-iden.jpg',
        featured: false, min: 6, tags: ['pam', 'machine-identity'],
        tr: {
          slug: 'en-buyuk-guvenlik-riskiniz-insan-degil-makine-kimlikleri',
          title: 'En Büyük Güvenlik Riskiniz İnsan Değil: Kron PAM ile Makine Kimlikleri',
          excerpt: 'Servis hesapları, API anahtarları ve botlar: insan dışı kimliklerin yönetimi.',
          body: '<p>Kurumlarda insan dışı kimliklerin sayısı insan kullanıcıları çoktan aştı. Kron PAM, servis hesaplarını ve API anahtarlarını kasada toplayıp otomatik rotasyonla yönetir.</p>',
        },
        en: {
          slug: 'fixing-non-human-identities-with-kron-pam',
          title: "Your Biggest Security Risk Isn't Human: Fixing Non-Human Identities with Kron PAM",
          excerpt: 'Service accounts, API keys and bots: managing the non-human identity sprawl.',
          body: '<p>Non-human identities now outnumber human users in most organizations. Kron PAM vaults service accounts and API keys and manages them with automatic rotation.</p>',
        },
      },
      {
        date: '2026-03-12', img: 'what-is-privileged-access-management-pam.jpg',
        featured: true, min: 7, tags: ['pam', 'security-101'],
        tr: {
          slug: 'ayricalikli-erisim-yonetimi-pam-nedir',
          title: 'Ayrıcalıklı Erişim Yönetimi (PAM) Nedir?',
          excerpt: 'PAM kavramına giriş: neden gerekli, temel bileşenleri neler, nereden başlanır.',
          body: '<p>Ayrıcalıklı Erişim Yönetimi; kritik sistemlere erişebilen hesapların keşfedilmesi, kasalanması, oturumların izlenmesi ve yetkilerin sınırlandırılmasını kapsayan güvenlik disiplinidir.</p><p>Tipik bir PAM programı parola kasası, oturum yönetimi, en az ayrıcalık ve denetim kaydı bileşenlerinden oluşur.</p>',
        },
        en: {
          slug: 'what-is-privileged-access-management-pam',
          title: 'What is Privileged Access Management (PAM)?',
          excerpt: 'An introduction to PAM: why it matters, its core components, and where to start.',
          body: '<p>Privileged Access Management is the discipline of discovering and vaulting accounts that can reach critical systems, monitoring their sessions and limiting their rights.</p><p>A typical PAM program combines a password vault, session management, least privilege and audit logging.</p>',
        },
      },
      {
        date: '2026-03-12', img: '7-basic-steps-to-identify-a-data-breach.jpg',
        featured: true, min: 5, tags: ['data-breach', 'checklist'],
        tr: {
          slug: 'veri-ihlalini-7-adimda-tespit-edin',
          title: 'Veri İhlalini 7 Adımda Tespit Edin (Kontrol Listesi)',
          excerpt: 'Bir ihlal şüphesinde izlenecek pratik adımlar ve erken uyarı işaretleri.',
          body: '<p>İhlal tespiti hızla hareket etmeyi gerektirir: anormal oturumlar, beklenmedik yetki yükseltmeleri ve olağandışı veri hareketleri ilk bakılacak yerlerdir. Bu yazıda 7 adımlık pratik bir kontrol listesi paylaşıyoruz.</p>',
        },
        en: {
          slug: 'how-to-identify-a-data-breach-in-7-steps',
          title: 'How to Identify a Data Breach in 7 Steps (Checklist Included)',
          excerpt: 'A practical checklist of steps and early warning signs when a breach is suspected.',
          body: '<p>Breach detection demands speed: anomalous sessions, unexpected privilege escalations and unusual data movement are the first places to look. This post shares a practical 7-step checklist.</p>',
        },
      },
      {
        date: '2026-02-17', img: 'multi-tenant-privileged-access-management-for-msps-and-mssps.jpg',
        featured: true, min: 6, tags: ['pam', 'mssp'],
        tr: {
          slug: 'msp-ve-mssp-ler-icin-cok-kiracili-pam',
          title: 'MSP ve MSSP\'ler için Çok Kiracılı Ayrıcalıklı Erişim Yönetimi',
          excerpt: 'Tek platformda müşteri bazlı izolasyon: çok kiracılı PAM mimarisi.',
          body: '<p>Yönetilen hizmet sağlayıcılar onlarca müşterinin ayrıcalıklı erişimini tek platformdan yönetmek ister. Kron PAM çok kiracılı mimarisi, müşteri verisini izole ederken merkezi operasyona izin verir.</p>',
        },
        en: {
          slug: 'multi-tenant-pam-for-msps-and-mssps',
          title: 'Multi-Tenant Privileged Access Management for MSPs and MSSPs',
          excerpt: 'Per-tenant isolation on a single platform: the multi-tenant PAM architecture.',
          body: '<p>Managed service providers need to run privileged access for dozens of customers from one platform. Kron PAM multi-tenancy isolates tenant data while enabling central operations.</p>',
        },
      },
      {
        date: '2026-01-19', img: 'cyber-insecurity-in-a-fractured-world-why-privileged-access-.jpg',
        featured: false, min: 6, tags: ['pam', 'strategy'],
        tr: {
          slug: 'parcalanmis-dunyada-siber-guvensizlik-ayricalikli-erisim-stratejik-risk',
          title: 'Parçalanmış Bir Dünyada Siber Güvensizlik: Ayrıcalıklı Erişim Neden Stratejik Risk?',
          excerpt: 'Jeopolitik belirsizlik ortamında ayrıcalıklı erişimin yönetim kurulu gündemine taşınması.',
          body: '<p>Kritik altyapıya yönelik saldırılar arttıkça ayrıcalıklı erişim teknik bir detay olmaktan çıkıp stratejik risk başlığına dönüştü. Bu yazı, riskin yönetim seviyesinde nasıl ele alınacağını tartışıyor.</p>',
        },
        en: {
          slug: 'cyber-insecurity-in-a-fractured-world',
          title: 'Cyber Insecurity in a Fractured World: Why Privileged Access Has Become a Strategic Risk',
          excerpt: 'Why privileged access now belongs on the board agenda amid geopolitical uncertainty.',
          body: '<p>As attacks on critical infrastructure rise, privileged access has moved from technical detail to strategic risk. This post discusses how to address it at the executive level.</p>',
        },
      },
      {
        date: '2026-01-12', img: 'unifying-kubernetes-telemetry-in-a-diverse-and-fragmented-co.jpg',
        featured: false, min: 7, tags: ['telemetry-pipeline', 'kubernetes'],
        tr: {
          slug: 'kubernetes-telemetrisini-tek-catida-toplamak',
          title: 'Dağınık Collector Dünyasında Kubernetes Telemetrisini Tek Çatıda Toplamak',
          excerpt: 'Farklı collector\'lardan gelen Kubernetes telemetrisini standartlaştırma yaklaşımı.',
          body: '<p>Kubernetes ortamlarında her ekip farklı bir collector kullanınca telemetri verisi parçalanır. Kron Telemetry Pipeline farklı formatları tek noktada normalleştirir ve hedef sistemlere standart şekilde iletir.</p>',
        },
        en: {
          slug: 'unifying-kubernetes-telemetry',
          title: 'Unifying Kubernetes Telemetry in a Diverse and Fragmented Collector World',
          excerpt: 'An approach to standardizing Kubernetes telemetry coming from different collectors.',
          body: '<p>When every team runs a different collector, Kubernetes telemetry fragments. Kron Telemetry Pipeline normalizes formats in one place and forwards them consistently to target systems.</p>',
        },
      },
      {
        date: '2026-01-05', img: '2026-cybersecurity-predictions-why-kron-pam-and-kron-dam-ddm.jpg',
        featured: true, min: 8, tags: ['predictions', 'pam', 'data-security'],
        tr: {
          slug: '2026-siber-guvenlik-ongoruleri',
          title: '2026 Siber Güvenlik Öngörüleri: Kron PAM ve Kron DAM / DDM Neden Merkezde?',
          excerpt: 'Kimlik, erişim ve veri kontrolüne kayan güvenlik gündeminin 2026 okuması.',
          body: '<p>Sektör analizleri güvenlikte ağırlığın kimlik, erişim ve veri kontrolüne kaydığını gösteriyor. 2026\'da dayanıklılığı, kurumların ayrıcalıklı erişimi ve veri kullanımını ne kadar iyi yönettiği belirleyecek.</p><p>Bu tabloda PAM ile veri aktivite yönetimi ve dinamik maskeleme (DAM/DDM) temel güvenlik bileşenleri haline geliyor.</p>',
        },
        en: {
          slug: '2026-cybersecurity-predictions',
          title: '2026 Cybersecurity Predictions: Why Kron PAM and Kron DAM / DDM Sit at the Center',
          excerpt: 'A 2026 reading of the security agenda shifting toward identity, access and data control.',
          body: '<p>Industry analyses show the center of gravity in security shifting to identity, access and data control. In 2026, resilience will depend on how well organizations manage privileged access and data usage.</p><p>In that picture, PAM together with data activity management and dynamic masking (DAM/DDM) become foundational controls.</p>',
        },
      },
      {
        date: '2025-12-15', img: 'enhancing-secure-remote-access-for-it-and-ot-environments.jpg',
        featured: false, min: 5, tags: ['remote-access', 'ot-security'],
        tr: {
          slug: 'it-ve-ot-ortamlari-icin-guvenli-uzaktan-erisim',
          title: 'IT ve OT Ortamları için Güvenli Uzaktan Erişimi Güçlendirmek',
          excerpt: 'Saha cihazlarına ve kurumsal sistemlere VPN\'siz, kayıtlı ve onaylı erişim.',
          body: '<p>Uzaktan erişim hem IT hem OT tarafında en büyük saldırı yüzeylerinden biri. Kron PAM, VPN gerektirmeden tarayıcı üzerinden kayıtlı ve onay akışlı oturumlar sunar.</p>',
        },
        en: {
          slug: 'enhancing-secure-remote-access-for-it-and-ot',
          title: 'Enhancing Secure Remote Access for IT and OT Environments',
          excerpt: 'Recorded, approval-based access to field devices and enterprise systems without VPN.',
          body: '<p>Remote access is one of the largest attack surfaces in both IT and OT. Kron PAM provides recorded, approval-gated sessions through the browser with no VPN required.</p>',
        },
      },
    ];

    for (const p of BLOG_ARCHIVE) {
      const g = await prisma.translationGroup.create({ data: { type: 'POST' } });
      for (const code of ['tr', 'en'] as const) {
        const d = p[code];
        await prisma.entry.create({
          data: {
            type: 'POST', slug: d.slug, title: d.title, excerpt: d.excerpt,
            featured: p.featured,
            status: 'PUBLISHED', publishedAt: new Date(p.date),
            locale: { connect: { code } }, group: { connect: { id: g.id } },
            post: { create: { readingMin: p.min, tags: p.tags } },
            coverImage: { create: { key: `seed/blog/${d.slug}`, url: `/kron/blog/${p.img}`, mime: 'image/jpeg', size: 0, alt: d.title } },
            seo: { create: { metaTitle: d.title, metaDescription: d.excerpt } },
            blocks: { create: [
              { type: 'HERO', order: 0, data: { title: d.title } },
              { type: 'RICH_TEXT', order: 1, data: { html: d.body } },
            ] },
          },
        });
      }
    }
  }

  // eslint-disable-next-line no-console
  console.log('Seed tamamlandi: diller, admin, form tanimlari, ornek icerik.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e: unknown) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
