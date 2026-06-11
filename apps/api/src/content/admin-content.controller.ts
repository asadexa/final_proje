import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/types';
import { ContentService } from './content.service';
import { CreateEntryDto, ListQueryDto, UpdateEntryDto } from './dto/entry.dto';

@ApiTags('content (admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/entries')
export class AdminContentController {
  constructor(private readonly content: ContentService) {}

  @Post()
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Icerik olustur (bloklarla)' })
  create(@Body() dto: CreateEntryDto, @CurrentUser() user: AuthUser) {
    return this.content.create(dto, user.id, user.role);
  }

  @Get()
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Tum icerikleri listele (her durum)' })
  findAll(@Query() query: ListQueryDto) {
    return this.content.findAll(query);
  }

  // NOT: 'graph' statik yolu ':id'den ONCE tanimlanmali (NestJS bildirim sirasina bakar)
  @Get('graph')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({
    summary: 'Icerik iliski grafigi (dugumler + ic link/ceviri kenarlari)',
  })
  graph() {
    return this.content.contentGraph();
  }

  @Get(':id')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Tek icerik (bloklar + seo + detay)' })
  findOne(@Param('id') id: string) {
    return this.content.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({
    summary: 'Icerik guncelle (bloklar verildiyse degistirilir)',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEntryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.content.update(id, dto, user.id, user.role);
  }

  @Get(':id/versions')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Icerik versiyon gecmisi' })
  versions(@Param('id') id: string) {
    return this.content.listVersions(id);
  }

  @Get(':id/health')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({
    summary: 'Icerik saglik denetimi (kural tabanli SEO/erisilebilirlik/UX)',
  })
  health(@Param('id') id: string) {
    return this.content.healthCheck(id);
  }

  @Get(':id/versions/:version')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({
    summary: 'Tek surumun tam snapshot detayi (Time Machine onizleme/diff)',
  })
  version(@Param('id') id: string, @Param('version') version: string) {
    return this.content.getVersion(id, Number(version));
  }

  @Post(':id/versions/:version/restore')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Bir versiyonu geri yukle (yeni versiyon olusur)' })
  restore(
    @Param('id') id: string,
    @Param('version') version: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.content.restoreVersion(id, Number(version), user.id);
  }

  @Get(':id/preview')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Icerik icin imzali onizleme linki uret' })
  previewLink(@Param('id') id: string) {
    return this.content.previewLink(id);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Icerik sil (sadece ADMIN)' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.content.remove(id, user.id);
  }
}
