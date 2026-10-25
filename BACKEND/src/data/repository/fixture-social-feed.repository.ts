import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { SOCIAL_FEED_READ_FAILURE } from './social-feed-read-failure.token';
import type { SocialFeedReadFailure } from './social-feed-read-failure.token';

import type {
  CreatePostCommand,
  MediaRecord,
  FollowUserRecord,
  PaginatedResult,
  PostRecord,
  SocialFeedRepository,
  UserRecord,
  UpdateProfileCommand,
  UpdatePostCommand,
  UpdatePostResult,
  DeletePostCommand,
  DeletePostResult,
} from './social-feed.repository';

import {
  follows,
  likes,
  media,
  originalPosts,
  posts,
  users,
} from '../fixtures/fixture-data';

import { validateCursor } from '../../common/cursor-validation/cursor.validation';

type FixturePostEditState = {
  version: number;
  isEdited: boolean;
  editedAt: string | null;
};

const fixturePostEditStates = new Map<string, FixturePostEditState>();
const fixtureDeletedPostIds = new Set<string>();

export function resetFixtureDeletedPosts(): void {
  fixtureDeletedPostIds.clear();
}

@Injectable()
export class FixtureSocialFeedRepository implements SocialFeedRepository {
  constructor(
    private readonly configService: ConfigService,

    @Inject(SOCIAL_FEED_READ_FAILURE)
    private readonly readFailure: SocialFeedReadFailure,
  ) {}

  private checkReadFailure(): void {
    if (this.readFailure()) {
      throw new ServiceUnavailableException('Fixture read failed');
    }
  }

  private async waitIfConfigured(): Promise<void> {
    const delay = this.configService.getOrThrow<number>('simulatedIoMs');

    if (delay <= 0) {
      return;
    }

    await new Promise<void>((resolve) => {
      setTimeout(resolve, delay);
    });
  }

  async listOriginalFeed(
    cursor: string | null,
    limit: number,
    viewerId: string | null,
  ): Promise<PaginatedResult<PostRecord>> {
    await this.waitIfConfigured();
    this.checkReadFailure();

    let filteredPosts = [...originalPosts];

    filteredPosts.sort((a, b) => {
      const dateDifference =
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

      if (dateDifference !== 0) {
        return dateDifference;
      }

      return b.id.localeCompare(a.id);
    });

    if (cursor) {
      const decodedCursor = validateCursor(cursor);

      filteredPosts = filteredPosts.filter((post) => {
        const postTime = new Date(post.createdAt).getTime();
        const cursorTime = new Date(decodedCursor.createdAt).getTime();

        if (postTime < cursorTime) {
          return true;
        }

        if (postTime === cursorTime && post.id < decodedCursor.id) {
          return true;
        }

        return false;
      });
    }

    const page = filteredPosts.slice(0, limit + 1);
    const hasMore = page.length > limit;

    const items = page
      .slice(0, limit)
      .map((post) => this.toPostRecord(post, viewerId));

    const nextCursor =
      hasMore && items.length > 0
        ? this.encodeCursor(
            items[items.length - 1].createdAt,
            items[items.length - 1].id,
          )
        : null;

    return {
      items,
      nextCursor,
      hasMore,
    };
  }

