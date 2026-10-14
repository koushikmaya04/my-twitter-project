import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { SessionGuard } from './session.guard';
import type { AuthenticatedRequest } from './authenticated-request';
import { UseGuards, UnauthorizedException } from '@nestjs/common';

import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(
    @Body()
    body: {
      handle: string;
      displayName: string;
      password: string;
    },
  ) {
    return this.authService.register(body);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: { handle: string; password: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(body);

    response.cookie('session', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { item: result.item };
  }

  @Get('me')
  async me(@Req() request: Request) {
    const user = await this.authService.me(request.headers.cookie);
    return { item: user };
  }
@Post('deactivate')
@UseGuards(SessionGuard)
async deactivate(
  @Req() request: AuthenticatedRequest,
  @Res({ passthrough: true }) response: Response,
) {
  if (!request.user) {
    throw new UnauthorizedException('Authentication required');
  }

  await this.authService.deactivate(request.user.id);

  response.clearCookie('session', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });

  return { item: { deactivated: true } };
}


  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(request.headers.cookie);

    response.clearCookie('session', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return { item: { loggedOut: true } };
  }
}