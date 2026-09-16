import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

import { SOCIAL_FEED_READ_FAILURE } from './social-feed-read-failure.token';
import type { SocialFeedReadFailure } from './social-feed-read-failure.token';

import { ConfigService } from '@nestjs/config';
import {
  MediaRecord,
  PaginatedResult,
  PostRecord,
  SocialFeedRepository,
  UserRecord,
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

@Injectable()
export class FixtureSocialFeedRepository
  implements SocialFeedRepository
{
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
  async getFeed(
    cursor: string | null,
    limit: number,
  ): Promise<PaginatedResult<PostRecord>> {
    await this.waitIfConfigured();
      this.checkReadFailure();
    let filteredPosts = [...originalPosts];

    // Feed must be ordered newest first.
    filteredPosts.sort((a, b) => {
      const dateDifference =
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime();

      if (dateDifference !== 0) {
        return dateDifference;
      }

      return b.id.localeCompare(a.id);
    });

    // Apply cursor if one exists.
    if (cursor) {
      const decodedCursor = validateCursor(cursor);

      filteredPosts = filteredPosts.filter((post) => {
        const postTime = new Date(post.createdAt).getTime();
        const cursorTime = new Date(
          decodedCursor.createdAt,
        ).getTime();

        if (postTime < cursorTime) {
          return true;
        }

        if (
          postTime === cursorTime &&
          post.id < decodedCursor.id
        ) {
          return true;
        }

        return false;
      });
    }

    // Read limit + 1 so we can determine hasMore.
    const page = filteredPosts.slice(0, limit + 1);

    const hasMore = page.length > limit;

    const items = page
      .slice(0, limit)
      .map((post) => this.toPostRecord(post));

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

  async getPostById(
    id: string,
  ): Promise<PostRecord | null> {
      this.checkReadFailure();
    await this.waitIfConfigured();
    const post = posts.find((item) => item.id === id);

    if (!post) {
      return null;
    }

    return this.toPostRecord(post);
  }

  async getUserById(
    id: string,
  ): Promise<UserRecord | null> {
      this.checkReadFailure();
    await this.waitIfConfigured();
    const user = users.find((item) => item.id === id);

    if (!user) {
      return null;
    }

    return this.toUserRecord(user);
  }

  private toPostRecord(
    post: (typeof posts)[number],
  ): PostRecord {
    const author = users.find(
      (user) => user.id === post.authorId,
    );

    if (!author) {
      throw new Error(
        `Fixture author not found: ${post.authorId}`,
      );
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

    const likeCount = likes.filter(
      (like) => like.postId === post.id,
    ).length;

    const replyCount = posts.filter(
      (item) =>
        item.kind === 'reply' &&
        item.replyToId === post.id,
    ).length;

    // Stage A uses Asha as the deterministic fixture viewer.
 const demoUserId =
  this.configService.getOrThrow<string>('demoUserId');

const likedByViewer = likes.some(
  (like) =>
    like.postId === post.id &&
    like.userId === demoUserId,
);

    return {
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

  private toUserRecord(
    user: (typeof users)[number],
  ): UserRecord {
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

private encodeCursor(
  createdAt: string,
  id: string,
): string {
  const payload = JSON.stringify({
    v: 1,
    createdAt,
    id,
  });

  return Buffer.from(payload).toString('base64url');
}
}