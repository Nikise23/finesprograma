import { PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDocenteDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty()
  @IsString()
  apellido: string;

  @ApiProperty()
  @IsString()
  nombre: string;

  @ApiProperty()
  @IsString()
  dni: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telefono?: string;
}

export class UpdateDocenteDto extends PartialType(CreateDocenteDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
