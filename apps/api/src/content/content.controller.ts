import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ContentService } from './content.service';
import { ListQueryDto } from './dto/entry.dto';

@ApiTags('content (public)')
@Controller('content')
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get(':locale')
  @ApiOperation({ summary: 'Yayindaki icerikleri listele (tip filtreli: blog/urun)' })
  list(@Param('locale') locale: string, @Query() query: ListQueryDto) {
    return this.content.listPublic(locale, query);
  }

  @Get(':locale/:slug')
  @ApiOperation({ summary: 'Slug ile yayindaki icerigi cozumle (bloklar + seo + hreflang)' })
  resolve(@Param('locale') locale: string, @Param('slug') slug: string) {
    return this.content.resolve(locale, slug);
  }
}
