import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Req,
  Patch,
Body,
UseGuards,
UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { SessionGuard } from '../auth/session.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { UpdateProfileDto } from './dto/update-profile.dto';


import { UsersService } from './users.service';
import { validateUuid } from '../common/errors/uuid.validation';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Patch('me')
  @UseGuards(SessionGuard)
  async updateMyProfile(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ) {
    if (!request.user) {
      throw new UnauthorizedException();
    }

    const updatedUser = await this.usersService.updateProfile(
      request.user.id,
      dto,
    );

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return { item: updatedUser };
  }

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    const validId = validateUuid(id);

    const user =
      await this.usersService.getUserById(validId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      item: user,
    };
  }

  @Get(':id/media')
  async listProfileMedia(
    @Param('id') id: string,
    @Req() request: Request,
  ) {
    const validId = validateUuid(id);
    const cursor =
      typeof request.query.cursor === 'string'
        ? request.query.cursor
        : null;
    const limit =
      typeof request.query.limit === 'string'
        ? Math.min(
            50,
            Math.max(1, parseInt(request.query.limit, 10) || 10),
          )
        : 10;

    return this.usersService.listProfileMedia(
      validId,
      cursor,
      limit,
    );
  }
}