
import { jest } from '@jest/globals';
import { FeedService } from './feed.service';
import type {
  PaginatedResult,
  PostRecord,
  SocialFeedRepository,
} from '../data/repository/social-feed.repository';

describe('FeedService', () => {
  it('uses the repository to get the feed and maps to DTO', async () => {
    const fakeRecord: PostRecord = {
      id: '11111111-1111-4111-8111-000000000001',
      kind: 'original',
      text: 'Sample post',
      createdAt: '2026-09-10T10:00:00.000Z',
      author: {
        id: 'user-1',
        handle: 'alice',
        displayName: 'Alice',
        avatar: { smallUrl: '/fixtures/alice-48.jpg', largeUrl: '/fixtures/alice-96.jpg' },
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

    const service = new FeedService(
      fakeRepository,
    );

    const result = await service.getFeed(null, 10);

   expect(listOriginalFeed).toHaveBeenCalledWith(
  null,
  10,
  null,
);

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
            avatar: { smallUrl: '/fixtures/alice-48.jpg', largeUrl: '/fixtures/alice-96.jpg' },
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
});