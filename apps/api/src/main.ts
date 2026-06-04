import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Tum REST endpoint'leri /api altinda toplanir.
  app.setGlobalPrefix('api');

  // Frontend (web) farkli origin'den cagiriyor.
  const corsOrigin = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim());
  app.enableCors({ origin: corsOrigin ?? true, credentials: true });

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`Kron API hazir: http://localhost:${port}/api`);
}

void bootstrap();
