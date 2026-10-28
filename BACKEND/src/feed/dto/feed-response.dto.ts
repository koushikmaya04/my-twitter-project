/**
 * Explicit API response DTOs.
 *
 * These types define the PUBLIC shape of API responses.
 * They are deliberately separated from repository/persistence types
 * (PostRecord, UserRecord, MediaRecord) so that internal database
 * fields can never leak into the API surface.
 */

/* ── Shared ─────────────────────────────────────────────── */

export interface PaginatedResponseDto<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

/* ── Post / Feed ────────────────────────────────────────── */

export interface PostAuthorDto {
  id: string;
  handle: string;
  displayName: string;
  avatar: {
    smallUrl: string;
    largeUrl: string;
  };
}

export interface PostMediaDto {
  id: string;
  altText: string;
  width: number;
  height: number;
  position: number;
  smallUrl: string;
  largeUrl: string;
}

export interface FeedPostDto {
  id: string;
  kind: 'original' | 'reply' | 'repost';
  text: string | null;
  createdAt: string;
  author: PostAuthorDto;
  media: PostMediaDto[];
  likeCount: number;
  replyCount: number;
  likedByViewer: boolean;
}

export type FeedResponseDto = PaginatedResponseDto<FeedPostDto>;

/* ── Post Detail ────────────────────────────────────────── */

export interface PostDetailResponseDto {
  item: FeedPostDto;
}

/* ── Search ─────────────────────────────────────────────── */

export type SearchResponseDto = PaginatedResponseDto<FeedPostDto>;

/* ── Like ───────────────────────────────────────────────── */

export interface LikeResponseDto {
  likedByViewer: boolean;
  likeCount: number;
}

/* ── User Profile ───────────────────────────────────────── */

export interface UserProfileDto {
  id: string;
  handle: string;
  displayName: string;
  bio: string | null;
  avatar: {
    smallUrl: string;
    largeUrl: string;
  };
  postCount: number;
  followerCount: number;
  followingCount: number;
}

export interface UserDetailResponseDto {
  item: UserProfileDto;
}

/* ── Profile Media ──────────────────────────────────────── */

export interface ProfileMediaDto {
  id: string;
  altText: string;
  width: number;
  height: number;
  position: number;
  smallUrl: string;
  largeUrl: string;
}

export type ProfileMediaResponseDto =
  PaginatedResponseDto<ProfileMediaDto>;

/* ── Create Post ────────────────────────────────────────── */

export interface CreatePostResponseDto {
  item: FeedPostDto;
}

/* ── Replies ────────────────────────────────────────────── */

export type RepliesResponseDto = PaginatedResponseDto<FeedPostDto>;