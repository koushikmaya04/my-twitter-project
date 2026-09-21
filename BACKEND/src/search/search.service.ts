import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SOCIAL_FEED_REPOSITORY } from '../data/repository/social-feed.repository.token';
import type { SocialFeedRepository } from '../data/repository/social-feed.repository';
import { mapPaginatedPosts } from '../feed/dto/dto-mappers';
import type { SearchResponseDto } from '../feed/dto/feed-response.dto';

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
  ): Promise<SearchResponseDto> {
    const viewerId =
      this.configService.getOrThrow<string>('demoUserId');

    const result = await this.repository.searchOriginals(
      query,
      cursor,
      limit,
      viewerId,
    );

    return mapPaginatedPosts(result);
  }
}
