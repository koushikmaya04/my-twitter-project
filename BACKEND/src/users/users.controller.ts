import {
  Controller,
  Get,
  NotFoundException,
  Param,
} from '@nestjs/common';

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
}