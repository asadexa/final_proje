import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { validateBlockData } from '@kron/shared';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  BlockDto,
  CreateEntryDto,
  ListQueryDto,
  UpdateEntryDto,
} from './dto/entry.dto';

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  // Bloklarin data'sini paylasilan Zod semasiyla dogrular (no any).
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

  // ----------------------------- PUBLIC -----------------------------

  async resolve(locale: string, slug: string) {
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
    // hreflang icin ayni gruptaki diger dillerin slug'lari
    const alternates = await this.prisma.entry.findMany({
      where: { groupId: entry.groupId, status: 'PUBLISHED' },
      select: { localeCode: true, slug: true },
    });
    return { ...entry, alternates };
  }

  async listPublic(locale: string, q: ListQueryDto) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 12;
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
    return { items, total, page, pageSize };
  }

  // ----------------------------- ADMIN ------------------------------

  async create(dto: CreateEntryDto, authorId?: string) {
    this.assertBlocksValid(dto.blocks);
    const status = dto.status ?? 'DRAFT';
    return this.prisma.entry.create({
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

  async update(id: string, dto: UpdateEntryDto) {
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
      // bloklar verildiyse tamamen degistir (sil + yeniden olustur)
      data.blocks = { deleteMany: {}, create: this.toBlockCreate(dto.blocks) };
    }
    if (dto.seo) {
      data.seo = { upsert: { create: dto.seo, update: dto.seo } };
    }
    return this.prisma.entry.update({
      where: { id },
      data,
      include: { blocks: { orderBy: { order: 'asc' } }, seo: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.entry.delete({ where: { id } });
    return { success: true };
  }
}
