import { ForbiddenException, Inject, Injectable } from '@nestjs/common';

import { SOCIAL_FEED_REPOSITORY } from '../data/repository/social-feed.repository.token';
import type {
  SocialFeedRepository,
  UpdatePostCommand,
} from '../data/repository/social-feed.repository';
import {
  ConflictDomainError,
  NotFoundDomainError,
} from '../common/errors/domain-errors';
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
    viewerId: string | null = null,
  ): Promise<FeedResponseDto> {
    const result = await this.repository.listOriginalFeed(cursor, limit, viewerId);
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

  async updatePost(command: UpdatePostCommand) {
    const result = await this.repository.updatePost(command);

    switch (result.status) {
      case 'updated':
        return result.post;
      case 'not_found':
        throw new NotFoundDomainError('Post does not exist');
      case 'forbidden':
        throw new ForbiddenException('You cannot edit another user’s post');
      case 'not_editable':
        throw new ConflictDomainError('This post cannot be edited');
      case 'edit_window_expired':
        throw new ConflictDomainError('The 30-minute edit window has expired');
      case 'conflict':
        throw new ConflictDomainError(
          'Post version is stale; reload and retry',
        );
    }
  }

  async deletePost(postId: string, authorId: string) {
    const result = await this.repository.deletePost({ postId, authorId });

    switch (result.status) {
      case 'deleted':
        return;
      case 'not_found':
        throw new NotFoundDomainError('Post does not exist');
      case 'forbidden':
        throw new ForbiddenException('You cannot delete another user’s post');
    }
  }
}
