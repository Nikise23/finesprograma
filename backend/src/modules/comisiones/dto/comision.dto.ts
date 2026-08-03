import { PartialType } from '@nestjs/swagger';

import {

  IsArray,

  IsBoolean,

  IsInt,

  IsOptional,

  IsString,

  IsUUID,

  Max,

  Min,

} from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Type } from 'class-transformer';



export class CreateComisionDto {

  @ApiProperty()

  @IsUUID()

  sedeId: string;



  @ApiProperty({ description: 'Cuatrimestre/módulo del plan (1-6)', example: 1 })

  @Type(() => Number)

  @IsInt()

  @Min(1)

  @Max(6)

  moduloId: number;



  @ApiProperty()

  @IsString()

  numero: string;



  @ApiProperty()

  @IsString()

  direccion: string;



  @ApiProperty()

  @IsString()

  referente: string;



  @ApiProperty({ type: [String], example: ['2215551234', 'ref@mail.com'] })

  @IsArray()

  contactos: string[];



  @ApiProperty({ example: '2026' })

  @IsString()

  cicloLectivo: string;



  @ApiPropertyOptional({ example: 'Marzo 2024 Ciencias Sociales' })

  @IsOptional()

  @IsString()

  cohorte?: string;



  @ApiPropertyOptional({ example: '3°1C' })

  @IsOptional()

  @IsString()

  anioCursada?: string;



  @ApiPropertyOptional({ example: 'M' })

  @IsOptional()

  @IsString()

  turno?: string;

}



export class UpdateComisionDto extends PartialType(CreateComisionDto) {

  @ApiPropertyOptional()

  @IsOptional()

  @IsBoolean()

  activo?: boolean;

}



export class AssignDocenteDto {

  @ApiProperty()

  @IsUUID()

  docenteId: string;



  @ApiPropertyOptional({ description: 'Materia que dicta en esta comisión' })

  @IsOptional()

  @IsUUID()

  materiaId?: string;



  @ApiPropertyOptional({ example: '00033/WQQ' })

  @IsOptional()

  @IsString()

  codigo?: string;



  @ApiPropertyOptional({ example: 'Martes 08:00 a 10:40' })

  @IsOptional()

  @IsString()

  horario?: string;

}


