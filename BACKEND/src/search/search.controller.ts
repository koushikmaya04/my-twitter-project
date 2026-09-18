import {
  BadRequestException,
  Controller,
  Get,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
  ) {}

  @Get('posts')
  async searchPosts(@Req() request: Request) {
    const q =
      typeof request.query.q === 'string'
        ? request.query.q.trim()
        : '';

    if (q.length < 2 || q.length > 80) {
      throw new BadRequestException(
        'q must be between 2 and 80 characters',
      );
    }

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

    return this.searchService.searchPosts(
      q,
      cursor,
      limit,
    );
  }
}
