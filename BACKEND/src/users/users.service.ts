import { Inject, Injectable } from '@nestjs/common';
import type {
  SocialFeedRepository,
  UserRecord,
} from '../data/repository/social-feed.repository';
import { SOCIAL_FEED_REPOSITORY } from '../data/repository/social-feed.repository.token';

@Injectable()
export class UsersService {
  constructor(
    @Inject(SOCIAL_FEED_REPOSITORY)
    private readonly repository: SocialFeedRepository,
  ) {}

  async getUserById(id: string): Promise<UserRecord | null> {
    return this.repository.getUserById(id);
  }

  async listProfileMedia(
    userId: string,
    cursor: string | null,
    limit: number,
  ) {
    return this.repository.listProfileMedia(
      userId,
      cursor,
      limit,
    );
  }
}