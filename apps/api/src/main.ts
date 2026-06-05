import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Cookie tabanli auth icin
  app.use(cookieParser());

  // Tum REST endpoint'leri /api altinda toplanir.
  app.setGlobalPrefix('api');

  // Frontend (web) farkli origin'den cagiriyor.
  const corsOrigin = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim());
  app.enableCors({ origin: corsOrigin ?? true, credentials: true });

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
    .setDescription('krontech.com yeniden gelistirme — icerik yonetim API dokumantasyonu')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`Kron API hazir: http://localhost:${port}/api  |  Swagger: http://localhost:${port}/docs`);
}

void bootstrap();
