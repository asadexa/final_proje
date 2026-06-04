import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// Global: her modulde tekrar import etmeden PrismaService enjekte edilebilir.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
