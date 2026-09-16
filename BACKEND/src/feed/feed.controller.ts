import {
  Controller,
  Get,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import { FeedService } from './feed.service';
import { validateFeedQuery } from '../common/cursor-validation/feed-query.validation';

@Controller('feed')
export class FeedController {
  constructor(
    private readonly feedService: FeedService,
  ) {}

  @Get()
  async getFeed(@Req() request: Request) {
    const { cursor, limit } = validateFeedQuery(
      request.query as Record<string, unknown>,
    );

    return this.feedService.getFeed(cursor, limit);
  }
}