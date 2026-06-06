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
            { type: 'PRODUCT_SHOWCASE', order: 1, data: { title: 'Kuresel Olcekte Taninan Portfoy', products: [
              { name: 'Kron PAM', description: 'Ayricalikli erisim yonetimi platformu.', href: '/tr/kron-pam', features: ['Oturum kayit & izleme', 'Sifre kasasi', 'Cok faktorlu dogrulama'] },
              { name: 'Dinamik Veri Maskeleme', description: 'Hassas veriyi kaynaginda maskeleyin.', href: '/tr/dynamic-data-masking', features: ['Gercek zamanli maskeleme', 'Veritabani erisim denetimi'] },
              { name: 'AAA & IPDR', description: 'Telekom icin kimlik dogrulama ve loglama.', href: '/tr/aaa', features: ['RADIUS/TACACS+', 'IPDR loglama'] },
            ] } },
            { type: 'STATS', order: 2, data: { title: 'Rakamlarla Kron', items: [{ value: '6', label: 'Kita' }, { value: '35+', label: 'Ulke' }, { value: '200+', label: 'Is Ortagi' }, { value: '1500+', label: 'Kurulum' }] } },
            { type: 'VALUE_PROP', order: 3, data: { title: 'Neden Kron?', body: 'KuppingerCole tarafindan lider olarak taninan, dunya capinda 1500+ kurulumla kanitlanmis ayricalikli erisim ve veri guvenligi teknolojileri.', cta: { label: 'Bizimle Iletisime Gecin', href: '/tr/contact' } } },
            { type: 'FEATURE_GRID', order: 4, data: { title: 'Cozumler', items: [{ title: 'PAM', description: 'Ayricalikli erisim yonetimi' }, { title: 'Veri Guvenligi', description: 'Dinamik veri maskeleme' }, { title: 'Telekom', description: 'AAA ve IPDR loglama' }] } },
            { type: 'CASE_STUDY', order: 5, data: { title: 'Lider bir banka Kron PAM ile ayricalikli erisimi merkezilestirdi', excerpt: 'Binlerce ayricalikli hesap tek platformda denetlenir hale geldi; denetim ve uyumluluk sureleri belirgin sekilde kisaldi.', cta: { label: 'Vaka Calismasini Oku', href: '/tr/case-studies' } } },
            { type: 'FAQ', order: 6, data: { title: 'Sik Sorulan Sorular', items: [{ question: 'Kron PAM nedir?', answer: 'Ayricalikli hesaplari ve oturumlari merkezi yoneten bir guvenlik cozumudur.' }] } },
            { type: 'BLOG_CAROUSEL', order: 7, data: { title: 'Gelismelerden Haberdar Olun', limit: 6 } },
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
            { type: 'PRODUCT_SHOWCASE', order: 1, data: { title: 'Globally Recognized Portfolio', products: [
              { name: 'Kron PAM', description: 'Privileged access management platform.', href: '/en/kron-pam', features: ['Session recording & monitoring', 'Password vault', 'Multi-factor authentication'] },
              { name: 'Dynamic Data Masking', description: 'Mask sensitive data at the source.', href: '/en/dynamic-data-masking', features: ['Real-time masking', 'Database access control'] },
              { name: 'AAA & IPDR', description: 'Authentication and logging for telecom.', href: '/en/aaa', features: ['RADIUS/TACACS+', 'IPDR logging'] },
            ] } },
            { type: 'STATS', order: 2, data: { title: 'Kron in Numbers', items: [{ value: '6', label: 'Continents' }, { value: '35+', label: 'Countries' }, { value: '200+', label: 'Partners' }, { value: '1500+', label: 'Deployments' }] } },
            { type: 'VALUE_PROP', order: 3, data: { title: 'Why Kron?', body: 'Recognized as a Leader by KuppingerCole and proven across 1500+ deployments worldwide in privileged access and data security.', cta: { label: 'Get in Touch', href: '/en/contact' } } },
            { type: 'FEATURE_GRID', order: 4, data: { title: 'Solutions', items: [{ title: 'PAM', description: 'Privileged access management' }, { title: 'Data Security', description: 'Dynamic data masking' }, { title: 'Telecom', description: 'AAA and IPDR logging' }] } },
            { type: 'CASE_STUDY', order: 5, data: { title: 'A leading bank centralized privileged access with Kron PAM', excerpt: 'Thousands of privileged accounts are now governed from a single platform, sharply reducing audit and compliance time.', cta: { label: 'Read the Case Study', href: '/en/case-studies' } } },
            { type: 'FAQ', order: 6, data: { title: 'Frequently Asked Questions', items: [{ question: 'What is Kron PAM?', answer: 'A security solution that centrally manages privileged accounts and sessions.' }] } },
            { type: 'BLOG_CAROUSEL', order: 7, data: { title: 'Keep up to Date', limit: 6 } },
          ],
        },
      },
    });

    // --- Urun (PRODUCT) kron-pam — tr + en ---
    const pamGroup = await prisma.translationGroup.create({ data: { type: 'PRODUCT' } });
    await prisma.entry.create({
      data: {
        type: 'PRODUCT', slug: 'kron-pam', title: 'Kron PAM', excerpt: 'Ayricalikli Erisim Yonetimi',
        status: 'PUBLISHED', publishedAt: new Date(),
        locale: { connect: { code: 'tr' } }, group: { connect: { id: pamGroup.id } },
        product: { create: { tagline: 'Tek platformda ayricalikli erisim' } },
        seo: { create: { metaTitle: 'Kron PAM', metaDescription: 'Ayricalikli erisim yonetimi cozumu.' } },
        blocks: {
          create: [
            { type: 'HERO', order: 0, data: { title: 'Kron PAM', subtitle: 'Ayricalikli hesaplari merkezi yonetin.' } },
            { type: 'FEATURE_GRID', order: 1, data: { items: [{ title: 'Oturum Yonetimi', description: 'Kayit ve gercek zamanli izleme' }, { title: 'Sifre Kasasi', description: 'Merkezi kimlik bilgisi yonetimi' }] } },
          ],
        },
      },
    });
    await prisma.entry.create({
      data: {
        type: 'PRODUCT', slug: 'kron-pam', title: 'Kron PAM', excerpt: 'Privileged Access Management',
        status: 'PUBLISHED', publishedAt: new Date(),
        locale: { connect: { code: 'en' } }, group: { connect: { id: pamGroup.id } },
        product: { create: { tagline: 'Privileged access in one platform' } },
        seo: { create: { metaTitle: 'Kron PAM', metaDescription: 'Privileged access management solution.' } },
        blocks: { create: [{ type: 'HERO', order: 0, data: { title: 'Kron PAM', subtitle: 'Centrally manage privileged accounts.' } }] },
      },
    });

    // --- Blog (POST) — tr + en ---
    const postGroup = await prisma.translationGroup.create({ data: { type: 'POST' } });
    await prisma.entry.create({
      data: {
        type: 'POST', slug: 'sifir-guven-ve-kron-pam', title: 'Sifir Guven (Zero Trust) ve Kron PAM',
        excerpt: 'Sifir guven mimarisinde ayricalikli erisimin rolu.',
        status: 'PUBLISHED', publishedAt: new Date(),
        locale: { connect: { code: 'tr' } }, group: { connect: { id: postGroup.id } },
        post: { create: { readingMin: 4, tags: ['zero-trust', 'pam'] } },
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
