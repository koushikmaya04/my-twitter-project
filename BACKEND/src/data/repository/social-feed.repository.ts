export interface CreatePostCommand {
  authorId: string;
  kind: 'original' | 'reply' | 'repost';
  text?: string;
  replyToId?: string;
  repostOfId?: string;
}

export interface UpdatePostCommand {
  postId: string;
  authorId: string;
  text: string;
  expectedVersion: number;
}

export type UpdatePostResult =
  | { status: 'updated'; post: PostRecord }
  | { status: 'not_found' }
  | { status: 'forbidden' }
  | { status: 'not_editable' }
  | { status: 'edit_window_expired' }
  | { status: 'conflict' };

export interface DeletePostCommand {
  postId: string;
  authorId: string;
}

export type DeletePostResult =
  { status: 'deleted' } | { status: 'not_found' } | { status: 'forbidden' };

export interface FollowUserRecord {
  id: string;
  handle: string;
  displayName: string;
  bio: string | null;
  avatar: {
    smallUrl: string;
    largeUrl: string;
  };
  followedAt: string;
}

export interface UpdateProfileCommand {
  userId: string;
  displayName?: string;
  bio?: string | null;
  avatarSmallUrl?: string | null;
  avatarLargeUrl?: string | null;
}

export interface SocialFeedRepository {
  listOriginalFeed(
    cursor: string | null,
    limit: number,
    viewerId: string | null,
  ): Promise<PaginatedResult<PostRecord>>;

  listHomeFeed(
    cursor: string | null,
    limit: number,
    viewerId: string,
  ): Promise<PaginatedResult<PostRecord>>;

  getPostById(id: string, viewerId: string | null): Promise<PostRecord | null>;

  getUserById(id: string): Promise<UserRecord | null>;

  setFollow(
    followerId: string,
    followingId: string,
    desiredState: boolean,
  ): Promise<{
    following: boolean;
    followerCount: number;
    followingCount: number;
  }>;

  isFollowing(followerId: string, followingId: string): Promise<boolean>;

  listFollowers(
    userId: string,
    cursor: string | null,
    limit: number,
  ): Promise<PaginatedResult<FollowUserRecord>>;

  listFollowing(
    userId: string,
    cursor: string | null,
    limit: number,
  ): Promise<PaginatedResult<FollowUserRecord>>;

  updateProfile(command: UpdateProfileCommand): Promise<UserRecord | null>;

  listReplies(
    postId: string,
    cursor: string | null,
    limit: number,
    viewerId: string | null,
  ): Promise<PaginatedResult<PostRecord>>;

  listProfileMedia(
    userId: string,
    cursor: string | null,
    limit: number,
  ): Promise<PaginatedResult<MediaRecord>>;

  searchOriginals(
    query: string,
    cursor: string | null,
    limit: number,
    viewerId: string | null,
  ): Promise<PaginatedResult<PostRecord>>;

  createPost(command: CreatePostCommand): Promise<PostRecord>;
  updatePost(command: UpdatePostCommand): Promise<UpdatePostResult>;
  deletePost(command: DeletePostCommand): Promise<DeletePostResult>;

  setLike(
    postId: string,
    viewerId: string,
    desiredState: boolean,
  ): Promise<{
    likedByViewer: boolean;
    likeCount: number;
  }>;
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
  version: number;
  isEdited: boolean;
  editedAt: string | null;
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
