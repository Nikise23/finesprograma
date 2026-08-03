import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSedeDto {
  @ApiProperty()
  @IsUUID()
  censId: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  nombre: string;

  @ApiProperty()
  @IsString()
  direccion: string;
}

export class UpdateSedeDto extends PartialType(CreateSedeDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
