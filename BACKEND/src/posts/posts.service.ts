import {
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SOCIAL_FEED_REPOSITORY } from '../data/repository/social-feed.repository.token';
import type { SocialFeedRepository } from '../data/repository/social-feed.repository';
import {
  mapPostToDto,
  mapPaginatedPosts,
  mapLikeToDto,
} from '../feed/dto/dto-mappers';
import type {
  FeedPostDto,
  LikeResponseDto,
  RepliesResponseDto,
} from '../feed/dto/feed-response.dto';

@Injectable()
export class PostsService {
  constructor(
    private readonly configService: ConfigService,

    @Inject(SOCIAL_FEED_REPOSITORY)
    private readonly repository: SocialFeedRepository,
  ) {}

  async getPostById(
    id: string,
  ): Promise<FeedPostDto | null> {
    const viewerId =
      this.configService.getOrThrow<string>(
        'demoUserId',
      );

    const record = await this.repository.getPostById(
      id,
      viewerId,
    );

    if (!record) {
      return null;
    }

    return mapPostToDto(record);
  }

  async setLike(
    id: string,
    desiredState: boolean,
  ): Promise<LikeResponseDto> {
    const viewerId =
      this.configService.getOrThrow<string>(
        'demoUserId',
      );

    const result = await this.repository.setLike(
      id,
      viewerId,
      desiredState,
    );

    return mapLikeToDto(result);
  }

  async createPost(command: {
    kind: 'original' | 'reply' | 'repost';
    text?: string;
    replyToId?: string;
    repostOfId?: string;
  }): Promise<FeedPostDto> {
    const authorId =
      this.configService.getOrThrow<string>(
        'demoUserId',
      );

    const record = await this.repository.createPost({
      ...command,
      authorId,
    });

    return mapPostToDto(record);
  }

  async listReplies(
    postId: string,
    cursor: string | null,
    limit: number,
  ): Promise<RepliesResponseDto> {
    const viewerId =
      this.configService.getOrThrow<string>(
        'demoUserId',
      );

    const result = await this.repository.listReplies(
      postId,
      cursor,
      limit,
      viewerId,
    );

    return mapPaginatedPosts(result);
  }
}