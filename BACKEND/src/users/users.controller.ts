import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import { UsersService } from './users.service';
import { validateUuid } from '../common/errors/uuid.validation';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

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