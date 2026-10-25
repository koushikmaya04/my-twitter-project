import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import {
  FixtureSocialFeedRepository,
  resetFixtureDeletedPosts,
} from './fixture-social-feed.repository';
import {
  SOCIAL_FEED_READ_FAILURE,
  type SocialFeedReadFailure,
} from './social-feed-read-failure.token';
import { follows, users, originalPosts, posts } from '../fixtures/fixture-data';

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
    resetFixtureDeletedPosts();
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

  it('excludes deleted posts from the home feed', async () => {
    const post = originalPosts.find((item) => item.authorId === ashaId);

    expect(post).toBeDefined();

    if (!post) {
      throw new Error('Required post fixture is missing');
    }

    // Make sure the viewer can see this author's posts.
    const previousCreatedAt = post.createdAt;

    try {
      await repository.deletePost({
        postId: post.id,
        authorId: ashaId,
      });

      const result = await repository.listHomeFeed(null, 50, ashaId);

      expect(result.items.some((item) => item.id === post.id)).toBe(false);
    } finally {
      post.createdAt = previousCreatedAt;
    }
  });

  it('edits an owned post and increments its version', async () => {
    const post = originalPosts.find((item) => item.authorId === ashaId);

    expect(post).toBeDefined();

    if (!post) {
      throw new Error('Required post fixture is missing');
    }

    const previousText = post.text;
    const previousCreatedAt = post.createdAt;

    try {
      // Make sure the post is within the 30-minute edit window.
      post.createdAt = new Date().toISOString();

      const result = await repository.updatePost({
        postId: post.id,
        authorId: ashaId,
        text: 'Updated post text',
        expectedVersion: 1,
      });

      expect(result.status).toBe('updated');

      if (result.status === 'updated') {
        expect(result.post.text).toBe('Updated post text');
        expect(result.post.version).toBe(2);
        expect(result.post.isEdited).toBe(true);
        expect(result.post.editedAt).not.toBeNull();
      }
    } finally {
      // Restore shared fixture data after the test.
      post.text = previousText;
      post.createdAt = previousCreatedAt;
    }
  });
  it("does not allow a user to edit another user's post", async () => {
    const post = originalPosts.find((item) => item.authorId === rahulId);

    expect(post).toBeDefined();

    if (!post) {
      throw new Error('Required post fixture is missing');
    }

    const previousText = post.text;

    try {
      const result = await repository.updatePost({
        postId: post.id,
        authorId: ashaId,
        text: 'Unauthorized edit',
        expectedVersion: 1,
      });

      expect(result.status).toBe('forbidden');
      expect(post.text).toBe(previousText);
    } finally {
      post.text = previousText;
    }
  });
  it('rejects an edit using a stale version', async () => {
    const post = originalPosts.find((item) => item.authorId === meeraId);

    expect(post).toBeDefined();

    if (!post) {
      throw new Error('Required post fixture is missing');
    }

    const previousText = post.text;
    const previousCreatedAt = post.createdAt;

    try {
      post.createdAt = new Date().toISOString();

      const firstEdit = await repository.updatePost({
        postId: post.id,
        authorId: meeraId,
        text: 'First edit',
        expectedVersion: 1,
      });

      expect(firstEdit.status).toBe('updated');

      const staleEdit = await repository.updatePost({
        postId: post.id,
        authorId: meeraId,
        text: 'Stale edit',
        expectedVersion: 1,
      });

      expect(staleEdit.status).toBe('conflict');
      expect(post.text).toBe('First edit');
    } finally {
      post.text = previousText;
      post.createdAt = previousCreatedAt;
    }
  });
  it('rejects editing a post after the 30-minute window', async () => {
    const post = originalPosts.find((item) => item.authorId === ashaId);

    expect(post).toBeDefined();

    if (!post) {
      throw new Error('Required post fixture is missing');
    }

    const previousText = post.text;
    const previousCreatedAt = post.createdAt;

    try {
      // Set the post creation time to 31 minutes ago.
      post.createdAt = new Date(Date.now() - 31 * 60 * 1000).toISOString();

      const result = await repository.updatePost({
        postId: post.id,
        authorId: ashaId,
        text: 'This edit should be rejected',
        expectedVersion: 1,
      });

      expect(result.status).toBe('edit_window_expired');
      expect(post.text).toBe(previousText);
    } finally {
      // Restore the shared fixture.
      post.text = previousText;
      post.createdAt = previousCreatedAt;
    }
  });
  it('does not allow editing a repost', async () => {
    const repost = posts.find((item) => item.kind === 'repost');

    expect(repost).toBeDefined();

    if (!repost) {
      throw new Error('Required repost fixture is missing');
    }

    const result = await repository.updatePost({
      postId: repost.id,
      authorId: repost.authorId,
      text: 'Attempted repost edit',
      expectedVersion: 1,
    });

    expect(result.status).toBe('not_editable');
  });

  it('allows the owner to delete their post', async () => {
    const post = originalPosts.find(
      (item) =>
        item.authorId === ashaId &&
        !posts.some((candidate) => candidate.id === item.id),
    );

    // Use a known fixture post; cleanup is handled after the test.
    const target =
      post ?? originalPosts.find((item) => item.authorId === ashaId);

    expect(target).toBeDefined();

    if (!target) {
      throw new Error('Required post fixture is missing');
    }

    try {
      const result = await repository.deletePost({
        postId: target.id,
        authorId: ashaId,
      });

      expect(result.status).toBe('deleted');
    } finally {
      // The fixture repository uses module-level deletion state.
      // We will verify its reset mechanism before relying on this test.
    }
  });

  it('does not allow another user to delete a post', async () => {
    const post = originalPosts.find((item) => item.authorId === rahulId);

    expect(post).toBeDefined();

    if (!post) {
      throw new Error('Required post fixture is missing');
    }

    const result = await repository.deletePost({
      postId: post.id,
      authorId: ashaId,
    });

    expect(result.status).toBe('forbidden');
  });

  it('allows the owner to delete the same post repeatedly', async () => {
    const post = originalPosts.find((item) => item.authorId === meeraId);

    expect(post).toBeDefined();

    if (!post) {
      throw new Error('Required post fixture is missing');
    }

    const first = await repository.deletePost({
      postId: post.id,
      authorId: meeraId,
    });

    const second = await repository.deletePost({
      postId: post.id,
      authorId: meeraId,
    });

    expect(first.status).toBe('deleted');
    expect(second.status).toBe('deleted');
  });
});
