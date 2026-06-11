import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { AuthUser, JwtPayload } from '../types';

type AuthedRequest = Request & {
  user?: AuthUser;
  cookies?: Record<string, string>;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const token = this.extractToken(req);
    if (!token) {
      throw new UnauthorizedException('Kimlik dogrulama tokeni bulunamadi.');
    }
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
      req.user = { id: payload.sub, email: payload.email, role: payload.role };
      return true;
    } catch {
      throw new UnauthorizedException('Gecersiz veya suresi dolmus token.');
    }
  }

  // Once httpOnly cookie, sonra Authorization: Bearer (Swagger testleri icin)
  private extractToken(req: AuthedRequest): string | undefined {
    const cookies = req.cookies as Record<string, string> | undefined;
    const fromCookie = cookies?.['access_token'];
    if (fromCookie) return fromCookie;
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) return header.slice(7);
    return undefined;
  }
}
