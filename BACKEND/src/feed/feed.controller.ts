import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { FeedService } from './feed.service';
import { validateFeedQuery } from '../common/cursor-validation/feed-query.validation';
import { SessionGuard } from '../auth/session.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-request';

@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  async getFeed(@Req() request: Request) {
    const { cursor, limit } = validateFeedQuery(
      request.query as Record<string, unknown>,
    );

    return this.feedService.getFeed(cursor, limit);
  }

  @Get('home')
  @UseGuards(SessionGuard)
  async getHomeFeed(@Req() request: AuthenticatedRequest) {
    const { cursor, limit } = validateFeedQuery(
      request.query as Record<string, unknown>,
    );

    return this.feedService.getHomeFeed(cursor, limit, request.user.id);
  }
}
