import { jest } from '@jest/globals';
import { FeedService } from './feed.service';
import type {
  PaginatedResult,
  PostRecord,
  SocialFeedRepository,
} from '../data/repository/social-feed.repository';

import type { UpdatePostCommand } from '../data/repository/social-feed.repository';
import {
  ConflictDomainError,
  NotFoundDomainError,
} from '../common/errors/domain-errors';
import { ForbiddenException } from '@nestjs/common';

describe('FeedService', () => {
  it('uses the repository to get the feed and maps to DTO', async () => {
    const fakeRecord: PostRecord = {
      id: '11111111-1111-4111-8111-000000000001',
      kind: 'original',
      text: 'Sample post',
      createdAt: '2026-09-10T10:00:00.000Z',
      version: 1,
      isEdited: false,
      editedAt: null,
      author: {
        id: 'user-1',
        handle: 'alice',
        displayName: 'Alice',
        avatar: {
          smallUrl: '/fixtures/alice-48.jpg',
          largeUrl: '/fixtures/alice-96.jpg',
        },
      },
      media: [],
      likeCount: 1,
      replyCount: 0,
      likedByViewer: false,
      replyToId: null,
      repostOfId: null,
    };

    const fakeResult: PaginatedResult<PostRecord> = {
      items: [fakeRecord],
      nextCursor: 'fake-next-cursor',
      hasMore: true,
    };

    const listOriginalFeed = jest
      .fn<SocialFeedRepository['listOriginalFeed']>()
      .mockResolvedValue(fakeResult);

    const fakeRepository = {
      listOriginalFeed,
    } as unknown as SocialFeedRepository;

    const service = new FeedService(fakeRepository);

    const result = await service.getFeed(null, 10);

    expect(listOriginalFeed).toHaveBeenCalledWith(null, 10, null);

    expect(result).toEqual({
      items: [
        {
          id: '11111111-1111-4111-8111-000000000001',
          kind: 'original',
          text: 'Sample post',
          createdAt: '2026-09-10T10:00:00.000Z',
          author: {
            id: 'user-1',
            handle: 'alice',
            displayName: 'Alice',
            avatar: {
              smallUrl: '/fixtures/alice-48.jpg',
              largeUrl: '/fixtures/alice-96.jpg',
            },
          },
          media: [],
          likeCount: 1,
          replyCount: 0,
          likedByViewer: false,
        },
      ],
      nextCursor: 'fake-next-cursor',
      hasMore: true,
    });

    // Ensure persistence fields are not in the DTO
    expect((result.items[0] as any).replyToId).toBeUndefined();
    expect((result.items[0] as any).repostOfId).toBeUndefined();
  });
  it('gets the personalized home feed for the viewer', async () => {
    const fakeRecord: PostRecord = {
      id: '11111111-1111-4111-8111-000000000001',
      kind: 'original',
      text: 'Home feed post',
      createdAt: '2026-09-10T10:00:00.000Z',
      version: 1,
      isEdited: false,
      editedAt: null,
      author: {
        id: 'user-1',
        handle: 'alice',
        displayName: 'Alice',
        avatar: {
          smallUrl: '/fixtures/alice-48.jpg',
          largeUrl: '/fixtures/alice-96.jpg',
        },
      },
      media: [],
      likeCount: 2,
      replyCount: 1,
      likedByViewer: true,
      replyToId: null,
      repostOfId: null,
    };

    const fakeResult: PaginatedResult<PostRecord> = {
      items: [fakeRecord],
      nextCursor: 'home-next-cursor',
      hasMore: true,
    };

    const listHomeFeed = jest
      .fn<SocialFeedRepository['listHomeFeed']>()
      .mockResolvedValue(fakeResult);

    const fakeRepository = {
      listHomeFeed,
    } as unknown as SocialFeedRepository;

    const service = new FeedService(fakeRepository);
    const viewerId = 'viewer-123';

    const result = await service.getHomeFeed(null, 10, viewerId);

    expect(listHomeFeed).toHaveBeenCalledWith(null, 10, viewerId);

    expect(result).toEqual({
      items: [
        {
          id: fakeRecord.id,
          kind: 'original',
          text: 'Home feed post',
          createdAt: fakeRecord.createdAt,
          author: fakeRecord.author,
          media: [],
          likeCount: 2,
          replyCount: 1,
          likedByViewer: true,
        },
      ],
      nextCursor: 'home-next-cursor',
      hasMore: true,
    });
  });

  it('updates a post successfully', async () => {
    const post = {
      id: 'post-1',
      text: 'Updated text',
      version: 2,
      isEdited: true,
      editedAt: '2026-10-24T10:00:00.000Z',
    } as PostRecord;

    const updatePost = jest
      .fn<SocialFeedRepository['updatePost']>()
      .mockResolvedValue({ status: 'updated', post });

    const service = new FeedService({
      updatePost,
    } as unknown as SocialFeedRepository);

    const command: UpdatePostCommand = {
      postId: 'post-1',
      authorId: 'user-1',
      text: 'Updated text',
      expectedVersion: 1,
    };

    await expect(service.updatePost(command)).resolves.toEqual(post);
    expect(updatePost).toHaveBeenCalledWith(command);
  });

  it('rejects stale post versions with a conflict', async () => {
    const updatePost = jest
      .fn<SocialFeedRepository['updatePost']>()
      .mockResolvedValue({ status: 'conflict' });

    const service = new FeedService({
      updatePost,
    } as unknown as SocialFeedRepository);

    await expect(
      service.updatePost({
        postId: 'post-1',
        authorId: 'user-1',
        text: 'Updated text',
        expectedVersion: 1,
      }),
    ).rejects.toThrow(ConflictDomainError);
  });

  it('rejects edits by users who do not own the post', async () => {
    const updatePost = jest
      .fn<SocialFeedRepository['updatePost']>()
      .mockResolvedValue({ status: 'forbidden' });

    const service = new FeedService({
      updatePost,
    } as unknown as SocialFeedRepository);

    await expect(
      service.updatePost({
        postId: 'post-1',
        authorId: 'user-2',
        text: 'Updated text',
        expectedVersion: 1,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects edits outside the edit window', async () => {
    const updatePost = jest
      .fn<SocialFeedRepository['updatePost']>()
      .mockResolvedValue({ status: 'edit_window_expired' });

    const service = new FeedService({
      updatePost,
    } as unknown as SocialFeedRepository);

    await expect(
      service.updatePost({
        postId: 'post-1',
        authorId: 'user-1',
        text: 'Updated text',
        expectedVersion: 1,
      }),
    ).rejects.toThrow(ConflictDomainError);
  });

  it('deletes a post successfully', async () => {
    const deletePost = jest
      .fn<SocialFeedRepository['deletePost']>()
      .mockResolvedValue({ status: 'deleted' });

    const service = new FeedService({
      deletePost,
    } as unknown as SocialFeedRepository);

    await expect(
      service.deletePost('post-1', 'user-1'),
    ).resolves.toBeUndefined();

    expect(deletePost).toHaveBeenCalledWith({
      postId: 'post-1',
      authorId: 'user-1',
    });
  });

  it('rejects deletion by users who do not own the post', async () => {
    const deletePost = jest
      .fn<SocialFeedRepository['deletePost']>()
      .mockResolvedValue({ status: 'forbidden' });

    const service = new FeedService({
      deletePost,
    } as unknown as SocialFeedRepository);

    await expect(service.deletePost('post-1', 'user-2')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('returns not found when deleting a nonexistent post', async () => {
    const deletePost = jest
      .fn<SocialFeedRepository['deletePost']>()
      .mockResolvedValue({ status: 'not_found' });

    const service = new FeedService({
      deletePost,
    } as unknown as SocialFeedRepository);

    await expect(service.deletePost('missing-post', 'user-1')).rejects.toThrow(
      NotFoundDomainError,
    );
  });
});
