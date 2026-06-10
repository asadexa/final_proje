import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CacheService } from '../redis/cache.service';
import { PrismaService } from '../prisma/prisma.service';

export interface RedirectInput {
  source: string;
  destination: string;
  statusCode?: number;
  enabled?: boolean;
}

const CACHE_KEY = 'redirects:enabled';

@Injectable()
export class RedirectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  // Aktif yonlendirmeler (proxy bunu cekip in-memory cache'ler). Redis'te 60sn cache'li.
  async listEnabled(): Promise<unknown> {
    const cached = await this.cache.get(CACHE_KEY);
    if (cached) return cached;
    const list = await this.prisma.redirect.findMany({
      where: { enabled: true },
      select: { source: true, destination: true, statusCode: true },
    });
    await this.cache.set(CACHE_KEY, list, 60);
    return list;
  }

  // ----- Admin CRUD (degisimde Redis cache dusurulur; proxy in-mem cache <=60sn gecikmeli) -----

  listAll() {
    return this.prisma.redirect.findMany({ orderBy: { createdAt: 'desc' } });
  }

  private validate(dto: RedirectInput): void {
    if (!dto.source?.startsWith('/')) throw new BadRequestException("source '/' ile baslamali.");
    if (!dto.destination?.startsWith('/') && !dto.destination?.startsWith('http')) {
      throw new BadRequestException("destination '/' veya 'http' ile baslamali.");
    }
    if (dto.source === dto.destination) throw new BadRequestException('source ve destination ayni olamaz.');
    if (dto.statusCode !== undefined && dto.statusCode !== 301 && dto.statusCode !== 302) {
      throw new BadRequestException('statusCode 301 veya 302 olmali.');
    }
  }

  async create(dto: RedirectInput) {
    this.validate(dto);
    const created = await this.prisma.redirect.create({
      data: {
        source: dto.source,
        destination: dto.destination,
        statusCode: dto.statusCode ?? 301,
        enabled: dto.enabled ?? true,
      },
    });
    await this.cache.del(CACHE_KEY);
    return created;
  }

  async update(id: string, dto: Partial<RedirectInput>) {
    const existing = await this.prisma.redirect.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Yonlendirme bulunamadi.');
    this.validate({ ...existing, ...dto });
    const updated = await this.prisma.redirect.update({ where: { id }, data: dto });
    await this.cache.del(CACHE_KEY);
    return updated;
  }

  async remove(id: string) {
    const existing = await this.prisma.redirect.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Yonlendirme bulunamadi.');
    await this.prisma.redirect.delete({ where: { id } });
    await this.cache.del(CACHE_KEY);
    return { success: true };
  }
}
