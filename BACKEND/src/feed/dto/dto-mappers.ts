import type {
  PostRecord,
  UserRecord,
  MediaRecord,
  PaginatedResult,
} from '../../data/repository/social-feed.repository';

import type {
  FeedPostDto,
  PostAuthorDto,
  PostMediaDto,
  PaginatedResponseDto,
  UserProfileDto,
  ProfileMediaDto,
  LikeResponseDto,
} from './feed-response.dto';

/* ── Post mapping ───────────────────────────────────────── */

export function mapPostAuthorToDto(
  author: PostRecord['author'],
): PostAuthorDto {
  return {
    id: author.id,
    handle: author.handle,
    displayName: author.displayName,
    avatar: {
      smallUrl: author.avatar.smallUrl,
      largeUrl: author.avatar.largeUrl,
    },
  };
}

export function mapMediaToDto(
  media: MediaRecord,
): PostMediaDto {
  return {
    id: media.id,
    altText: media.altText,
    width: media.width,
    height: media.height,
    position: media.position,
    smallUrl: media.smallUrl,
    largeUrl: media.largeUrl,
  };
}

export function mapPostToDto(
  record: PostRecord,
): FeedPostDto {
  return {
    id: record.id,
    kind: record.kind,
    text: record.text,
    createdAt: record.createdAt,
    author: mapPostAuthorToDto(record.author),
    media: record.media.map(mapMediaToDto),
    likeCount: record.likeCount,
    replyCount: record.replyCount,
    likedByViewer: record.likedByViewer,
  };
}

/* ── Paginated post mapping ─────────────────────────────── */

export function mapPaginatedPosts(
  result: PaginatedResult<PostRecord>,
): PaginatedResponseDto<FeedPostDto> {
  return {
    items: result.items.map(mapPostToDto),
    nextCursor: result.nextCursor,
    hasMore: result.hasMore,
  };
}

/* ── User mapping ───────────────────────────────────────── */

export function mapUserToDto(
  record: UserRecord,
): UserProfileDto {
  return {
    id: record.id,
    handle: record.handle,
    displayName: record.displayName,
    bio: record.bio,
    avatar: {
      smallUrl: record.avatar.smallUrl,
      largeUrl: record.avatar.largeUrl,
    },
    postCount: record.postCount,
    followerCount: record.followerCount,
    followingCount: record.followingCount,
  };
}

/* ── Profile media mapping ──────────────────────────────── */

export function mapProfileMediaToDto(
  record: MediaRecord,
): ProfileMediaDto {
  return {
    id: record.id,
    altText: record.altText,
    width: record.width,
    height: record.height,
    position: record.position,
    smallUrl: record.smallUrl,
    largeUrl: record.largeUrl,
  };
}

export function mapPaginatedMedia(
  result: PaginatedResult<MediaRecord>,
): PaginatedResponseDto<ProfileMediaDto> {
  return {
    items: result.items.map(mapProfileMediaToDto),
    nextCursor: result.nextCursor,
    hasMore: result.hasMore,
  };
}

/* ── Like mapping ───────────────────────────────────────── */

export function mapLikeToDto(result: {
  likedByViewer: boolean;
  likeCount: number;
}): LikeResponseDto {
  return {
    likedByViewer: result.likedByViewer,
    likeCount: result.likeCount,
  };
}
