import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';

import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import type { Request } from 'express';

import { FeedService } from './feed.service';
import { AuthService } from '../auth/auth.service';
import { validateFeedQuery } from '../common/cursor-validation/feed-query.validation';
import { SessionGuard } from '../auth/session.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-request';

class UpdatePostBodyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(280)
  text!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}

@Controller('feed')
export class FeedController {
  constructor(
    private readonly feedService: FeedService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Fix #3: GET /feed now resolves the optional viewer from the session cookie
   * so that likedByViewer is correctly populated for authenticated users.
   * Unauthenticated requests still work — viewerId falls back to null.
   */
  @Get()
  async getFeed(@Req() request: Request) {
    const { cursor, limit } = validateFeedQuery(
      request.query as Record<string, unknown>,
    );

    const viewerId = await this.authService.resolveViewer(request.headers.cookie);

    return this.feedService.getFeed(cursor, limit, viewerId);
  }

  @Get('home')
  @UseGuards(SessionGuard)
  async getHomeFeed(@Req() request: AuthenticatedRequest) {
    const { cursor, limit } = validateFeedQuery(
      request.query as Record<string, unknown>,
    );

    return this.feedService.getHomeFeed(cursor, limit, request.user.id);
  }
  @Patch('posts/:id')
  @UseGuards(SessionGuard)
  async updatePost(
    @Param('id') postId: string,
    @Body() body: UpdatePostBodyDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.feedService.updatePost({
      postId,
      authorId: request.user.id,
      text: body.text.trim(),
      expectedVersion: body.expectedVersion,
    });
  }

  @Delete('posts/:id')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePost(
    @Param('id') postId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    await this.feedService.deletePost(postId, request.user.id);
  }
}
