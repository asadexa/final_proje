import { createHash } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SubmissionStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { SubmitFormDto } from './dto/form.dto';

interface FieldDef {
  name: string;
  label?: string;
  type?: string;
  required?: boolean;
}

function asFields(v: Prisma.JsonValue): FieldDef[] {
  return Array.isArray(v) ? (v as unknown as FieldDef[]) : [];
}

@Injectable()
export class FormsService {
  constructor(private readonly prisma: PrismaService) {}

  // --------------------------- PUBLIC ---------------------------

  async getDefinition(key: string) {
    const def = await this.prisma.formDefinition.findUnique({ where: { key } });
    if (!def || !def.enabled) throw new NotFoundException('Form bulunamadi.');
    return { key: def.key, name: def.name, fields: def.fields };
  }

  async submit(key: string, dto: SubmitFormDto, ip?: string, ua?: string) {
    const def = await this.prisma.formDefinition.findUnique({ where: { key } });
    if (!def || !def.enabled) throw new NotFoundException('Form bulunamadi.');

    // Spam korumasi: honeypot alani doluysa bot kabul et (sessizce SPAM olarak sakla).
    const isSpam = typeof dto.hp === 'string' && dto.hp.trim().length > 0;

    if (!isSpam) {
      if (!dto.consent) throw new BadRequestException('KVKK acik riza onayi gerekli.');
      // Sunucu tarafi zorunlu alan dogrulamasi (tanima gore).
      for (const f of asFields(def.fields)) {
        if (f.required) {
          const v = dto.data?.[f.name];
          if (v === undefined || v === null || String(v).trim() === '') {
            throw new BadRequestException(`Zorunlu alan eksik: ${f.label ?? f.name}`);
          }
        }
      }
    }

    // KVKK: ham IP saklamayiz; hash'li tutariz.
    const ipHash = ip ? createHash('sha256').update(ip).digest('hex').slice(0, 32) : null;

    await this.prisma.formSubmission.create({
      data: {
        formId: def.id,
        localeCode: dto.localeCode ?? null,
        data: (dto.data ?? {}) as Prisma.InputJsonValue,
        consent: Boolean(dto.consent),
        ipHash,
        userAgent: ua?.slice(0, 255) ?? null,
        status: isSpam ? SubmissionStatus.SPAM : SubmissionStatus.NEW,
      },
    });
    return { success: true };
  }

  // --------------------------- ADMIN ---------------------------

  listDefinitions() {
    return this.prisma.formDefinition.findMany({ orderBy: { key: 'asc' } });
  }

  async listSubmissions(key: string, page = 1, pageSize = 50) {
    const def = await this.prisma.formDefinition.findUnique({ where: { key } });
    if (!def) throw new NotFoundException('Form bulunamadi.');
    const [items, total] = await this.prisma.$transaction([
      this.prisma.formSubmission.findMany({
        where: { formId: def.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.formSubmission.count({ where: { formId: def.id } }),
    ]);
    return { items, total, page, pageSize, fields: def.fields };
  }

  updateStatus(id: string, status: string) {
    return this.prisma.formSubmission.update({
      where: { id },
      data: { status: status as SubmissionStatus },
    });
  }

  async exportCsv(key: string): Promise<string> {
    const def = await this.prisma.formDefinition.findUnique({ where: { key } });
    if (!def) throw new NotFoundException('Form bulunamadi.');
    const subs = await this.prisma.formSubmission.findMany({
      where: { formId: def.id },
      orderBy: { createdAt: 'desc' },
    });
    const fields = asFields(def.fields);
    const headers = ['createdAt', 'status', 'consent', ...fields.map((f) => f.name)];
    const rows = subs.map((s) => {
      const data = (s.data ?? {}) as Record<string, unknown>;
      return [
        s.createdAt.toISOString(),
        s.status,
        String(s.consent),
        ...fields.map((f) => String(data[f.name] ?? '')),
      ]
        .map(csvCell)
        .join(',');
    });
    return [headers.join(','), ...rows].join('\n');
  }
}

function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}
