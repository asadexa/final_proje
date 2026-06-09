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
              { eyebrow: 'KuppingerCole Lideri', title: 'Kurumsal <b>Ayricalikli Erisimi</b> guvenle yonetin', subtitle: 'Kron PAM ile kimlik, erisim ve veri guvenligi tek platformda.', cta: { label: 'Demo Talep Et', href: '/tr/contact' } },
              { eyebrow: 'Ayricalikli Erisim Yonetimi', title: 'Her <b>ayricalikli oturumu</b> denetleyin', subtitle: 'Ayricalikli hesaplari tek platformdan kaydedin, izleyin ve yonetin.', cta: { label: "Kron PAM'i Kesfet", href: '/tr/kron-pam' } },
              { eyebrow: 'Icgoruler', title: 'Siber tehditlerin <b>onunde olun</b>', subtitle: 'Erisim guvenligi, Sifir Guven ve veri koruma uzerine rehberler ve analizler.', cta: { label: "Blog'u Oku", href: '/tr/blog' } },
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
              { eyebrow: 'KuppingerCole Leader', title: 'Secure <b>Privileged Access</b> across the enterprise', subtitle: 'Identity, access and data security in one platform with Kron PAM.', cta: { label: 'Request a Demo', href: '/en/contact' } },
              { eyebrow: 'Privileged Access Management', title: 'Control every <b>privileged session</b>', subtitle: 'Record, monitor and govern privileged accounts from a single platform.', cta: { label: 'Explore Kron PAM', href: '/en/kron-pam' } },
              { eyebrow: 'Insights', title: 'Stay ahead of <b>cyber threats</b>', subtitle: 'Guides and analysis on access security, Zero Trust and data protection.', cta: { label: 'Read the Blog', href: '/en/blog' } },
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
        status: 'PUBLISHED', publishedAt: new Date(),
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
        status: 'PUBLISHED', publishedAt: new Date(),
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
        status: 'PUBLISHED', publishedAt: new Date(),
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
        status: 'PUBLISHED', publishedAt: new Date(),
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
        status: 'PUBLISHED', publishedAt: new Date(),
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
        status: 'PUBLISHED', publishedAt: new Date(),
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
