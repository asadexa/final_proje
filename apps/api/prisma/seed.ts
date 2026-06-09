import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma/client';

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
  await prisma.formDefinition.upsert({
    where: { key: 'contact' },
    update: {},
    create: {
      key: 'contact',
      name: 'Iletisim',
      fields: [
        { name: 'fullName', label: 'Ad Soyad', type: 'text', required: true },
        { name: 'email', label: 'E-posta', type: 'email', required: true },
        { name: 'subject', label: 'Konu', type: 'text', required: true },
        { name: 'message', label: 'Mesaj', type: 'textarea', required: true },
      ],
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
              { eyebrow: 'KuppingerCole Lideri', image: { url: '/kron/hero/slider-kc.png' }, graphic: { url: '/kron/hero/products/global.png' }, title: 'Kurumsal <b>Ayricalikli Erisimi</b> guvenle yonetin', subtitle: 'Kron PAM ile kimlik, erisim ve veri guvenligi tek platformda.', cta: { label: 'Demo Talep Et', href: '/tr/contact' } },
              { eyebrow: 'Ayricalikli Erisim Yonetimi', graphic: { url: '/kron/hero/products/pam.png' }, title: 'Her <b>ayricalikli oturumu</b> denetleyin', subtitle: 'Ayricalikli hesaplari tek platformdan kaydedin, izleyin ve yonetin.', cta: { label: "Kron PAM'i Kesfet", href: '/tr/kron-pam' } },
              { eyebrow: 'Veri Guvenligi', image: { url: '/kron/hero/slider-kc.png' }, graphic: { url: '/kron/hero/products/ddm.png' }, title: 'Hassas veriyi <b>kaynaginda maskeleyin</b>', subtitle: 'Dinamik veri maskeleme ile veritabani degismeden korunur.', cta: { label: 'Incele', href: '/tr/dynamic-data-masking' } },
              { eyebrow: 'Telekom', graphic: { url: '/kron/hero/products/aaa.png' }, title: 'Telekom icin <b>kimlik dogrulama</b>', subtitle: 'RADIUS/TACACS+ ve IPDR loglama ile operator guvenligi.', cta: { label: 'Incele', href: '/tr/aaa' } },
              { eyebrow: 'Telemetri', image: { url: '/kron/hero/slider-kc.png' }, graphic: { url: '/kron/hero/products/tlmp.png' }, title: 'Log ve telemetriyi <b>guvenle yonetin</b>', subtitle: 'Veriyi toplayin, zenginlestirin, filtreleyin ve hedeflere yonlendirin.', cta: { label: 'Incele', href: '/tr/kron-telemetry-pipeline' } },
            ] } },
            { type: 'PRODUCT_SHOWCASE', order: 1, data: { title: 'Kron Urunleri', subtitle: "Kron'un yenilikci teknoloji ve siber guvenlik yazilim urunleri.", moreLabel: 'Daha Fazla', products: [
              { name: 'Kron PAM', description: 'Ayricalikli kullanicilari ve oturumlari yoneterek verinizi ve kritik altyapinizi koruyun.', href: '/tr/kron-pam', image: { url: '/kron/products/pam.jpg', alt: 'Kron PAM' }, features: ['Sifre yonetimi', 'Sifir Guven oturum yonetimi', 'Mevzuat ve denetim uyumu'] },
              { name: 'Dinamik Veri Maskeleme', description: 'Hassas veriyi kaynaginda gercek zamanli maskeleyin.', href: '/tr/dynamic-data-masking', image: { url: '/kron/products/ddm.png', alt: 'Dinamik Veri Maskeleme' }, features: ['Gercek zamanli maskeleme', 'Veritabani degismeden koruma'] },
              { name: 'Veritabani Erisim Yoneticisi', description: 'Veritabani erisimini merkezi yonetin ve denetleyin.', href: '/tr/database-access-manager', image: { url: '/kron/products/dam.png', alt: 'Veritabani Erisim Yoneticisi' }, features: ['Erisim denetimi', 'Sorgu izleme'] },
              { name: 'Kron AAA', description: 'Telekom icin kimlik dogrulama, yetkilendirme ve loglama.', href: '/tr/aaa', image: { url: '/kron/products/aaa.png', alt: 'Kron AAA' }, features: ['RADIUS / TACACS+', 'IPDR loglama'] },
              { name: 'Telemetri Pipeline', description: 'Log ve telemetri verisini guvenle toplayin, zenginlestirin ve yonlendirin.', href: '/tr/kron-telemetry-pipeline', image: { url: '/kron/products/tlmp.png', alt: 'Kron Telemetri Pipeline' }, features: ['Log yonlendirme', 'Hacim azaltma'] },
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
              { eyebrow: 'KuppingerCole Leader', image: { url: '/kron/hero/slider-kc.png' }, graphic: { url: '/kron/hero/products/global.png' }, title: 'Secure <b>Privileged Access</b> across the enterprise', subtitle: 'Identity, access and data security in one platform with Kron PAM.', cta: { label: 'Request a Demo', href: '/en/contact' } },
              { eyebrow: 'Privileged Access Management', graphic: { url: '/kron/hero/products/pam.png' }, title: 'Control every <b>privileged session</b>', subtitle: 'Record, monitor and govern privileged accounts from a single platform.', cta: { label: 'Explore Kron PAM', href: '/en/kron-pam' } },
              { eyebrow: 'Data Security', image: { url: '/kron/hero/slider-kc.png' }, graphic: { url: '/kron/hero/products/ddm.png' }, title: 'Mask sensitive data <b>at the source</b>', subtitle: 'Dynamic data masking protects data without changing the database.', cta: { label: 'Learn More', href: '/en/dynamic-data-masking' } },
              { eyebrow: 'Telecom', graphic: { url: '/kron/hero/products/aaa.png' }, title: 'Authentication for <b>telecom operators</b>', subtitle: 'RADIUS/TACACS+ and IPDR logging for operator security.', cta: { label: 'Learn More', href: '/en/aaa' } },
              { eyebrow: 'Telemetry', image: { url: '/kron/hero/slider-kc.png' }, graphic: { url: '/kron/hero/products/tlmp.png' }, title: 'Manage logs and telemetry <b>securely</b>', subtitle: 'Collect, enrich, filter and route data to any destination.', cta: { label: 'Learn More', href: '/en/kron-telemetry-pipeline' } },
            ] } },
            { type: 'PRODUCT_SHOWCASE', order: 1, data: { title: 'Kron Products', subtitle: "Kron's cutting edge technology and cyber security software products.", moreLabel: 'Learn More', products: [
              { name: 'Privileged Access Management', description: 'Protect your data and critical infrastructure by managing privileged users and sessions.', href: '/en/kron-pam', image: { url: '/kron/products/pam.jpg', alt: 'Privileged Access Management' }, features: ['Password management', 'Zero-trust session management', 'Regulation & audit compliance'] },
              { name: 'Dynamic Data Masking', description: 'Mask sensitive data in real time, right at the source.', href: '/en/dynamic-data-masking', image: { url: '/kron/products/ddm.png', alt: 'Dynamic Data Masking' }, features: ['Real-time masking', 'No database changes required'] },
              { name: 'Database Access Manager', description: 'Centrally manage and audit database access.', href: '/en/database-access-manager', image: { url: '/kron/products/dam.png', alt: 'Database Access Manager' }, features: ['Access control', 'Query monitoring'] },
              { name: 'Kron AAA', description: 'Authentication, authorization and accounting for telecom.', href: '/en/aaa', image: { url: '/kron/products/aaa.png', alt: 'Kron AAA' }, features: ['RADIUS / TACACS+', 'IPDR logging'] },
              { name: 'Telemetry Pipeline', description: 'Collect, enrich and route log and telemetry data securely.', href: '/en/kron-telemetry-pipeline', image: { url: '/kron/products/tlmp.png', alt: 'Kron Telemetry Pipeline' }, features: ['Log routing', 'Volume reduction'] },
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

    // --- Urunler (PRODUCT) — her biri tr + en; ana sayfa "Kron Products" kartlariyla eslesir ---
    const products = [
      {
        slug: 'kron-pam',
        tr: { title: 'Kron PAM', tagline: 'Tek platformda ayricalikli erisim', excerpt: 'Ayricalikli Erisim Yonetimi', heroSub: 'Ayricalikli hesaplari ve oturumlari tek platformdan kaydedin, izleyin ve yonetin.', features: [{ title: 'Oturum Yonetimi', description: 'Sifir Guven ilkeleriyle kayit ve gercek zamanli izleme.' }, { title: 'Sifre Kasasi', description: 'Merkezi kimlik bilgisi yonetimi ve rotasyon.' }, { title: 'Cok Faktorlu Dogrulama', description: 'Kritik erisimlerde ek dogrulama katmani.' }] },
        en: { title: 'Kron PAM', tagline: 'Privileged access in one platform', excerpt: 'Privileged Access Management', heroSub: 'Record, monitor and govern privileged accounts and sessions from a single platform.', features: [{ title: 'Session Management', description: 'Recording and real-time monitoring with Zero Trust principles.' }, { title: 'Password Vault', description: 'Centralized credential management and rotation.' }, { title: 'Multi-Factor Authentication', description: 'An extra verification layer for critical access.' }] },
      },
      {
        slug: 'dynamic-data-masking',
        tr: { title: 'Dinamik Veri Maskeleme', tagline: 'Hassas veriyi kaynaginda koruyun', excerpt: 'Dinamik Veri Maskeleme', heroSub: 'Hassas veriyi uygulama katmaninda gercek zamanli maskeleyin; veritabani degismeden korunur.', features: [{ title: 'Gercek Zamanli Maskeleme', description: 'Veriyi sorgu aninda maskeleyin.' }, { title: 'Veritabani Degismez', description: 'Kaynak veriye dokunmadan koruma.' }] },
        en: { title: 'Dynamic Data Masking', tagline: 'Protect sensitive data at the source', excerpt: 'Dynamic Data Masking', heroSub: 'Mask sensitive data in real time at the application layer, without changing the database.', features: [{ title: 'Real-Time Masking', description: 'Mask data at query time.' }, { title: 'No Database Changes', description: 'Protect without touching source data.' }] },
      },
      {
        slug: 'database-access-manager',
        tr: { title: 'Veritabani Erisim Yoneticisi', tagline: 'Veritabani erisimini merkezilestirin', excerpt: 'Veritabani Erisim Yonetimi', heroSub: 'Veritabani erisimini merkezi olarak yonetin, yetkilendirin ve denetleyin.', features: [{ title: 'Erisim Denetimi', description: 'Kim, neye, ne zaman erisiyor.' }, { title: 'Sorgu Izleme', description: 'Tum sorgular kayit altinda.' }] },
        en: { title: 'Database Access Manager', tagline: 'Centralize database access', excerpt: 'Database Access Management', heroSub: 'Centrally manage, authorize and audit database access.', features: [{ title: 'Access Control', description: 'Who accesses what, and when.' }, { title: 'Query Monitoring', description: 'Every query is logged.' }] },
      },
      {
        slug: 'aaa',
        tr: { title: 'Kron AAA', tagline: 'Telekom icin kimlik dogrulama', excerpt: 'Kimlik Dogrulama, Yetkilendirme, Loglama', heroSub: 'Telekom operatorleri icin kimlik dogrulama, yetkilendirme ve IPDR loglama.', features: [{ title: 'RADIUS / TACACS+', description: 'Standart protokollerle kimlik dogrulama.' }, { title: 'IPDR Loglama', description: 'Detayli kullanim kayitlari.' }] },
        en: { title: 'Kron AAA', tagline: 'Authentication for telecom', excerpt: 'Authentication, Authorization, Accounting', heroSub: 'Authentication, authorization and IPDR logging for telecom operators.', features: [{ title: 'RADIUS / TACACS+', description: 'Authentication via standard protocols.' }, { title: 'IPDR Logging', description: 'Detailed usage records.' }] },
      },
      {
        slug: 'kron-telemetry-pipeline',
        tr: { title: 'Kron Telemetri Pipeline', tagline: 'Log ve telemetriyi guvenle yonetin', excerpt: 'Telemetri Pipeline', heroSub: 'Log ve telemetri verisini toplayin, zenginlestirin, filtreleyin ve hedeflere yonlendirin.', features: [{ title: 'Log Yonlendirme', description: 'Verileri dogru hedeflere iletin.' }, { title: 'Hacim Azaltma', description: 'Gurultuyu filtreleyerek maliyeti dusurun.' }] },
        en: { title: 'Kron Telemetry Pipeline', tagline: 'Manage logs and telemetry securely', excerpt: 'Telemetry Pipeline', heroSub: 'Collect, enrich, filter and route log and telemetry data to any destination.', features: [{ title: 'Log Routing', description: 'Deliver data to the right destinations.' }, { title: 'Volume Reduction', description: 'Cut cost by filtering noise.' }] },
      },
    ];
    for (const p of products) {
      const group = await prisma.translationGroup.create({ data: { type: 'PRODUCT' } });
      for (const code of ['tr', 'en'] as const) {
        const d = p[code];
        await prisma.entry.create({
          data: {
            type: 'PRODUCT', slug: p.slug, title: d.title, excerpt: d.excerpt,
            status: 'PUBLISHED', publishedAt: new Date(),
            locale: { connect: { code } }, group: { connect: { id: group.id } },
            product: { create: { tagline: d.tagline } },
            seo: { create: { metaTitle: d.title, metaDescription: d.excerpt } },
            blocks: {
              create: [
                { type: 'HERO', order: 0, data: { eyebrow: code === 'tr' ? 'Urun' : 'Product', title: d.title, subtitle: d.heroSub, cta: { label: code === 'tr' ? 'Demo Talep Et' : 'Request a Demo', href: `/${code}/contact` } } },
                { type: 'FEATURE_GRID', order: 1, data: { title: code === 'tr' ? 'One Cikan Ozellikler' : 'Key Features', items: d.features } },
                { type: 'CTA_BANNER', order: 2, data: { title: code === 'tr' ? `${d.title} ile tanisin` : `See ${d.title} in action`, cta: { label: code === 'tr' ? 'Demo Talep Et' : 'Request a Demo', href: `/${code}/contact` } } },
              ],
            },
          },
        });
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
