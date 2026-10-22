import { Inject, Injectable } from '@nestjs/common';

import { SOCIAL_FEED_REPOSITORY } from '../data/repository/social-feed.repository.token';
import type { SocialFeedRepository } from '../data/repository/social-feed.repository';
import { mapPaginatedPosts } from './dto/dto-mappers';
import type { FeedResponseDto } from './dto/feed-response.dto';

@Injectable()
export class FeedService {
  constructor(
    @Inject(SOCIAL_FEED_REPOSITORY)
    private readonly repository: SocialFeedRepository,
  ) {}

  async getFeed(
    cursor: string | null,
    limit: number,
  ): Promise<FeedResponseDto> {
    const result = await this.repository.listOriginalFeed(cursor, limit, null);

    return mapPaginatedPosts(result);
  }
  async getHomeFeed(
    cursor: string | null,
    limit: number,
    viewerId: string,
  ): Promise<FeedResponseDto> {
    const result = await this.repository.listHomeFeed(cursor, limit, viewerId);

    return mapPaginatedPosts(result);
  }
}
