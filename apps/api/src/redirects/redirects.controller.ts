import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RedirectsService } from './redirects.service';

@ApiTags('redirects (public)')
@Controller('redirects')
export class RedirectsController {
  constructor(private readonly redirects: RedirectsService) {}

  @Get()
  @ApiOperation({ summary: 'Aktif 301/302 yonlendirmeler (web proxy icin)' })
  list() {
    return this.redirects.listEnabled();
  }
}
