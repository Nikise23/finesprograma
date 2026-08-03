import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private service: UsersService) {}

  @Get()
  @Roles(Rol.ADMIN)
  findAll(@Query('rol') rol?: Rol, @Query('q') q?: string) {
    return this.service.findAll({ rol, q });
  }

  @Post()
  @Roles(Rol.ADMIN)
  create(@Body() dto: CreateUserDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user.sub);
  }

  @Patch(':id')
  @Roles(Rol.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user.sub);
  }

  @Delete(':id')
  @Roles(Rol.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.remove(id, user.sub);
  }
}
