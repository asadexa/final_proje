import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { SubmitFormDto } from './dto/form.dto';
import { FormsService } from './forms.service';

@ApiTags('forms (public)')
@Controller('forms')
export class FormsController {
  constructor(private readonly forms: FormsService) {}

  @Get(':key')
  @ApiOperation({ summary: 'Form tanimini getir (alanlar)' })
  definition(@Param('key') key: string) {
    return this.forms.getDefinition(key);
  }

  @Post(':key/submit')
  @ApiOperation({
    summary: 'Form gonder (sunucu validasyon + honeypot + KVKK)',
  })
  submit(
    @Param('key') key: string,
    @Body() dto: SubmitFormDto,
    @Req() req: Request,
  ) {
    const fwd = req.headers['x-forwarded-for'];
    const ip =
      (typeof fwd === 'string' ? fwd.split(',')[0]?.trim() : undefined) ||
      req.socket.remoteAddress ||
      undefined;
    return this.forms.submit(key, dto, ip, req.headers['user-agent']);
  }
}
