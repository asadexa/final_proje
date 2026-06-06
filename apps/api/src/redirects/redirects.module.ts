import { Module } from '@nestjs/common';
import { RedirectsController } from './redirects.controller';
import { RedirectsService } from './redirects.service';

// PrismaModule + RedisModule global oldugu icin import gerekmez.
@Module({
  controllers: [RedirectsController],
  providers: [RedirectsService],
})
export class RedirectsModule {}
