import {
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SOCIAL_FEED_REPOSITORY } from '../data/repository/social-feed.repository.token';
import type { SocialFeedRepository } from '../data/repository/social-feed.repository';
import { mapPaginatedPosts } from './dto/dto-mappers';
import type { FeedResponseDto } from './dto/feed-response.dto';

@Injectable()
export class FeedService {
  constructor(
    private readonly configService: ConfigService,

    @Inject(SOCIAL_FEED_REPOSITORY)
    private readonly repository: SocialFeedRepository,
  ) {}

  async getFeed(
    cursor: string | null,
    limit: number,
  ): Promise<FeedResponseDto> {
    const viewerId =
      this.configService.getOrThrow<string>(
        'demoUserId',
      );

    const result = await this.repository.listOriginalFeed(
      cursor,
      limit,
      viewerId,
    );

    return mapPaginatedPosts(result);
  }
}