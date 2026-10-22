import {
  Inject,
  Injectable,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { and, desc, eq, inArray, lt, or, sql, isNull } from 'drizzle-orm';

import { DATABASE } from '../../database/database.provider';
import { follows, likes, postMedia, posts, users } from '../../database/schema';

import type {
  SocialFeedRepository,
  FollowUserRecord,
  PaginatedResult,
  PostRecord,
  UserRecord,
  MediaRecord,
  CreatePostCommand,
  UpdateProfileCommand,
} from './social-feed.repository';
import { validateCursor } from '../../common/cursor-validation/cursor.validation';

import { SOCIAL_FEED_READ_FAILURE } from './social-feed-read-failure.token';
import type { SocialFeedReadFailure } from './social-feed-read-failure.token';

import {
  ConflictDomainError,
  InvalidTargetError,
  NotFoundDomainError,
} from '../../common/errors/domain-errors';

@Injectable()
export class DrizzleSocialFeedRepository implements SocialFeedRepository {
  constructor(
    @Inject(DATABASE)
    private readonly db: any,

    @Optional()
    @Inject(SOCIAL_FEED_READ_FAILURE)
    private readonly readFailure?: SocialFeedReadFailure,

    @Optional()
    private readonly configService?: ConfigService,
  ) {}

  private checkReadFailure(): void {
    if (this.readFailure && this.readFailure()) {
      throw new ServiceUnavailableException('Database read failure simulated');
    }
  }

  private async waitIfConfigured(): Promise<void> {
    if (!this.configService) {
      return;
    }

    const delay = this.configService.get<number>('simulatedIoMs') ?? 0;

    if (delay <= 0) {
      return;
    }

    await new Promise<void>((resolve) => {
      setTimeout(resolve, delay);
    });
  }

  private encodeCursor(createdAt: Date, id: string): string {
    return Buffer.from(
      JSON.stringify({
        v: 1,
        createdAt: createdAt.toISOString(),
        id,
      }),
    ).toString('base64url');
  }

  private decodeCursor(cursor: string): {
    createdAt: Date;
    id: string;
  } {
    const decoded = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    );

    return {
      createdAt: new Date(decoded.createdAt),
      id: decoded.id,
    };
  }
  private async hydratePosts(
    pageRows: Array<{
      id: string;
      kind: string;
      text: string | null;
      createdAt: Date;
      replyToId: string | null;
      repostOfId: string | null;
      authorId: string;
      handle: string;
      displayName: string;
    }>,
    viewerId: string | null,
    executor: any = this.db,
  ): Promise<PostRecord[]> {
    const postIds = pageRows.map((post) => post.id);

    if (postIds.length === 0) {
      return [];
    }

    // 1. Batch Media Query
    const mediaRows = await executor
      .select({
        id: postMedia.id,
        postId: postMedia.postId,
        altText: postMedia.altText,
        width: postMedia.width,
        height: postMedia.height,
        position: postMedia.position,
        smallUrl: postMedia.smallUrl,
        largeUrl: postMedia.largeUrl,
      })
      .from(postMedia)
      .where(inArray(postMedia.postId, postIds))
      .orderBy(postMedia.position);

    // 2. Batch Like Counts Query
    const likeRows = await executor
      .select({
        postId: likes.postId,
        count: sql<number>`count(*)::int`,
      })
      .from(likes)
      .where(inArray(likes.postId, postIds))
      .groupBy(likes.postId);

    // 3. Batch Reply Counts Query
    const replyRows = await executor
      .select({
        postId: posts.replyToId,
        count: sql<number>`count(*)::int`,
      })
      .from(posts)
      .where(inArray(posts.replyToId, postIds))
      .groupBy(posts.replyToId);

    // 4. Batch Viewer Likes Query
    const viewerLikeRows = viewerId
      ? await executor
          .select({
            postId: likes.postId,
          })
          .from(likes)
          .where(
            and(eq(likes.userId, viewerId), inArray(likes.postId, postIds)),
          )
      : [];

    const mediaByPost = new Map<string, MediaRecord[]>();
    for (const media of mediaRows) {
      const existing = mediaByPost.get(media.postId) ?? [];
      existing.push({
        id: media.id,
        altText: media.altText,
        width: media.width,
        height: media.height,
        position: media.position,
        smallUrl: media.smallUrl,
        largeUrl: media.largeUrl,
      });
      mediaByPost.set(media.postId, existing);
    }

    const likesByPost = new Map<string, number>();
    for (const row of likeRows) {
      likesByPost.set(row.postId, Number(row.count));
    }

    const repliesByPost = new Map<string, number>();
    for (const row of replyRows) {
      if (row.postId) {
        repliesByPost.set(row.postId, Number(row.count));
      }
    }

    const viewerLikedPostIds = new Set<string>();
    for (const row of viewerLikeRows) {
      viewerLikedPostIds.add(row.postId);
    }

    return pageRows.map((post) => ({
      id: post.id,
      kind: post.kind as PostRecord['kind'],
      text: post.text,
      createdAt: post.createdAt.toISOString(),
      author: {
        id: post.authorId,
        handle: post.handle,
        displayName: post.displayName,
        avatar: this.getUserAvatar(post.handle),
      },
      media: mediaByPost.get(post.id) ?? [],
      likeCount: likesByPost.get(post.id) ?? 0,
      replyCount: repliesByPost.get(post.id) ?? 0,
      likedByViewer: viewerLikedPostIds.has(post.id),
      replyToId: post.replyToId,
      repostOfId: post.repostOfId,
    }));
  }

  async listOriginalFeed(
    cursor: string | null,
    limit: number,
    viewerId: string | null,
  ): Promise<PaginatedResult<PostRecord>> {
    await this.waitIfConfigured();
    this.checkReadFailure();

    let cursorValue: {
      createdAt: Date;
      id: string;
    } | null = null;

    if (cursor) {
      cursorValue = this.decodeCursor(cursor);
    }

    const conditions = [
      eq(posts.kind, 'original'),
      isNull(users.deactivatedAt),
    ];

    if (cursorValue) {
      conditions.push(
        or(
          lt(posts.createdAt, cursorValue.createdAt),
          and(
            eq(posts.createdAt, cursorValue.createdAt),
            lt(posts.id, cursorValue.id),
          ),
        )!,
      );
    }

    const rows = await this.db
      .select({
        id: posts.id,
        kind: posts.kind,
        text: posts.text,
        createdAt: posts.createdAt,
        replyToId: posts.replyToId,
        repostOfId: posts.repostOfId,

        authorId: users.id,
        handle: users.handle,
        displayName: users.displayName,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(and(...conditions))
      .orderBy(desc(posts.createdAt), desc(posts.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const pageRows = rows.slice(0, limit);

    const items = await this.hydratePosts(pageRows, viewerId);

    const lastRow = pageRows[pageRows.length - 1];

    return {
      items,
      hasMore,
      nextCursor:
        hasMore && lastRow
          ? this.encodeCursor(lastRow.createdAt, lastRow.id)
          : null,
    };
  }
  async listHomeFeed(
    cursor: string | null,
    limit: number,
    viewerId: string,
  ): Promise<PaginatedResult<PostRecord>> {
    await this.waitIfConfigured();
    this.checkReadFailure();

    const cursorValue = cursor ? this.decodeCursor(cursor) : null;

    const conditions = [
      eq(posts.kind, 'original'),
      isNull(users.deactivatedAt),
      or(
        eq(posts.authorId, viewerId),
        inArray(
          posts.authorId,
          this.db
            .select({ followingId: follows.followingId })
            .from(follows)
            .where(eq(follows.followerId, viewerId)),
        ),
      )!,
    ];

    if (cursorValue) {
      conditions.push(
        or(
          lt(posts.createdAt, cursorValue.createdAt),
          and(
            eq(posts.createdAt, cursorValue.createdAt),
            lt(posts.id, cursorValue.id),
          ),
        )!,
      );
    }

    const rows = await this.db
      .select({
        id: posts.id,
        kind: posts.kind,
        text: posts.text,
        createdAt: posts.createdAt,
        replyToId: posts.replyToId,
        repostOfId: posts.repostOfId,
        authorId: users.id,
        handle: users.handle,
        displayName: users.displayName,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(and(...conditions))
      .orderBy(desc(posts.createdAt), desc(posts.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const pageRows = rows.slice(0, limit);
    const items = await this.hydratePosts(pageRows, viewerId);
    const lastRow = pageRows[pageRows.length - 1];

    return {
      items,
      hasMore,
      nextCursor:
        hasMore && lastRow
          ? this.encodeCursor(lastRow.createdAt, lastRow.id)
          : null,
    };
  }
  async getPostById(
    id: string,
    viewerId: string | null,
    executor: any = this.db,
  ): Promise<PostRecord | null> {
    const result = await executor
      .select({
        id: posts.id,
        kind: posts.kind,
        text: posts.text,
        createdAt: posts.createdAt,
        replyToId: posts.replyToId,
        repostOfId: posts.repostOfId,

        authorId: users.id,
        handle: users.handle,
        displayName: users.displayName,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(and(eq(posts.id, id), isNull(users.deactivatedAt)))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const post = result[0];

    const media = await executor
      .select({
        id: postMedia.id,
        altText: postMedia.altText,
        width: postMedia.width,
        height: postMedia.height,
        position: postMedia.position,
        smallUrl: postMedia.smallUrl,
        largeUrl: postMedia.largeUrl,
      })
      .from(postMedia)
      .where(eq(postMedia.postId, id))
      .orderBy(postMedia.position);

    const likeCount = await executor
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(likes)
      .where(eq(likes.postId, id));

    const replyCount = await executor
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(posts)
      .where(eq(posts.replyToId, id));

    const viewerLike = viewerId
      ? await executor
          .select({
            postId: likes.postId,
          })
          .from(likes)
          .where(and(eq(likes.userId, viewerId), eq(likes.postId, id)))
          .limit(1)
      : [];

    return {
      id: post.id,
      kind: post.kind as PostRecord['kind'],
      text: post.text,
      createdAt: post.createdAt.toISOString(),
      author: {
        id: post.authorId,
        handle: post.handle,
        displayName: post.displayName,
        avatar: this.getUserAvatar(post.handle),
      },
      media,
      likeCount: Number(likeCount[0].count),
      replyCount: Number(replyCount[0].count),
      likedByViewer: viewerLike.length > 0,
      replyToId: post.replyToId,
      repostOfId: post.repostOfId,
    };
  }

  async listReplies(
    postId: string,
    cursor: string | null,
    limit: number,
    viewerId: string | null,
  ): Promise<PaginatedResult<PostRecord>> {
    await this.waitIfConfigured();
    this.checkReadFailure();

    let cursorValue: {
      createdAt: Date;
      id: string;
    } | null = null;

    if (cursor) {
      cursorValue = this.decodeCursor(cursor);
    }

    const conditions = [
      eq(posts.kind, 'reply'),
      eq(posts.replyToId, postId),
      isNull(users.deactivatedAt),
    ];

    if (cursorValue) {
      conditions.push(
        or(
          lt(posts.createdAt, cursorValue.createdAt),
          and(
            eq(posts.createdAt, cursorValue.createdAt),
            lt(posts.id, cursorValue.id),
          ),
        )!,
      );
    }

    const rows = await this.db
      .select({
        id: posts.id,
        kind: posts.kind,
        text: posts.text,
        createdAt: posts.createdAt,
        replyToId: posts.replyToId,
        repostOfId: posts.repostOfId,
        authorId: users.id,
        handle: users.handle,
        displayName: users.displayName,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(and(...conditions))
      .orderBy(desc(posts.createdAt), desc(posts.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const pageRows = rows.slice(0, limit);

    const items = await this.hydratePosts(pageRows, viewerId);

    const lastRow = pageRows[pageRows.length - 1];

    return {
      items,
      hasMore,
      nextCursor:
        hasMore && lastRow
          ? this.encodeCursor(lastRow.createdAt, lastRow.id)
          : null,
    };
  }

  async listProfileMedia(
    userId: string,
    cursor: string | null,
    limit: number,
  ): Promise<PaginatedResult<MediaRecord>> {
    await this.waitIfConfigured();
    this.checkReadFailure();

    let cursorValue: {
      createdAt: Date;
      id: string;
    } | null = null;

    if (cursor) {
      cursorValue = this.decodeCursor(cursor);
    }

    const conditions = [
      eq(posts.authorId, userId),
      eq(posts.kind, 'original'),
      isNull(users.deactivatedAt),
    ];

    if (cursorValue) {
      conditions.push(
        or(
          lt(posts.createdAt, cursorValue.createdAt),
          and(
            eq(posts.createdAt, cursorValue.createdAt),
            lt(postMedia.id, cursorValue.id),
          ),
        )!,
      );
    }

    const rows = await this.db
      .select({
        id: postMedia.id,
        altText: postMedia.altText,
        width: postMedia.width,
        height: postMedia.height,
        position: postMedia.position,
        smallUrl: postMedia.smallUrl,
        largeUrl: postMedia.largeUrl,
        createdAt: posts.createdAt,
      })
      .from(postMedia)
      .innerJoin(posts, eq(postMedia.postId, posts.id))
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(and(...conditions))
      .orderBy(desc(posts.createdAt), desc(postMedia.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const pageRows = rows.slice(0, limit);

    const items: MediaRecord[] = pageRows.map((row: any) => ({
      id: row.id,
      altText: row.altText,
      width: row.width,
      height: row.height,
      position: row.position,
      smallUrl: row.smallUrl,
      largeUrl: row.largeUrl,
    }));

    const lastRow = pageRows[pageRows.length - 1];

    return {
      items,
      hasMore,
      nextCursor:
        hasMore && lastRow
          ? this.encodeCursor(lastRow.createdAt, lastRow.id)
          : null,
    };
  }

  async searchOriginals(
    query: string,
    cursor: string | null,
    limit: number,
    viewerId: string | null,
  ): Promise<PaginatedResult<PostRecord>> {
    await this.waitIfConfigured();
    this.checkReadFailure();

    const safeQuery = query
      .slice(0, 200)
      .replace(/[\\%_]/g, (value) => `\\${value}`);

    let cursorValue: {
      createdAt: Date;
      id: string;
    } | null = null;

    if (cursor) {
      cursorValue = this.decodeCursor(cursor);
    }

    const conditions = [
      eq(posts.kind, 'original'),
      isNull(users.deactivatedAt),
      sql`${posts.text} ILIKE ${`%${safeQuery}%`} ESCAPE '\\'`,
    ];

    if (cursorValue) {
      conditions.push(
        or(
          lt(posts.createdAt, cursorValue.createdAt),
          and(
            eq(posts.createdAt, cursorValue.createdAt),
            lt(posts.id, cursorValue.id),
          ),
        )!,
      );
    }

    const rows = await this.db
      .select({
        id: posts.id,
        kind: posts.kind,
        text: posts.text,
        createdAt: posts.createdAt,
        replyToId: posts.replyToId,
        repostOfId: posts.repostOfId,
        authorId: users.id,
        handle: users.handle,
        displayName: users.displayName,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(and(...conditions))
      .orderBy(desc(posts.createdAt), desc(posts.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const pageRows = rows.slice(0, limit);

    const items = await this.hydratePosts(pageRows, viewerId);

    const lastRow = pageRows[pageRows.length - 1];

    return {
      items,
      hasMore,
      nextCursor:
        hasMore && lastRow
          ? this.encodeCursor(lastRow.createdAt, lastRow.id)
          : null,
    };
  }

  async createPost(command: CreatePostCommand): Promise<PostRecord> {
    const { authorId, kind, text, replyToId, repostOfId } = command;

    return this.db.transaction(async (tx: any) => {
      if (kind === 'reply') {
        if (!replyToId) {
          throw new InvalidTargetError('replyToId is required for reply');
        }

        const parent = await tx
          .select({
            id: posts.id,
            kind: posts.kind,
          })
          .from(posts)
          .where(eq(posts.id, replyToId))
          .limit(1);

        if (parent.length === 0) {
          throw new NotFoundDomainError('Reply target does not exist');
        }

        if (parent[0].kind === 'repost') {
          throw new InvalidTargetError('Cannot reply to a repost');
        }
      }

      if (kind === 'repost') {
        if (!repostOfId) {
          throw new InvalidTargetError('repostOfId is required for repost');
        }

        const target = await tx
          .select({
            id: posts.id,
            kind: posts.kind,
          })
          .from(posts)
          .where(eq(posts.id, repostOfId))
          .limit(1);

        if (target.length === 0) {
          throw new NotFoundDomainError('Repost target does not exist');
        }

        if (target[0].kind !== 'original') {
          throw new InvalidTargetError('Can only repost an original post');
        }
      }

      const postId = randomUUID();

      try {
        await tx.insert(posts).values({
          id: postId,
          authorId,
          kind,
          text: kind === 'repost' ? null : (text?.trim() ?? null),
          replyToId: kind === 'reply' ? (replyToId ?? null) : null,
          repostOfId: kind === 'repost' ? (repostOfId ?? null) : null,
        });
      } catch (error: any) {
        if (error?.code === '23505' || error?.cause?.code === '23505') {
          throw new ConflictDomainError('Duplicate repost is not allowed');
        }
        throw error;
      }

      const result = await this.getPostById(postId, authorId, tx);

      if (!result) {
        throw new NotFoundDomainError('Created post could not be loaded');
      }

      return result;
    });
  }

  async setLike(
    postId: string,
    viewerId: string,
    desiredState: boolean,
  ): Promise<{
    likedByViewer: boolean;
    likeCount: number;
  }> {
    const post = await this.db
      .select({
        id: posts.id,
      })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    if (post.length === 0) {
      throw new NotFoundDomainError('Post does not exist');
    }

    if (desiredState) {
      await this.db
        .insert(likes)
        .values({
          userId: viewerId,
          postId,
        })
        .onConflictDoNothing({
          target: [likes.userId, likes.postId],
        });
    } else {
      await this.db
        .delete(likes)
        .where(and(eq(likes.userId, viewerId), eq(likes.postId, postId)));
    }

    const [result] = await this.db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(likes)
      .where(eq(likes.postId, postId));

    return {
      likedByViewer: desiredState,
      likeCount: Number(result.count),
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

    if (followerId === followingId) {
      throw new InvalidTargetError('A user cannot follow themselves');
    }

    const [follower] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, followerId), isNull(users.deactivatedAt)))
      .limit(1);

    if (!follower) {
      throw new NotFoundDomainError('Follower account not found');
    }

    const [target] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, followingId), isNull(users.deactivatedAt)))
      .limit(1);

    if (!target) {
      throw new NotFoundDomainError('Target account not found');
    }

    if (desiredState) {
      await this.db
        .insert(follows)
        .values({ followerId, followingId })
        .onConflictDoNothing({
          target: [follows.followerId, follows.followingId],
        });
    } else {
      await this.db
        .delete(follows)
        .where(
          and(
            eq(follows.followerId, followerId),
            eq(follows.followingId, followingId),
          ),
        );
    }

    const [state] = await this.db
      .select({ id: follows.followerId })
      .from(follows)
      .where(
        and(
          eq(follows.followerId, followerId),
          eq(follows.followingId, followingId),
        ),
      )
      .limit(1);

    const [followerCountRow] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(follows)
      .innerJoin(users, eq(follows.followerId, users.id))
      .where(
        and(eq(follows.followingId, followingId), isNull(users.deactivatedAt)),
      );

    const [followingCountRow] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(follows)
      .innerJoin(users, eq(follows.followingId, users.id))
      .where(
        and(eq(follows.followerId, followerId), isNull(users.deactivatedAt)),
      );

    return {
      following: Boolean(state),
      followerCount: followerCountRow?.count ?? 0,
      followingCount: followingCountRow?.count ?? 0,
    };
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    this.checkReadFailure();
    await this.waitIfConfigured();

    const [row] = await this.db
      .select({ id: follows.followerId })
      .from(follows)
      .innerJoin(users, eq(follows.followingId, users.id))
      .where(
        and(
          eq(follows.followerId, followerId),
          eq(follows.followingId, followingId),
          isNull(users.deactivatedAt),
        ),
      )
      .limit(1);

    return Boolean(row);
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

    const [target] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deactivatedAt)))
      .limit(1);

    if (!target) {
      throw new NotFoundDomainError('Account not found');
    }

    const cursorValue = cursor ? validateCursor(cursor) : null;
    const personId =
      direction === 'followers' ? follows.followerId : follows.followingId;

    const conditions = [
      direction === 'followers'
        ? eq(follows.followingId, userId)
        : eq(follows.followerId, userId),
      isNull(users.deactivatedAt),
    ];

    if (cursorValue) {
      const cursorDate = new Date(cursorValue.createdAt);

      conditions.push(
        or(
          lt(follows.createdAt, cursorDate),
          and(eq(follows.createdAt, cursorDate), lt(personId, cursorValue.id)),
        )!,
      );
    }

    const rows = await this.db
      .select({
        id: users.id,
        handle: users.handle,
        displayName: users.displayName,
        bio: users.bio,
        smallUrl: users.avatarSmallUrl,
        largeUrl: users.avatarLargeUrl,
        followedAt: follows.createdAt,
      })
      .from(follows)
      .innerJoin(
        users,
        eq(
          users.id,
          direction === 'followers' ? follows.followerId : follows.followingId,
        ),
      )
      .where(and(...conditions))
      .orderBy(desc(follows.createdAt), desc(personId))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const pageRows = rows.slice(0, limit);
    const lastRow = pageRows[pageRows.length - 1];

    return {
      items: pageRows.map((row: any) => ({
        id: row.id,
        handle: row.handle,
        displayName: row.displayName,
        bio: row.bio,
        avatar: {
          smallUrl: row.smallUrl,
          largeUrl: row.largeUrl,
        },
        followedAt: row.followedAt.toISOString(),
      })),
      hasMore,
      nextCursor:
        hasMore && lastRow
          ? this.encodeCursor(lastRow.followedAt, lastRow.id)
          : null,
    };
  }

  async getUserById(id: string): Promise<UserRecord | null> {
    const userResult = await this.db
      .select({
        id: users.id,
        handle: users.handle,
        displayName: users.displayName,
        bio: users.bio,
        avatarSmallUrl: users.avatarSmallUrl,
        avatarLargeUrl: users.avatarLargeUrl,
      })
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deactivatedAt)))
      .limit(1);

    if (userResult.length === 0) {
      return null;
    }

    const user = userResult[0];

    const [postCountResult] = await this.db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(posts)
      .where(and(eq(posts.authorId, id), eq(posts.kind, 'original')));

    const [followerCountResult] = await this.db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(follows)
      .innerJoin(users, eq(follows.followerId, users.id))
      .where(and(eq(follows.followingId, id), isNull(users.deactivatedAt)));

    const [followingCountResult] = await this.db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(follows)
      .innerJoin(users, eq(follows.followingId, users.id))
      .where(and(eq(follows.followerId, id), isNull(users.deactivatedAt)));

    return {
      id: user.id,
      handle: user.handle,
      displayName: user.displayName,
      bio: user.bio,
      avatar: {
        smallUrl:
          user.avatarSmallUrl ?? this.getUserAvatar(user.handle).smallUrl,
        largeUrl:
          user.avatarLargeUrl ?? this.getUserAvatar(user.handle).largeUrl,
      },
      postCount: Number(postCountResult?.count ?? 0),
      followerCount: Number(followerCountResult?.count ?? 0),
      followingCount: Number(followingCountResult?.count ?? 0),
    };
  }
  async updateProfile(
    command: UpdateProfileCommand,
  ): Promise<UserRecord | null> {
    const updateValues: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (command.displayName !== undefined) {
      updateValues.displayName = command.displayName;
    }

    if (command.bio !== undefined) {
      updateValues.bio = command.bio;
    }

    if (command.avatarSmallUrl !== undefined) {
      updateValues.avatarSmallUrl = command.avatarSmallUrl;
    }

    if (command.avatarLargeUrl !== undefined) {
      updateValues.avatarLargeUrl = command.avatarLargeUrl;
    }

    const [updatedUser] = await this.db
      .update(users)
      .set(updateValues)
      .where(and(eq(users.id, command.userId), isNull(users.deactivatedAt)))
      .returning({
        id: users.id,
      });

    if (!updatedUser) {
      return null;
    }

    return this.getUserById(command.userId);
  }
  private getUserAvatar(handle: string) {
    const cleanHandle = handle.toLowerCase().replace(/^@/, '').trim();
    return {
      smallUrl: `/fixtures/${cleanHandle}-48.jpg`,
      largeUrl: `/fixtures/${cleanHandle}-96.jpg`,
    };
  }
}
