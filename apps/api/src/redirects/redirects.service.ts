import { Injectable } from '@nestjs/common';
import { CacheService } from '../redis/cache.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RedirectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  // Aktif yonlendirmeler (proxy bunu cekip in-memory cache'ler). Redis'te 60sn cache'li.
  async listEnabled(): Promise<unknown> {
    const key = 'redirects:enabled';
    const cached = await this.cache.get(key);
    if (cached) return cached;
    const list = await this.prisma.redirect.findMany({
      where: { enabled: true },
      select: { source: true, destination: true, statusCode: true },
    });
    await this.cache.set(key, list, 60);
    return list;
  }
}
