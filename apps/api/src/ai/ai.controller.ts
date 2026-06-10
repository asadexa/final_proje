import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/types';
import { AiService } from './ai.service';

export class ArchitectDto {
  @ApiProperty({ example: 'Yeni bir siber guvenlik izleme urunu icin landing page olustur' })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  prompt!: string;

  @ApiProperty({ example: 'tr', enum: ['tr', 'en'] })
  @IsIn(['tr', 'en'])
  localeCode!: string;
}

// AI Site Architect: prompt -> Zod-dogrulamali blok JSON'u -> TASLAK sayfa.
@ApiTags('ai (admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('architect')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Dogal dil promptundan taslak sayfa uret (key yoksa sablon modu)' })
  architect(@Body() dto: ArchitectDto, @CurrentUser() user: AuthUser) {
    return this.ai.architect(dto.prompt, dto.localeCode, user.id, user.role);
  }
}
