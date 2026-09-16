import { Inject, Injectable } from '@nestjs/common';
import type {
  PostRecord,
  SocialFeedRepository,
} from '../data/repository/social-feed.repository';
import { SOCIAL_FEED_REPOSITORY } from '../data/repository/social-feed.repository.token';

@Injectable()
export class PostsService {
  constructor(
    @Inject(SOCIAL_FEED_REPOSITORY)
    private readonly repository: SocialFeedRepository,
  ) {}

  async getPostById(id: string): Promise<PostRecord | null> {
    return this.repository.getPostById(id);
  }
}