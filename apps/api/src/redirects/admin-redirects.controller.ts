import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateRedirectDto, UpdateRedirectDto } from './dto/redirect.dto';
import { RedirectsService } from './redirects.service';

// 301/302 yonetimi (PDF SEO gereksinimi "Redirect yonetimi").
// Degisiklik Redis cache'i dusurur; web proxy'nin in-memory cache'i <=60sn icinde tazelenir.
@ApiTags('redirects (admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/redirects')
export class AdminRedirectsController {
  constructor(private readonly redirects: RedirectsService) {}

  @Get()
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Tum yonlendirmeleri listele' })
  list() {
    return this.redirects.listAll();
  }

  @Post()
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Yonlendirme olustur' })
  create(@Body() dto: CreateRedirectDto) {
    return this.redirects.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Yonlendirme guncelle (enable/disable dahil)' })
  update(@Param('id') id: string, @Body() dto: UpdateRedirectDto) {
    return this.redirects.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Yonlendirme sil' })
  remove(@Param('id') id: string) {
    return this.redirects.remove(id);
  }
}
