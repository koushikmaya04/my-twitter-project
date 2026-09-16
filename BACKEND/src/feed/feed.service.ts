import { Inject, Injectable } from '@nestjs/common';
import type { SocialFeedRepository } from '../data/repository/social-feed.repository';
import { SOCIAL_FEED_REPOSITORY } from '../data/repository/social-feed.repository.token';
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
    return this.repository.getFeed(cursor, limit);
  }
}