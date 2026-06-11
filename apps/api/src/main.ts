import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

// Prod'da kritik secret'lar tanimli ve varsayilan-degil olmali. Aksi halde
// jeton sahteciligi (preview/revalidate) veya gecersiz JWT riski dogar — bu
// yuzden uygulama acilista HATA verir (fail-fast), sessizce calismaz.
function assertProdSecrets(): void {
  if (process.env.NODE_ENV !== 'production') return;
  const required: Record<string, string> = {
    JWT_ACCESS_SECRET: 'change-me-access-secret',
    JWT_REFRESH_SECRET: 'change-me-refresh-secret',
    PREVIEW_SECRET: 'change-me-preview-secret',
    REVALIDATE_SECRET: 'change-me-revalidate-secret',
  };
  const bad = Object.entries(required)
    .filter(([k, def]) => {
      const v = process.env[k];
      return !v || v.trim() === '' || v === def;
    })
    .map(([k]) => k);
  if (bad.length > 0) {
    throw new Error(
      `[BOOT] Uretimde su secret'lar tanimsiz veya varsayilan: ${bad.join(
        ', ',
      )}. Guvenli degerler atayin.`,
    );
  }
}

async function bootstrap(): Promise<void> {
  assertProdSecrets();
  const app = await NestFactory.create(AppModule);

  // Cookie tabanli auth icin
  app.use(cookieParser());

  // Tum REST endpoint'leri /api altinda toplanir.
  app.setGlobalPrefix('api');

  // Frontend (web) farkli origin'den cagiriyor.
  // Guvenlik: credentials:true ile origin'i ASLA reflektif acik (true) birakma —
  // CORS_ORIGIN tanimliysa allowlist kullan. Tanimsizsa: dev'de localhost'a izin
  // ver (gelistirme kolayligi), prod'da fail-closed (acikca uyar + sadece bilinen
  // site URL'i, o da yoksa kapat).
  const isProdEnv = process.env.NODE_ENV === 'production';
  const corsOrigin = process.env.CORS_ORIGIN?.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  let origin: string[] | boolean;
  if (corsOrigin && corsOrigin.length > 0) {
    origin = corsOrigin;
  } else if (isProdEnv) {
    const fallback = process.env.NEXT_PUBLIC_SITE_URL;

    console.warn(
      `[CORS] CORS_ORIGIN tanimsiz (prod). Fail-closed: ${
        fallback ? `yalniz ${fallback}` : 'tum cross-origin reddedilir'
      }. Lutfen CORS_ORIGIN ayarlayin.`,
    );
    origin = fallback ? [fallback] : false;
  } else {
    origin = ['http://localhost:3000'];
  }
  app.enableCors({ origin, credentials: true });

  // DTO validasyonu: bilinmeyen alanlari reddet, tipleri donustur (no any).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // OpenAPI / Swagger -> /docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Kron CMS API')
    .setDescription(
      'krontech.com yeniden gelistirme — icerik yonetim API dokumantasyonu',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port, '0.0.0.0');

  console.log(
    `Kron API hazir: http://localhost:${port}/api  |  Swagger: http://localhost:${port}/docs`,
  );
}

void bootstrap();
