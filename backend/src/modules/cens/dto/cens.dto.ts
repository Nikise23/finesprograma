import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCensDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  nombre: string;

  @ApiProperty()
  @IsString()
  direccion: string;

  @ApiProperty()
  @IsString()
  contacto: string;

  @ApiProperty()
  @IsString()
  directora: string;
}

export class UpdateCensDto extends PartialType(CreateCensDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
