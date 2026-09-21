import { Inject, Injectable } from '@nestjs/common';
import type {
  SocialFeedRepository,
} from '../data/repository/social-feed.repository';
import { SOCIAL_FEED_REPOSITORY } from '../data/repository/social-feed.repository.token';
import {
  mapUserToDto,
  mapPaginatedMedia,
} from '../feed/dto/dto-mappers';
import type {
  UserProfileDto,
  ProfileMediaResponseDto,
} from '../feed/dto/feed-response.dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject(SOCIAL_FEED_REPOSITORY)
    private readonly repository: SocialFeedRepository,
  ) {}

  async getUserById(id: string): Promise<UserProfileDto | null> {
    const record = await this.repository.getUserById(id);

    if (!record) {
      return null;
    }

    return mapUserToDto(record);
  }

  async listProfileMedia(
    userId: string,
    cursor: string | null,
    limit: number,
  ): Promise<ProfileMediaResponseDto> {
    const result = await this.repository.listProfileMedia(
      userId,
      cursor,
      limit,
    );

    return mapPaginatedMedia(result);
  }
}