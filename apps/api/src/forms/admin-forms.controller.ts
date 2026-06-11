import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  CreateFormDefinitionDto,
  UpdateFormDefinitionDto,
  UpdateSubmissionDto,
} from './dto/form.dto';
import { FormsService } from './forms.service';

@ApiTags('forms (admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/forms')
export class AdminFormsController {
  constructor(private readonly forms: FormsService) {}

  @Get()
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Form tanimlarini listele' })
  list() {
    return this.forms.listDefinitions();
  }

  @Post()
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Form tanimi olustur' })
  createDefinition(@Body() dto: CreateFormDefinitionDto) {
    return this.forms.createDefinition(dto);
  }

  @Patch(':key')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Form tanimini guncelle (alanlar/enable dahil)' })
  updateDefinition(
    @Param('key') key: string,
    @Body() dto: UpdateFormDefinitionDto,
  ) {
    return this.forms.updateDefinition(key, dto);
  }

  @Get(':key/submissions/export')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Gonderimleri CSV olarak disa aktar' })
  async export(@Param('key') key: string, @Res() res: Response): Promise<void> {
    const csv = await this.forms.exportCsv(key);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${key}-submissions.csv"`,
    );
    res.send(csv);
  }

  @Get(':key/submissions')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Form gonderimlerini listele' })
  submissions(
    @Param('key') key: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.forms.listSubmissions(
      key,
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 50,
    );
  }

  @Patch('submissions/:id')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({
    summary: 'Gonderim durumunu guncelle (NEW/READ/SPAM/ARCHIVED)',
  })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateSubmissionDto) {
    return this.forms.updateStatus(id, dto.status);
  }
}
