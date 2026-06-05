import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/types';
import { MediaService } from './media.service';

@ApiTags('media (admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post()
  @Roles('ADMIN', 'EDITOR')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Dosya yukle (S3/MinIO) + medya kaydi' })
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) throw new BadRequestException('Dosya gerekli (alan adi: file).');
    return this.media.upload(file, user.id);
  }

  @Get()
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Medya kutuphanesi (yeniden kullanim icin)' })
  list(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.media.list(
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 24,
    );
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Medya sil (S3 + kayit)' })
  remove(@Param('id') id: string) {
    return this.media.remove(id);
  }
}
