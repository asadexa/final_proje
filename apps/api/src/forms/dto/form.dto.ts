import { IsBoolean, IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitFormDto {
  @ApiProperty({ description: 'Form alan degerleri (name -> value)' })
  @IsObject()
  data!: Record<string, unknown>;

  @ApiProperty({ description: 'KVKK acik riza onayi' })
  @IsBoolean()
  consent!: boolean;

  @ApiPropertyOptional({ description: 'Honeypot (gizli alan; bot doldurursa spam)' })
  @IsOptional()
  @IsString()
  hp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  localeCode?: string;
}

export class UpdateSubmissionDto {
  @ApiProperty({ enum: ['NEW', 'READ', 'SPAM', 'ARCHIVED'] })
  @IsIn(['NEW', 'READ', 'SPAM', 'ARCHIVED'])
  status!: string;
}
