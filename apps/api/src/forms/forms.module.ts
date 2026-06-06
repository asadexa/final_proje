import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminFormsController } from './admin-forms.controller';
import { FormsController } from './forms.controller';
import { FormsService } from './forms.service';

// AuthModule: admin uclari icin JwtAuthGuard + RolesGuard.
@Module({
  imports: [AuthModule],
  controllers: [FormsController, AdminFormsController],
  providers: [FormsService],
})
export class FormsModule {}
