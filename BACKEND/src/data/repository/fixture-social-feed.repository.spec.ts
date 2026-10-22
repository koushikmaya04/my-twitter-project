import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { FixtureSocialFeedRepository } from './fixture-social-feed.repository';
import {
  SOCIAL_FEED_READ_FAILURE,
  type SocialFeedReadFailure,
} from './social-feed-read-failure.token';
import { follows, users, originalPosts } from '../fixtures/fixture-data';

describe('FixtureSocialFeedRepository — follows', () => {
  let repository: FixtureSocialFeedRepository;

  const configService = {
    getOrThrow: jest.fn().mockReturnValue(0),
  } as unknown as ConfigService;

  const readFailure: SocialFeedReadFailure = () => false;

  const ashaId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const rahulId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const meeraId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

  beforeEach(() => {
    repository = new FixtureSocialFeedRepository(configService, readFailure);
  });

  it('follows a user and reports accurate counts', async () => {
    const result = await repository.setFollow(ashaId, meeraId, true);

    expect(result.following).toBe(true);
    expect(await repository.isFollowing(ashaId, meeraId)).toBe(true);
    expect(result.followingCount).toBeGreaterThan(0);
    expect(result.followerCount).toBeGreaterThan(0);
  });

  it('does not create duplicate relationships when following twice', async () => {
    await repository.setFollow(ashaId, meeraId, true);
    const countBefore = follows.filter(
      (follow) =>
        follow.followerId === ashaId && follow.followingId === meeraId,
    ).length;

    await repository.setFollow(ashaId, meeraId, true);

    const countAfter = follows.filter(
      (follow) =>
        follow.followerId === ashaId && follow.followingId === meeraId,
    ).length;

    expect(countBefore).toBe(1);
    expect(countAfter).toBe(1);
  });

  it('unfollows a user and is safe to repeat', async () => {
    await repository.setFollow(ashaId, meeraId, true);

    const result = await repository.setFollow(ashaId, meeraId, false);
    expect(result.following).toBe(false);
    expect(await repository.isFollowing(ashaId, meeraId)).toBe(false);

    const repeated = await repository.setFollow(ashaId, meeraId, false);
    expect(repeated.following).toBe(false);
  });

  it('returns paginated followers without duplicate users', async () => {
    const firstPage = await repository.listFollowers(ashaId, null, 1);

    expect(firstPage.items).toHaveLength(1);
    expect(firstPage.hasMore).toBe(true);
    expect(firstPage.nextCursor).not.toBeNull();

    const secondPage = await repository.listFollowers(
      ashaId,
      firstPage.nextCursor,
      1,
    );

    const firstIds = firstPage.items.map((item) => item.id);
    const secondIds = secondPage.items.map((item) => item.id);

    expect(firstIds.some((id) => secondIds.includes(id))).toBe(false);
  });

  it('returns an empty page for an unknown user', async () => {
    const result = await repository.listFollowers(
      '99999999-9999-4999-8999-999999999999',
      null,
      10,
    );

    expect(result).toEqual({
      items: [],
      nextCursor: null,
      hasMore: false,
    });
  });

  it('rejects self-follow attempts', async () => {
    await expect(repository.setFollow(ashaId, ashaId, true)).rejects.toThrow(
      'A user cannot follow themselves',
    );
  });

  it('excludes posts from deactivated authors in the home feed', async () => {
    const viewerId = ashaId;
    const followedAuthorId = rahulId;

    // Find a post from a followed author so we can verify it remains visible.
    const followedPost = originalPosts.find(
      (post) => post.authorId === followedAuthorId,
    );

    // Find a different author with at least one original post.
    const deactivatedAuthor = users.find(
      (user) =>
        user.id !== viewerId &&
        user.id !== followedAuthorId &&
        originalPosts.some((post) => post.authorId === user.id),
    );

    expect(followedPost).toBeDefined();
    expect(deactivatedAuthor).toBeDefined();

    if (!followedPost || !deactivatedAuthor) {
      throw new Error('Required home-feed test fixtures are missing');
    }

    const previousDeactivatedAt = deactivatedAuthor.deactivatedAt;

    try {
      deactivatedAuthor.deactivatedAt = new Date().toISOString();

      const result = await repository.listHomeFeed(null, 50, viewerId);
      const returnedAuthorIds = result.items.map((post) => post.author.id);
      // Posts by the deactivated author must be excluded.
      expect(returnedAuthorIds).not.toContain(deactivatedAuthor.id);

      // Posts from a followed, active author must remain eligible.
      expect(returnedAuthorIds).toContain(followedAuthorId);
    } finally {
      // Restore shared fixture data even if an assertion fails.
      deactivatedAuthor.deactivatedAt = previousDeactivatedAt;
    }
  });
});