  async listHomeFeed(
    cursor: string | null,
    limit: number,
    viewerId: string,
  ): Promise<PaginatedResult<PostRecord>> {
    await this.waitIfConfigured();
    this.checkReadFailure();

    // Include the viewer and accounts they currently follow.
    const eligibleAuthorIds = new Set([
      viewerId,
      ...follows
        .filter((follow) => follow.followerId === viewerId)
        .map((follow) => follow.followingId),
    ]);

    const activeUserIds = new Set(
      users.filter((user) => user.deactivatedAt == null).map((user) => user.id),
    );

    let filteredPosts = originalPosts.filter(
      (post) =>
        eligibleAuthorIds.has(post.authorId) &&
        activeUserIds.has(post.authorId) &&
        !fixtureDeletedPostIds.has(post.id),
    );

    // Keep the same stable ordering as the public feed.
    filteredPosts.sort((a, b) => {
      const dateDifference =
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

      if (dateDifference !== 0) {
        return dateDifference;
      }

      return b.id.localeCompare(a.id);
    });

    // Apply the existing timestamp + ID cursor.
    if (cursor) {
      const decodedCursor = validateCursor(cursor);

      filteredPosts = filteredPosts.filter((post) => {
        const postTime = new Date(post.createdAt).getTime();
        const cursorTime = new Date(decodedCursor.createdAt).getTime();

        return (
          postTime < cursorTime ||
          (postTime === cursorTime && post.id < decodedCursor.id)
        );
      });
    }

    const page = filteredPosts.slice(0, limit + 1);
    const hasMore = page.length > limit;

    const items = page
      .slice(0, limit)
      .map((post) => this.toPostRecord(post, viewerId));

    const lastItem = items[items.length - 1];

    return {
      items,
      hasMore,
      nextCursor:
        hasMore && lastItem
          ? this.encodeCursor(lastItem.createdAt, lastItem.id)
          : null,
    };
  }

  async getPostById(
    id: string,
    viewerId: string | null,
  ): Promise<PostRecord | null> {
    this.checkReadFailure();
    await this.waitIfConfigured();
    const post = posts.find((item) => item.id === id);

    if (!post || fixtureDeletedPostIds.has(post.id)) {
      return null;
    }
    return this.toPostRecord(post, viewerId);
  }

  async getUserById(id: string): Promise<UserRecord | null> {
    this.checkReadFailure();
    await this.waitIfConfigured();
    const user = users.find((item) => item.id === id);

    if (!user) {
      return null;
    }

    return this.toUserRecord(user);
  }

  async updateProfile(
    command: UpdateProfileCommand,
  ): Promise<UserRecord | null> {
    await this.waitIfConfigured();
    this.checkReadFailure();

    const user = users.find((item) => item.id === command.userId);

    if (!user) {
      return null;
    }

    if (command.displayName !== undefined) {
      user.displayName = command.displayName;
    }

    if (command.bio !== undefined) {
      user.bio = command.bio;
    }

    if (command.avatarSmallUrl !== undefined) {
      user.avatar.smallUrl = command.avatarSmallUrl ?? '';
    }

    if (command.avatarLargeUrl !== undefined) {
      user.avatar.largeUrl = command.avatarLargeUrl ?? '';
    }

    return this.toUserRecord(user);
  }

  async listReplies(
    postId: string,
    cursor: string | null,
    limit: number,
    viewerId: string | null,
  ): Promise<PaginatedResult<PostRecord>> {
    await this.waitIfConfigured();
    this.checkReadFailure();
    if (fixtureDeletedPostIds.has(postId)) {
      return {
        items: [],
        nextCursor: null,
        hasMore: false,
      };
    }
    let replies = posts.filter(
      (item) =>
        item.kind === 'reply' &&
        item.replyToId === postId &&
        !fixtureDeletedPostIds.has(item.id),
    );

    replies.sort((a, b) => {
      const dateDiff =
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (dateDiff !== 0) return dateDiff;
      return b.id.localeCompare(a.id);
    });

    if (cursor) {
      const decodedCursor = validateCursor(cursor);
      replies = replies.filter((post) => {
        const postTime = new Date(post.createdAt).getTime();
        const cursorTime = new Date(decodedCursor.createdAt).getTime();
        if (postTime < cursorTime) return true;
        if (postTime === cursorTime && post.id < decodedCursor.id) return true;
        return false;
      });
    }

    const page = replies.slice(0, limit + 1);
    const hasMore = page.length > limit;
    const items = page
      .slice(0, limit)
      .map((post) => this.toPostRecord(post, viewerId));

    const nextCursor =
      hasMore && items.length > 0
        ? this.encodeCursor(
            items[items.length - 1].createdAt,
            items[items.length - 1].id,
          )
        : null;

    return {
      items,
      nextCursor,
      hasMore,
    };
  }

