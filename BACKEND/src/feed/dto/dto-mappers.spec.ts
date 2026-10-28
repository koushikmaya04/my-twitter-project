import {
  mapPostToDto,
  mapPostAuthorToDto,
  mapMediaToDto,
  mapUserToDto,
  mapPaginatedPosts,
  mapLikeToDto,
} from './dto-mappers';

import type {
  PostRecord,
  UserRecord,
  PaginatedResult,
} from '../../data/repository/social-feed.repository';

describe('DTO Mappers (D04 — Response DTO Safety)', () => {
  const samplePostRecord: PostRecord & {
    internalDbField?: string;
    hiddenFlag?: boolean;
  } = {
    id: '11111111-1111-4111-8111-000000000001',
    kind: 'original',
    text: 'Hello world test post',
    createdAt: '2026-09-10T10:00:00.000Z',
    version: 1,
    isEdited: false,
    editedAt: null,
    author: {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      handle: 'testuser',
      displayName: 'Test User',
      avatar: {
        smallUrl: '/fixtures/avatar-48.jpg',
        largeUrl: '/fixtures/avatar-96.jpg',
      },
    },
    media: [
      {
        id: '44444444-4444-4444-8444-000000000001',
        altText: 'Desk photo',
        width: 1200,
        height: 800,
        position: 0,
        smallUrl: '/fixtures/desk-480.jpg',
        largeUrl: '/fixtures/desk-1200.jpg',
      },
    ],
    likeCount: 5,
    replyCount: 2,
    likedByViewer: true,
    replyToId: null,
    repostOfId: null,
    internalDbField: 'secret_internal_data',
    hiddenFlag: true,
  };

  it('maps PostRecord to FeedPostDto with only public API fields', () => {
    const dto = mapPostToDto(samplePostRecord);

    expect(dto).toEqual({
      id: '11111111-1111-4111-8111-000000000001',
      kind: 'original',
      text: 'Hello world test post',
      createdAt: '2026-09-10T10:00:00.000Z',
      author: {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        handle: 'testuser',
        displayName: 'Test User',
        avatar: {
          smallUrl: '/fixtures/avatar-48.jpg',
          largeUrl: '/fixtures/avatar-96.jpg',
        },
      },
      media: [
        {
          id: '44444444-4444-4444-8444-000000000001',
          altText: 'Desk photo',
          width: 1200,
          height: 800,
          position: 0,
          smallUrl: '/fixtures/desk-480.jpg',
          largeUrl: '/fixtures/desk-1200.jpg',
        },
      ],
      likeCount: 5,
      replyCount: 2,
      likedByViewer: true,
    });

    // Verify internal/persistence fields are NOT present
    expect((dto as any).replyToId).toBeUndefined();
    expect((dto as any).repostOfId).toBeUndefined();
    expect((dto as any).internalDbField).toBeUndefined();
    expect((dto as any).hiddenFlag).toBeUndefined();
  });

  it('maps nested author cleanly without internal DB columns', () => {
    const authorWithInternals = {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      handle: 'testuser',
      displayName: 'Test User',
      passwordHash: '$2b$10$xyz',
      email: 'secret@example.com',
      avatar: {
        smallUrl: '/fixtures/avatar-48.jpg',
        largeUrl: '/fixtures/avatar-96.jpg',
      },
    };

    const authorDto = mapPostAuthorToDto(authorWithInternals as any);

    expect(authorDto).toEqual({
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      handle: 'testuser',
      displayName: 'Test User',
      avatar: {
        smallUrl: '/fixtures/avatar-48.jpg',
        largeUrl: '/fixtures/avatar-96.jpg',
      },
    });

    expect((authorDto as any).passwordHash).toBeUndefined();
    expect((authorDto as any).email).toBeUndefined();
  });

  it('maps nested media without persistence columns like postId', () => {
    const mediaWithPostId = {
      id: '44444444-4444-4444-8444-000000000001',
      postId: '11111111-1111-4111-8111-000000000001',
      altText: 'Desk photo',
      width: 1200,
      height: 800,
      position: 0,
      smallUrl: '/fixtures/desk-480.jpg',
      largeUrl: '/fixtures/desk-1200.jpg',
      storageBucket: 'internal-s3-bucket',
    };

    const mediaDto = mapMediaToDto(mediaWithPostId as any);

    expect(mediaDto).toEqual({
      id: '44444444-4444-4444-8444-000000000001',
      altText: 'Desk photo',
      width: 1200,
      height: 800,
      position: 0,
      smallUrl: '/fixtures/desk-480.jpg',
      largeUrl: '/fixtures/desk-1200.jpg',
    });

    expect((mediaDto as any).postId).toBeUndefined();
    expect((mediaDto as any).storageBucket).toBeUndefined();
  });

  it('maps UserRecord to UserProfileDto with only public profile fields', () => {
    const userRecord: UserRecord & { passwordHash?: string; role?: string } = {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      handle: 'testuser',
      displayName: 'Test User',
      bio: 'Developer and creator',
      avatar: {
        smallUrl: '/fixtures/avatar-48.jpg',
        largeUrl: '/fixtures/avatar-96.jpg',
      },
      postCount: 42,
      followerCount: 100,
      followingCount: 50,
      passwordHash: '$2b$10$hashed_password',
      role: 'admin',
    };

    const userDto = mapUserToDto(userRecord);

    expect(userDto).toEqual({
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      handle: 'testuser',
      displayName: 'Test User',
      bio: 'Developer and creator',
      avatar: {
        smallUrl: '/fixtures/avatar-48.jpg',
        largeUrl: '/fixtures/avatar-96.jpg',
      },
      postCount: 42,
      followerCount: 100,
      followingCount: 50,
    });

    expect((userDto as any).passwordHash).toBeUndefined();
    expect((userDto as any).role).toBeUndefined();
  });

  it('maps paginated posts to PaginatedResponseDto<FeedPostDto>', () => {
    const paginated: PaginatedResult<PostRecord> = {
      items: [samplePostRecord],
      nextCursor: 'cursor_abc123',
      hasMore: true,
    };

    const responseDto = mapPaginatedPosts(paginated);

    expect(responseDto.hasMore).toBe(true);
    expect(responseDto.nextCursor).toBe('cursor_abc123');
    expect(responseDto.items).toHaveLength(1);
    expect(responseDto.items[0].id).toBe(
      '11111111-1111-4111-8111-000000000001',
    );
    expect((responseDto.items[0] as any).replyToId).toBeUndefined();
  });

  it('maps like result to LikeResponseDto', () => {
    const likeResult = {
      likedByViewer: true,
      likeCount: 42,
      internalTxId: 'tx_999',
    };

    const dto = mapLikeToDto(likeResult as any);

    expect(dto).toEqual({
      likedByViewer: true,
      likeCount: 42,
    });
    expect((dto as any).internalTxId).toBeUndefined();
  });
});
