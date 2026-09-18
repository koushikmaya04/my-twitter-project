import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SOCIAL_FEED_REPOSITORY } from '../data/repository/social-feed.repository.token';
import type { SocialFeedRepository } from '../data/repository/social-feed.repository';

@Injectable()
export class SearchService {
  constructor(
    private readonly configService: ConfigService,

    @Inject(SOCIAL_FEED_REPOSITORY)
    private readonly repository: SocialFeedRepository,
  ) {}

  async searchPosts(
    query: string,
    cursor: string | null,
    limit: number,
  ) {
    const viewerId =
      this.configService.getOrThrow<string>('DEMO_USER_ID');

    return this.repository.searchOriginals(
      query,
      cursor,
      limit,
      viewerId,
    );
  }
}
