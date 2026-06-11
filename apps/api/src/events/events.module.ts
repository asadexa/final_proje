import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

// Global: ContentService her modulden emit edebilsin.
// AuthModule: SSE ucu JwtAuthGuard kullaniyor (JwtService gerekli).
@Global()
@Module({
  imports: [AuthModule],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
