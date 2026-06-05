import { SetMetadata } from '@nestjs/common';
import type { Role } from '../../generated/prisma/client';

export const ROLES_KEY = 'roles';

// Kullanim: @Roles('ADMIN') veya @Roles('ADMIN','EDITOR')
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
