import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * Uygulama cache katmani (Redis). Public icerik yanitlari burada cache'lenir;
 * icerik degisince ilgili anahtarlar temizlenir (invalidation).
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly redis: Redis;
  private readonly logger = new Logger(CacheService.name);

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
    });
    this.redis.on('error', (e: Error) =>
      this.logger.warn(`Redis: ${e.message}`),
    );
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? (JSON.parse(value) as T) : null;
  }

  async set(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length > 0) await this.redis.del(...keys);
  }

  // Not: KEYS dev/orta olcek icin yeterli; cok buyuk veri setinde SCAN tercih edilir.
  async delByPrefix(prefix: string): Promise<void> {
    const keys = await this.redis.keys(`${prefix}*`);
    if (keys.length > 0) await this.redis.del(...keys);
  }

  onModuleDestroy(): void {
    void this.redis.quit();
  }
}
