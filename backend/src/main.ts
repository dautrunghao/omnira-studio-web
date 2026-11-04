import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { IncomingMessage, ServerResponse } from 'node:http';
import { AppModule } from './app.module';

interface RateBucket {
  count: number;
  resetAt: number;
}

const rateBuckets = new Map<string, RateBucket>();

function applySecurityAndRateLimit(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
): void {
  // Security Headers (OWASP best practices)
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('X-XSS-Protection', '0');

  // Lightweight IP Rate Limiting
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown');
  const url = req.url || '';
  const isAuthAttempt = url.includes('auth.login') || url.includes('auth.register') || url.includes('auth.resetPassword');
  const bucketKey = `${ip}:${isAuthAttempt ? 'auth' : 'api'}`;
  const maxRequests = isAuthAttempt ? 30 : 600;
  const windowMs = 60_000;
  const now = Date.now();

  let bucket = rateBuckets.get(bucketKey);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    rateBuckets.set(bucketKey, bucket);
  }
  bucket.count++;

  if (bucket.count > maxRequests) {
    res.statusCode = 429;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        ok: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Quá nhiều yêu cầu trong thời gian ngắn. Vui lòng thử lại sau ít phút.',
        },
      }),
    );
    return;
  }

  next();
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.use(applySecurityAndRateLimit);
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Workspace-Id'],
  });
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`[Omnira Studio Backend] Listening on http://0.0.0.0:${port}`);
}

void bootstrap();
