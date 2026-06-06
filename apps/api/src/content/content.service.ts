import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { validateBlockData } from '@kron/shared';
import { Prisma } from '../generated/prisma/client';
import { CacheService } from '../redis/cache.service';
import { PrismaService } from '../prisma/prisma.service';
import type {
  BlockDto,
  CreateEntryDto,
  ListQueryDto,
  UpdateEntryDto,
} from './dto/entry.dto';

// Public icerik cache anahtar oneki — invalidation icin tek noktadan temizlenir.
const CACHE_PREFIX = 'content:';

@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  private assertBlocksValid(blocks: BlockDto[] | undefined): void {
    for (const b of blocks ?? []) {
      const result = validateBlockData(b.type, b.data);
      if (!result.success) {
        throw new BadRequestException(`Blok (${b.type}) gecersiz: ${result.error}`);
      }
    }
  }

  private toBlockCreate(
    blocks: BlockDto[] | undefined,
  ): Prisma.ContentBlockCreateWithoutEntryInput[] {
    return (blocks ?? []).map((b) => ({
      type: b.type,
      order: b.order,
      enabled: b.enabled ?? true,
      data: b.data as Prisma.InputJsonValue,
    }));
  }

  private async invalidatePublicCache(): Promise<void> {
    await this.cache.delByPrefix(CACHE_PREFIX);
  }

  // --- Versiyonlama + audit (yayin akisi) ---

  // Mevcut entry'nin (blok + seo dahil) anlik goruntusunu yeni bir versiyon olarak saklar.
  private async snapshotVersion(entryId: string, userId?: string, note?: string): Promise<void> {
    const full = await this.prisma.entry.findUnique({
      where: { id: entryId },
      include: { blocks: { orderBy: { order: 'asc' } }, seo: true, product: true, post: true },
    });
    if (!full) return;
    const last = await this.prisma.contentVersion.findFirst({
      where: { entryId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const snapshot = JSON.parse(JSON.stringify(full)) as Prisma.InputJsonValue;
    await this.prisma.contentVersion.create({
      data: { entryId, version: (last?.version ?? 0) + 1, snapshot, note, createdById: userId },
    });
  }

  private async audit(
    action: string,
    entityId: string,
    userId?: string,
    meta?: Prisma.InputJsonValue,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: { action, entityType: 'Entry', entityId, userId, meta },
    });
  }

  // ----------------------------- PUBLIC (cache'li) -----------------------------

  async resolve(locale: string, slug: string): Promise<unknown> {
    const cacheKey = `${CACHE_PREFIX}resolve:${locale}:${slug}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const entry = await this.prisma.entry.findUnique({
      where: { localeCode_slug: { localeCode: locale, slug } },
      include: {
        blocks: { where: { enabled: true }, orderBy: { order: 'asc' } },
        seo: true,
        product: true,
        post: true,
        coverImage: true,
        categories: { include: { category: true } },
      },
    });
    if (!entry || entry.status !== 'PUBLISHED') {
      throw new NotFoundException('Icerik bulunamadi.');
    }
    const alternates = await this.prisma.entry.findMany({
      where: { groupId: entry.groupId, status: 'PUBLISHED' },
      select: { localeCode: true, slug: true },
    });
    const result = { ...entry, alternates };
    await this.cache.set(cacheKey, result, 60);
    return result;
  }

  async listPublic(locale: string, q: ListQueryDto): Promise<unknown> {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 12;
    const cacheKey = `${CACHE_PREFIX}list:${locale}:${q.type ?? 'all'}:${page}:${pageSize}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const where: Prisma.EntryWhereInput = {
      localeCode: locale,
      status: 'PUBLISHED',
      ...(q.type ? { type: q.type } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.entry.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { seo: true, coverImage: true },
      }),
      this.prisma.entry.count({ where }),
    ]);
    const result = { items, total, page, pageSize };
    await this.cache.set(cacheKey, result, 60);
    return result;
  }

  // ----------------------------- ADMIN ------------------------------

  async create(dto: CreateEntryDto, authorId?: string) {
    this.assertBlocksValid(dto.blocks);
    const status = dto.status ?? 'DRAFT';
    const entry = await this.prisma.entry.create({
      data: {
        type: dto.type,
        locale: { connect: { code: dto.localeCode } },
        slug: dto.slug,
        title: dto.title,
        excerpt: dto.excerpt,
        status,
        publishAt: dto.publishAt ? new Date(dto.publishAt) : null,
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
        group: dto.groupId
          ? { connect: { id: dto.groupId } }
          : { create: { type: dto.type } },
        author: authorId ? { connect: { id: authorId } } : undefined,
        blocks: { create: this.toBlockCreate(dto.blocks) },
        seo: dto.seo ? { create: dto.seo } : undefined,
        categories: dto.categoryIds
          ? { create: dto.categoryIds.map((id) => ({ category: { connect: { id } } })) }
          : undefined,
      },
      include: { blocks: { orderBy: { order: 'asc' } }, seo: true },
    });
    await this.snapshotVersion(entry.id, authorId, 'created');
    await this.audit('entry.create', entry.id, authorId, {
      slug: entry.slug,
      type: entry.type,
      status: entry.status,
    });
    await this.invalidatePublicCache();
    return entry;
  }

  async findAll(q: ListQueryDto) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const where: Prisma.EntryWhereInput = { ...(q.type ? { type: q.type } : {}) };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.entry.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { seo: true },
      }),
      this.prisma.entry.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async findOne(id: string) {
    const entry = await this.prisma.entry.findUnique({
      where: { id },
      include: {
        blocks: { orderBy: { order: 'asc' } },
        seo: true,
        product: true,
        post: true,
        categories: { include: { category: true } },
      },
    });
    if (!entry) throw new NotFoundException('Icerik bulunamadi.');
    return entry;
  }

  async update(id: string, dto: UpdateEntryDto, userId?: string) {
    await this.findOne(id);
    this.assertBlocksValid(dto.blocks);
    const data: Prisma.EntryUpdateInput = {
      type: dto.type,
      slug: dto.slug,
      title: dto.title,
      excerpt: dto.excerpt,
    };
    if (dto.localeCode) {
      data.locale = { connect: { code: dto.localeCode } };
    }
    if (dto.status) {
      data.status = dto.status;
      data.publishedAt = dto.status === 'PUBLISHED' ? new Date() : null;
    }
    if (dto.publishAt !== undefined) {
      data.publishAt = dto.publishAt ? new Date(dto.publishAt) : null;
    }
    if (dto.blocks) {
      data.blocks = { deleteMany: {}, create: this.toBlockCreate(dto.blocks) };
    }
    if (dto.seo) {
      data.seo = { upsert: { create: dto.seo, update: dto.seo } };
    }
    const entry = await this.prisma.entry.update({
      where: { id },
      data,
      include: { blocks: { orderBy: { order: 'asc' } }, seo: true },
    });
    await this.snapshotVersion(id, userId);
    await this.audit(dto.status === 'PUBLISHED' ? 'entry.publish' : 'entry.update', id, userId, {
      status: dto.status ?? null,
    });
    await this.invalidatePublicCache();
    return entry;
  }

  async remove(id: string, userId?: string) {
    await this.findOne(id);
    await this.audit('entry.delete', id, userId);
    await this.prisma.entry.delete({ where: { id } });
    await this.invalidatePublicCache();
    return { success: true };
  }

  // --- Versiyon + audit okuma (admin) ---
  listVersions(entryId: string) {
    return this.prisma.contentVersion.findMany({
      where: { entryId },
      orderBy: { version: 'desc' },
      select: { id: true, version: true, note: true, createdById: true, createdAt: true },
    });
  }

  listAudit(q: ListQueryDto) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 50;
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  // Zamanlanmis yayin: publishAt'i gelmis (lte now) SCHEDULED icerikleri yayinlar.
  // Scheduler tarafindan periyodik cagrilir; her yayinda versiyon + audit yazar.
  async runScheduledPublish(): Promise<number> {
    const now = new Date();
    const due = await this.prisma.entry.findMany({
      where: { status: 'SCHEDULED', publishAt: { lte: now } },
      select: { id: true },
    });
    for (const e of due) {
      await this.prisma.entry.update({
        where: { id: e.id },
        data: { status: 'PUBLISHED', publishedAt: now },
      });
      await this.snapshotVersion(e.id, undefined, 'scheduled publish');
      await this.audit('entry.publish.scheduled', e.id);
    }
    if (due.length > 0) await this.invalidatePublicCache();
    return due.length;
  }
}
