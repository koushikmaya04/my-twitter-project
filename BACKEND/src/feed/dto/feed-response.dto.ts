import type {
  PostRecord,
  PaginatedResult,
} from '../../data/repository/social-feed.repository';

export type FeedPostDto = PostRecord;

export type FeedResponseDto = PaginatedResult<FeedPostDto>;