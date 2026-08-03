import { PartialType } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateLibroMatrizDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  posicion?: number;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  apellido: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  nombre: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  dni: string;

  @ApiPropertyOptional({ example: 'L6/F32' })
  @IsOptional()
  @IsString()
  libroFolio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class UpdateLibroMatrizDto extends PartialType(CreateLibroMatrizDto) {}
