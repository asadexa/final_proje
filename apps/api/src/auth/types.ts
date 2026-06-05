import type { Role } from '../generated/prisma/client';

// Access token icindeki imzali veri
export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

// req.user'a yazilan, uygulama ici kullanici temsili
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}
