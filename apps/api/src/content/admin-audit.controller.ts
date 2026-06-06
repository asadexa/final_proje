import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ContentService } from './content.service';
import { ListQueryDto } from './dto/entry.dto';

@ApiTags('audit (admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/audit')
export class AdminAuditController {
  constructor(private readonly content: ContentService) {}

  @Get()
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Audit log (en yeni kayitlar)' })
  list(@Query() query: ListQueryDto) {
    return this.content.listAudit(query);
  }
}
