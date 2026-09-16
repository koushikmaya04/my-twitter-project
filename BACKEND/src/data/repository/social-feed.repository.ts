export interface SocialFeedRepository {
  getFeed(
    cursor: string | null,
    limit: number,
  ): Promise<PaginatedResult<PostRecord>>;

  getPostById(id: string): Promise<PostRecord | null>;

  getUserById(id: string): Promise<UserRecord | null>;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface PostRecord {
  id: string;
  kind: 'original' | 'reply' | 'repost';
  text: string | null;
  createdAt: string;
  author: {
    id: string;
    handle: string;
    displayName: string;
    avatar: {
      smallUrl: string;
      largeUrl: string;
    };
  };
  media: MediaRecord[];
  likeCount: number;
  replyCount: number;
  likedByViewer: boolean;
  replyToId: string | null;
  repostOfId: string | null;
}

export interface MediaRecord {
  id: string;
  altText: string;
  width: number;
  height: number;
  position: number;
  smallUrl: string;
  largeUrl: string;
}

export interface UserRecord {
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