import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { SessionGuard } from '../auth/session.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { validateFeedQuery } from '../common/cursor-validation/feed-query.validation';
import { validateUuid } from '../common/errors/uuid.validation';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(SessionGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async listNotifications(@Req() request: AuthenticatedRequest) {
    const { cursor, limit } = validateFeedQuery(
      request.query as Record<string, unknown>,
    );

    return this.notificationsService.listNotifications(
      request.user.id,
      cursor,
      limit,
    );
  }

  @Get('unread-count')
  async getUnreadCount(@Req() request: AuthenticatedRequest) {
    return this.notificationsService.getUnreadCount(request.user.id);
  }

  @Patch('read-all')
  async markAllAsReadPatch(@Req() request: AuthenticatedRequest) {
    return this.notificationsService.markAllAsRead(request.user.id);
  }

  @Post('read-all')
  async markAllAsReadPost(@Req() request: AuthenticatedRequest) {
    return this.notificationsService.markAllAsRead(request.user.id);
  }

  @Patch(':id/read')
  async markOneAsReadPatch(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const validId = validateUuid(id);
    const item = await this.notificationsService.markAsRead(
      validId,
      request.user.id,
    );
    return { item };
  }

  @Post(':id/read')
  async markOneAsReadPost(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const validId = validateUuid(id);
    const item = await this.notificationsService.markAsRead(
      validId,
      request.user.id,
    );
    return { item };
  }
}
