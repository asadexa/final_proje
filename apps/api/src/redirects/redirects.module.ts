import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminRedirectsController } from './admin-redirects.controller';
import { RedirectsController } from './redirects.controller';
import { RedirectsService } from './redirects.service';

// PrismaModule + RedisModule global oldugu icin import gerekmez;
// AuthModule: admin uclari icin JwtAuthGuard + RolesGuard (JwtService saglar).
@Module({
  imports: [AuthModule],
  controllers: [RedirectsController, AdminRedirectsController],
  providers: [RedirectsService],
})
export class RedirectsModule {}
