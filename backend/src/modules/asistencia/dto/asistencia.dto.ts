import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AsistenciaItemDto {
  @ApiProperty()
  @IsUUID()
  estudianteId: string;

  @ApiProperty()
  @IsBoolean()
  presente: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  justificado?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class RegistrarAsistenciaDto {
  @ApiProperty()
  @IsUUID()
  comisionId: string;

  @ApiProperty({ example: '2026-07-20' })
  @IsDateString()
  fecha: string;

  @ApiProperty({ type: [AsistenciaItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AsistenciaItemDto)
  registros: AsistenciaItemDto[];
}
