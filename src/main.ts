import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { mkdirSync } from 'node:fs';
import { AppModule } from './app.module.js';
import { UPLOADS_ROOT } from './common/upload.utils.js';

async function bootstrap() {
  mkdirSync(UPLOADS_ROOT, { recursive: true }); // deploy novo começa sem a pasta de uploads

  const app = await NestFactory.create(AppModule);

  // Atrás de proxy (Render, nginx na VPS): usa o IP real do cliente no rate limit.
  // Só ligue com TRUST_PROXY=1 quando realmente houver um proxy na frente.
  if (process.env.TRUST_PROXY) {
    const hops = Number(process.env.TRUST_PROXY);
    app.getHttpAdapter().getInstance().set('trust proxy', Number.isNaN(hops) ? process.env.TRUST_PROXY : hops);
  }

  // Security headers
  // CORP cross-origin: o frontend (outra porta/domínio) precisa carregar /uploads
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  // Body size limits (Unrestricted Resource Consumption)
  app.use(json({ limit: '100kb' }));
  app.use(urlencoded({ extended: true, limit: '100kb' }));

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: (process.env.FRONTEND_URL ?? 'http://localhost:5173,http://localhost:5174')
      .split(',')
      .map((o) => o.trim()),
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application running on http://localhost:${port}/api`);
}

bootstrap();
