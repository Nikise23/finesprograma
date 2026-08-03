import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@fines.gob.ar' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Admin1234' })
  @IsString()
  @MinLength(8)
  password: string;
}
