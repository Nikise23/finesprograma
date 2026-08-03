import { PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoEstudiante } from '@prisma/client';

/** class-validator IsOptional ignores only null/undefined — empty strings still fail */
const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === '' || value === null ? undefined : value;

export class CreateEstudianteDto {
  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsUUID()
  comisionId?: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  apellido: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  nombre: string;

  @ApiProperty()
  @IsString()
  dni: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsDateString()
  fechaNacimiento?: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsUUID()
  libroMatrizId?: string;
}

export class UpdateEstudianteDto extends PartialType(CreateEstudianteDto) {
  @ApiPropertyOptional({ enum: EstadoEstudiante })
  @IsOptional()
  @IsEnum(EstadoEstudiante)
  estado?: EstadoEstudiante;
}

export class SolicitarBajaDto {
  @ApiProperty()
  @IsString()
  @MinLength(5)
  motivo: string;
}
