import { Inject, Injectable } from '@nestjs/common';
import type {
  SocialFeedRepository,
   FollowUserRecord,
  PaginatedResult
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

async updateProfile(
  userId: string,
  updates: {
    displayName?: string;
    bio?: string | null;
    avatarSmallUrl?: string | null;
    avatarLargeUrl?: string | null;
  },
): Promise<UserProfileDto | null> {
  const record = await this.repository.updateProfile({
    userId,
    ...updates,
  });

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
  async setFollow(
  followerId: string,
  followingId: string,
  desiredState: boolean,
) {
  return this.repository.setFollow(
    followerId,
    followingId,
    desiredState,
  );
}

async isFollowing(
  followerId: string,
  followingId: string,
): Promise<boolean> {
  return this.repository.isFollowing(followerId, followingId);
}

async listFollowers(
  userId: string,
  cursor: string | null,
  limit: number,
): Promise<PaginatedResult<FollowUserRecord>> {
  return this.repository.listFollowers(userId, cursor, limit);
}

async listFollowing(
  userId: string,
  cursor: string | null,
  limit: number,
): Promise<PaginatedResult<FollowUserRecord>> {
  return this.repository.listFollowing(userId, cursor, limit);
}
}