  async listProfileMedia(
    userId: string,
    cursor: string | null,
    limit: number,
  ): Promise<PaginatedResult<MediaRecord>> {
    await this.waitIfConfigured();
    this.checkReadFailure();

    const userOriginalPostIds = new Set(
      posts
        .filter(
          (p) =>
            p.authorId === userId &&
            p.kind === 'original' &&
            !fixtureDeletedPostIds.has(p.id),
        )
        .map((p) => p.id),
    );

    const userMedia: Array<MediaRecord & { createdAt: string }> = [];
    for (const item of media) {
      if (userOriginalPostIds.has(item.postId)) {
        const parentPost = posts.find((p) => p.id === item.postId);
        userMedia.push({
          id: item.id,
          altText: item.altText,
          width: item.width,
          height: item.height,
          position: item.position,
          smallUrl: item.smallUrl,
          largeUrl: item.largeUrl,
          createdAt: parentPost?.createdAt ?? '',
        });
      }
    }

    userMedia.sort((a, b) => {
      const dateDiff =
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (dateDiff !== 0) return dateDiff;
      return b.id.localeCompare(a.id);
    });

    let filteredMedia = [...userMedia];
    if (cursor) {
      const decoded = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8'),
      );
      filteredMedia = filteredMedia.filter((m) => {
        const mTime = new Date(m.createdAt).getTime();
        const cTime = new Date(decoded.createdAt).getTime();
        if (mTime < cTime) return true;
        if (mTime === cTime && m.id < decoded.id) return true;
        return false;
      });
    }

    const page = filteredMedia.slice(0, limit + 1);
    const hasMore = page.length > limit;
    const items: MediaRecord[] = page.slice(0, limit).map((m) => ({
      id: m.id,
      altText: m.altText,
      width: m.width,
      height: m.height,
      position: m.position,
      smallUrl: m.smallUrl,
      largeUrl: m.largeUrl,
    }));

    const nextCursor =
      hasMore && page.length > 0
        ? Buffer.from(
            JSON.stringify({
              v: 1,
              createdAt: page[limit - 1].createdAt,
              id: page[limit - 1].id,
            }),
          ).toString('base64url')
        : null;

