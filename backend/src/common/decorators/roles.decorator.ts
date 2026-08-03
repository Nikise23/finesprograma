import { SetMetadata } from '@nestjs/common';
import { Rol } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
