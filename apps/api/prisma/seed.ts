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

  // eslint-disable-next-line no-console
  console.log('Seed tamamlandi: diller, admin, form tanimlari.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e: unknown) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
