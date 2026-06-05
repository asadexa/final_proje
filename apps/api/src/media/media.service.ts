import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

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
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${folder}/${randomUUID()}-${safeName}`;
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );
    const url = `${this.publicUrl}/${this.bucket}/${key}`;
    return this.prisma.media.create({
      data: {
        key,
        url,
        mime: file.mimetype,
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
