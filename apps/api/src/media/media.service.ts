import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

// Dosya icerigini (magic-byte) okuyup gercek tipini dondurur. Client'in bildirdigi
// mime'a guvenmeyiz: ".jpg" adiyla gonderilen bir HTML/SVG'yi reddetmek icin.
// SVG bilincli olarak DISARIDA: XML + script tasiyabilir, public bucket'tan
// dogrudan acildiginda XSS riski. Yalniz raster gorseller kabul edilir.
function detectImageMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)
    return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)
    return 'image/png';
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'image/gif';
  if (
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  )
    return 'image/webp';
  if (buf.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buf.toString('ascii', 8, 12);
    if (brand.startsWith('avif') || brand.startsWith('avis'))
      return 'image/avif';
  }
  return null;
}

@Injectable()
export class MediaService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly prisma: PrismaService) {
    this.bucket = process.env.S3_BUCKET ?? 'kron-media';
    this.publicUrl = process.env.S3_PUBLIC_URL ?? 'http://localhost:9000';
    this.s3 = new S3Client({
      region: process.env.S3_REGION ?? 'us-east-1',
      endpoint: process.env.S3_ENDPOINT ?? 'http://minio:9000',
      forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY ?? 'minioadmin',
        secretAccessKey: process.env.S3_SECRET_KEY ?? 'minioadmin',
      },
    });
  }

  async upload(file: Express.Multer.File, userId?: string, folder = 'uploads') {
    // Gercek tipi icerikten dogrula — client mime'ina guvenme.
    const detectedMime = detectImageMime(file.buffer);
    if (!detectedMime) {
      throw new BadRequestException(
        'Gecersiz veya desteklenmeyen gorsel (JPEG/PNG/GIF/WebP/AVIF olmali; SVG kabul edilmez).',
      );
    }
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${folder}/${randomUUID()}-${safeName}`;
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        // Tespit edilen guvenli tip (client'in bildirdigi degil).
        ContentType: detectedMime,
      }),
    );
    const url = `${this.publicUrl}/${this.bucket}/${key}`;
    return this.prisma.media.create({
      data: {
        key,
        url,
        mime: detectedMime,
        size: file.size,
        folder: `/${folder}`,
        createdById: userId,
      },
    });
  }

  async list(page = 1, pageSize = 24) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.media.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.media.count(),
    ]);
    return { items, total, page, pageSize };
  }

  async findOne(id: string) {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) throw new NotFoundException('Medya bulunamadi.');
    return media;
  }

  async remove(id: string) {
    const media = await this.findOne(id);
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: media.key }),
    );
    await this.prisma.media.delete({ where: { id } });
    return { success: true };
  }
}
