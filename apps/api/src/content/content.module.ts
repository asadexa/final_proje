import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminAuditController } from './admin-audit.controller';
import { AdminContentController } from './admin-content.controller';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { PublishScheduler } from './publish.scheduler';

// AuthModule: admin uclari icin JwtAuthGuard + RolesGuard (JwtService bagimliligi).
@Module({
  imports: [AuthModule],
  controllers: [
    ContentController,
    AdminContentController,
    AdminAuditController,
  ],
  providers: [ContentService, PublishScheduler],
  exports: [ContentService],
})
export class ContentModule {}