    return {
      items,
      nextCursor,
      hasMore,
    };
  }

  async searchOriginals(
    query: string,
    cursor: string | null,
    limit: number,
    viewerId: string,
  ): Promise<PaginatedResult<PostRecord>> {
    await this.waitIfConfigured();
    this.checkReadFailure();

    const lowerQuery = query.toLowerCase();
    let matching = originalPosts.filter(
      (p) =>
        !fixtureDeletedPostIds.has(p.id) &&
        p.text?.toLowerCase().includes(lowerQuery),
    );

    matching.sort((a, b) => {
      const dateDiff =
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (dateDiff !== 0) return dateDiff;
      return b.id.localeCompare(a.id);
    });

    if (cursor) {
      const decodedCursor = validateCursor(cursor);
      matching = matching.filter((post) => {
        const postTime = new Date(post.createdAt).getTime();
        const cursorTime = new Date(decodedCursor.createdAt).getTime();
        if (postTime < cursorTime) return true;
        if (postTime === cursorTime && post.id < decodedCursor.id) return true;
        return false;
      });
    }

    const page = matching.slice(0, limit + 1);
    const hasMore = page.length > limit;
    const items = page
      .slice(0, limit)
      .map((post) => this.toPostRecord(post, viewerId));

    const nextCursor =
      hasMore && items.length > 0
        ? this.encodeCursor(
            items[items.length - 1].createdAt,
            items[items.length - 1].id,
          )
        : null;

    return {
      items,
      nextCursor,
      hasMore,
    };
  }

  async createPost(command: CreatePostCommand): Promise<PostRecord> {
    await this.waitIfConfigured();
    const newPost = {
      id: 'fixture-created-post-id',
      authorId: command.authorId,
      kind: command.kind,
      text: command.text ?? null,
      createdAt: new Date().toISOString(),
      replyToId: command.replyToId ?? null,
      repostOfId: command.repostOfId ?? null,
    };

    return this.toPostRecord(newPost, command.authorId);
  }

  async updatePost(command: UpdatePostCommand): Promise<UpdatePostResult> {
    await this.waitIfConfigured();
    this.checkReadFailure();

    const post = posts.find((item) => item.id === command.postId);

    if (!post) {
      return { status: 'not_found' };
    }

    if (post.authorId !== command.authorId) {
      return { status: 'forbidden' };
    }

    if (post.kind === 'repost') {
      return { status: 'not_editable' };
    }

    const editDeadline = new Date(post.createdAt).getTime() + 30 * 60 * 1000;

    if (Date.now() > editDeadline) {
      return { status: 'edit_window_expired' };
    }

    const currentState = fixturePostEditStates.get(post.id);
    const currentVersion = currentState?.version ?? 1;

    if (command.expectedVersion !== currentVersion) {
      return { status: 'conflict' };
    }

    post.text = command.text;

    const editState: FixturePostEditState = {
      version: currentVersion + 1,
      isEdited: true,
      editedAt: new Date().toISOString(),
    };

    fixturePostEditStates.set(post.id, editState);

    const updatedPost = this.toPostRecord(post, command.authorId);

    return {
      status: 'updated',
      post: updatedPost,
    };
  }

  async deletePost(command: DeletePostCommand): Promise<DeletePostResult> {
    await this.waitIfConfigured();
    this.checkReadFailure();

    const post = posts.find((item) => item.id === command.postId);

    if (!post) {
      return { status: 'not_found' };
    }

    if (post.authorId !== command.authorId) {
      return { status: 'forbidden' };
    }

    // Repeated deletion by the owner is safe and idempotent.
    fixtureDeletedPostIds.add(post.id);

    return { status: 'deleted' };
  }

  async setLike(
    postId: string,
    viewerId: string,
    desiredState: boolean,
  ): Promise<{
    likedByViewer: boolean;
    likeCount: number;
  }> {
    await this.waitIfConfigured();

    const currentCount = likes.filter((l) => l.postId === postId).length;

    return {
      likedByViewer: desiredState,
      likeCount: desiredState
        ? currentCount + 1
        : Math.max(0, currentCount - 1),
    };
  }

  async setFollow(
    followerId: string,
    followingId: string,
    desiredState: boolean,
  ): Promise<{
    following: boolean;
    followerCount: number;
    followingCount: number;
  }> {
    await this.waitIfConfigured();
    this.checkReadFailure();

    if (followerId === followingId) {
      throw new Error('A user cannot follow themselves');
    }

    const follower = users.find((user) => user.id === followerId);
    const target = users.find((user) => user.id === followingId);

    if (!follower || !target) {
      throw new Error('Follow target or follower not found');
    }

    const existingIndex = follows.findIndex(
      (follow) =>
        follow.followerId === followerId && follow.followingId === followingId,
    );

    if (desiredState && existingIndex === -1) {
      follows.push({
        followerId,
        followingId,
        createdAt: new Date().toISOString(),
      });
    } else if (!desiredState && existingIndex !== -1) {
      follows.splice(existingIndex, 1);
    }

    return {
      following: follows.some(
        (follow) =>
          follow.followerId === followerId &&
          follow.followingId === followingId,
      ),
      followerCount: follows.filter(
        (follow) => follow.followingId === followingId,
      ).length,
      followingCount: follows.filter(
        (follow) => follow.followerId === followerId,
      ).length,
    };
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    this.checkReadFailure();
    await this.waitIfConfigured();

    return follows.some(
      (follow) =>
        follow.followerId === followerId && follow.followingId === followingId,
    );
  }

  async listFollowers(
    userId: string,
    cursor: string | null,
    limit: number,
  ): Promise<PaginatedResult<FollowUserRecord>> {
    return this.listFollowUsers(userId, cursor, limit, 'followers');
  }

  async listFollowing(
    userId: string,
    cursor: string | null,
    limit: number,
  ): Promise<PaginatedResult<FollowUserRecord>> {
    return this.listFollowUsers(userId, cursor, limit, 'following');
  }

  private async listFollowUsers(
    userId: string,
    cursor: string | null,
    limit: number,
    direction: 'followers' | 'following',
  ): Promise<PaginatedResult<FollowUserRecord>> {
    this.checkReadFailure();
    await this.waitIfConfigured();

    if (!users.some((user) => user.id === userId)) {
      return { items: [], nextCursor: null, hasMore: false };
    }

    const decoded = cursor ? validateCursor(cursor) : null;

    const items = follows
      .filter((follow) =>
        direction === 'followers'
          ? follow.followingId === userId
          : follow.followerId === userId,
      )
      .map((follow) => {
        const personId =
          direction === 'followers' ? follow.followerId : follow.followingId;

        const user = users.find((item) => item.id === personId);

        return user
          ? {
              id: user.id,
              handle: user.handle,
              displayName: user.displayName,
              bio: user.bio,
              avatar: {
                smallUrl: user.avatar.smallUrl,
                largeUrl: user.avatar.largeUrl,
              },
              followedAt: follow.createdAt,
            }
          : null;
      })
      .filter((item): item is FollowUserRecord => item !== null)
      .sort((a, b) => {
        const timeComparison = b.followedAt.localeCompare(a.followedAt);

        return timeComparison !== 0 ? timeComparison : b.id.localeCompare(a.id);
      })
      .filter((item) => {
        if (!decoded) return true;

        return (
          item.followedAt < decoded.createdAt ||
          (item.followedAt === decoded.createdAt &&
            item.id.localeCompare(decoded.id) < 0)
        );
      });

    const page = items.slice(0, limit + 1);
    const hasMore = page.length > limit;
    const pageItems = page.slice(0, limit);

    const lastItem = pageItems[pageItems.length - 1];

    return {
      items: pageItems,
      hasMore,
      nextCursor:
        hasMore && lastItem
          ? this.encodeCursor(lastItem.followedAt, lastItem.id)
          : null,
    };
  }

  private toPostRecord(
    post: (typeof posts)[number],
    viewerId: string | null,
  ): PostRecord {
    const author = users.find((user) => user.id === post.authorId);

    if (!author) {
      throw new Error(`Fixture author not found: ${post.authorId}`);
    }

    const postMedia: MediaRecord[] = media
      .filter((item) => item.postId === post.id)
      .sort((a, b) => a.position - b.position)
      .map((item) => ({
        id: item.id,
        altText: item.altText,
        width: item.width,
        height: item.height,
        position: item.position,
        smallUrl: item.smallUrl,
        largeUrl: item.largeUrl,
      }));

    const likeCount = likes.filter((like) => like.postId === post.id).length;

    const replyCount = posts.filter(
      (item) => item.kind === 'reply' && item.replyToId === post.id,
    ).length;

    const likedByViewer =
      viewerId !== null &&
      likes.some((like) => like.postId === post.id && like.userId === viewerId);
    const editState = fixturePostEditStates.get(post.id);
    return {
      version: editState?.version ?? 1,
      isEdited: editState?.isEdited ?? false,
      editedAt: editState?.editedAt ?? null,
      id: post.id,
      kind: post.kind,
      text: post.text,
      createdAt: post.createdAt,
      author: {
        id: author.id,
        handle: author.handle,
        displayName: author.displayName,
        avatar: {
          smallUrl: author.avatar.smallUrl,
          largeUrl: author.avatar.largeUrl,
        },
      },
      media: postMedia,
      likeCount,
      replyCount,
      likedByViewer,
      replyToId: post.replyToId,
      repostOfId: post.repostOfId,
    };
  }

  private toUserRecord(user: (typeof users)[number]): UserRecord {
    const postCount = originalPosts.filter(
      (post) => post.authorId === user.id,
    ).length;

    const followerCount = follows.filter(
      (follow) => follow.followingId === user.id,
    ).length;

    const followingCount = follows.filter(
      (follow) => follow.followerId === user.id,
    ).length;

    return {
      id: user.id,
      handle: user.handle,
      displayName: user.displayName,
      bio: user.bio,
      avatar: {
        smallUrl: user.avatar.smallUrl,
        largeUrl: user.avatar.largeUrl,
      },
      postCount,
      followerCount,
      followingCount,
    };
  }

  private encodeCursor(createdAt: string, id: string): string {
    const payload = JSON.stringify({
      v: 1,
      createdAt,
      id,
    });

    return Buffer.from(payload).toString('base64url');
  }
}
