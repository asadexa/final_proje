import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ContentModule } from '../content/content.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

// AuthModule: guard'lar icin JwtService (ogrenilen ders);
// ContentModule: ContentService export ediyor olmali — kontrol edilir.
@Module({
  imports: [AuthModule, ContentModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
