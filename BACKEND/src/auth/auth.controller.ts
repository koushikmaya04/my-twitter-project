import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
    @Req() request: Request & { requestId?: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    const userAgent = request.headers['user-agent'] as string | undefined;

    const result = await this.authService.login(body, {
      userAgent,
      requestId: request.requestId,
    });

   response.cookie('session', result.token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
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

  @Get('sessions')
  @UseGuards(SessionGuard)
  async getSessions(@Req() request: AuthenticatedRequest) {
    const userAgent = request.headers['user-agent'] as string | undefined;

    return this.authService.getSessions(
      request.user.id,
      request.headers.cookie,
      userAgent,
    );
  }

  @Delete('sessions/:id')
  @UseGuards(SessionGuard)
  async revokeSession(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest & { requestId?: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.revokeSession(
      request.user.id,
      id,
      request.headers.cookie,
      {
        requestId: request.requestId,
        actorUsername: request.user.handle,
      },
    );

    if (result.isCurrent) {
      response.clearCookie('session', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
    }

    return {
      item: {
        revoked: true,
        isCurrent: result.isCurrent,
      },
    };
  }

  @Post('sessions/revoke-others')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.OK)
  async revokeOtherSessions(
    @Req() request: AuthenticatedRequest & { requestId?: string },
  ) {
    const result = await this.authService.revokeOtherSessions(
      request.user.id,
      request.headers.cookie,
      {
        requestId: request.requestId,
        actorUsername: request.user.handle,
      },
    );

    return {
      item: result,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() request: Request & { requestId?: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(request.headers.cookie, request.requestId);

    response.clearCookie('session', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return { item: { loggedOut: true } };
  }
}