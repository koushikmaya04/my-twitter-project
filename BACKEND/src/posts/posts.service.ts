import {
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SOCIAL_FEED_REPOSITORY } from '../data/repository/social-feed.repository.token';
import type { SocialFeedRepository } from '../data/repository/social-feed.repository';

@Injectable()
export class PostsService {
  constructor(
    private readonly configService: ConfigService,

    @Inject(SOCIAL_FEED_REPOSITORY)
    private readonly repository: SocialFeedRepository,
  ) {}

  async getPostById(id: string) {
    const viewerId =
      this.configService.getOrThrow<string>(
        'DEMO_USER_ID',
      );

    return this.repository.getPostById(
      id,
      viewerId,
    );
  }

  async setLike(id: string, desiredState: boolean) {
    const viewerId =
      this.configService.getOrThrow<string>(
        'DEMO_USER_ID',
      );

    return this.repository.setLike(
      id,
      viewerId,
      desiredState,
    );
  }

  async createPost(command: {
    kind: 'original' | 'reply' | 'repost';
    text?: string;
    replyToId?: string;
    repostOfId?: string;
  }) {
    const authorId =
      this.configService.getOrThrow<string>(
        'DEMO_USER_ID',
      );

    return this.repository.createPost({
      ...command,
      authorId,
    });
  }

  async listReplies(
    postId: string,
    cursor: string | null,
    limit: number,
  ) {
    const viewerId =
      this.configService.getOrThrow<string>(
        'DEMO_USER_ID',
      );

    return this.repository.listReplies(
      postId,
      cursor,
      limit,
      viewerId,
    );
  }
}