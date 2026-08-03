import {

  IsArray,

  IsInt,

  IsNumber,

  IsOptional,

  IsString,

  IsUUID,

  Max,

  Min,

  ValidateNested,

} from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Type } from 'class-transformer';



export class UpsertNotaDto {

  @ApiProperty()

  @IsUUID()

  estudianteId: string;



  @ApiProperty()

  @IsUUID()

  comisionId: string;



  @ApiProperty({ example: 'PRÁCTICAS DEL LENGUAJE 3' })

  @IsString()

  materia: string;



  /** Cuatrimestre del plan (1-6), igual al módulo de la comisión */

  @ApiProperty({ minimum: 1, maximum: 6, description: '1=1°1C … 6=3°2C' })

  @Type(() => Number)

  @IsInt()

  @Min(1)

  @Max(6)

  cuatrimestre: number;



  @ApiProperty({ minimum: 1, maximum: 10 })

  @Type(() => Number)

  @IsNumber()

  @Min(1)

  @Max(10)

  nota: number;



  @ApiPropertyOptional()

  @IsOptional()

  @IsString()

  observaciones?: string;

}



export class BulkNotasDto {

  @ApiProperty({ type: [UpsertNotaDto] })

  @IsArray()

  @ValidateNested({ each: true })

  @Type(() => UpsertNotaDto)

  notas: UpsertNotaDto[];

}


