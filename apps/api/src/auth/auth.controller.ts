import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import type { AuthUser } from './types';

interface CookieRequest extends Request {
  cookies: Record<string, string>;
}

const isProd = process.env.NODE_ENV === 'production';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      maxAge: Number(process.env.JWT_ACCESS_TTL ?? 900) * 1000,
    });
    // refresh cookie sadece auth uclarina gonderilir
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/api/auth',
      maxAge: Number(process.env.JWT_REFRESH_TTL ?? 604800) * 1000,
    });
  }

  @Post('login')
  @ApiOperation({ summary: 'Giris yap (httpOnly cookie + body access token)' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: AuthUser; accessToken: string }> {
    const { accessToken, refreshToken, user } = await this.auth.login(
      dto.email,
      dto.password,
    );
    this.setAuthCookies(res, accessToken, refreshToken);
    return { user, accessToken };
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'Access token yenile (refresh cookie ile, rotation)',
  })
  async refresh(
    @Req() req: CookieRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const token =
      req.cookies?.['refresh_token'] ??
      (req.body as { refreshToken?: string } | undefined)?.refreshToken;
    if (!token) throw new UnauthorizedException('Refresh token bulunamadi.');
    const { accessToken, refreshToken } = await this.auth.refresh(token);
    this.setAuthCookies(res, accessToken, refreshToken);
    return { accessToken };
  }

  @Post('logout')
  @ApiOperation({
    summary: 'Cikis yap (refresh token revoke + cookie temizle)',
  })
  async logout(
    @Req() req: CookieRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: true }> {
    await this.auth.logout(req.cookies?.['refresh_token']);
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/api/auth' });
    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mevcut kullanici bilgisi' })
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}
