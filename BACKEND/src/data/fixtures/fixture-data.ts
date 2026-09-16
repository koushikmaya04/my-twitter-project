export type UserFixture = {
  id: string;
  handle: string;
  displayName: string;
  bio: string | null;
  avatar: {
    smallUrl: string;
    largeUrl: string;
  };
};

export type PostFixture = {
  id: string;
  kind: 'original' | 'reply' | 'repost';
  text: string | null;
  createdAt: string;
  authorId: string;
  replyToId: string | null;
  repostOfId: string | null;
};

export type MediaFixture = {
  id: string;
  postId: string;
  altText: string;
  width: number;
  height: number;
  position: number;
  smallUrl: string;
  largeUrl: string;
};

export type LikeFixture = {
  userId: string;
  postId: string;
};

export type FollowFixture = {
  followerId: string;
  followingId: string;
};

/* =========================================================
   USERS
   ========================================================= */

export const users: UserFixture[] = [
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    handle: 'asha',
    displayName: 'Asha',
    bio: 'Building useful things.',
    avatar: {
      smallUrl: '/fixtures/asha-48.jpg',
      largeUrl: '/fixtures/asha-96.jpg',
    },
  },
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    handle: 'rahul',
    displayName: 'Rahul',
    bio: 'Frontend developer.',
    avatar: {
      smallUrl: '/fixtures/rahul-48.jpg',
      largeUrl: '/fixtures/rahul-96.jpg',
    },
  },
  {
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    handle: 'meera',
    displayName: 'Meera',
    bio: 'Coffee and code.',
    avatar: {
      smallUrl: '/fixtures/meera-48.jpg',
      largeUrl: '/fixtures/meera-96.jpg',
    },
  },
  {
    id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    handle: 'arjun',
    displayName: 'Arjun',
    bio: 'Learning backend engineering.',
    avatar: {
      smallUrl: '/fixtures/arjun-48.jpg',
      largeUrl: '/fixtures/arjun-96.jpg',
    },
  },
  {
    id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    handle: 'nisha',
    displayName: 'Nisha',
    bio: 'Designer and creator.',
    avatar: {
      smallUrl: '/fixtures/nisha-48.jpg',
      largeUrl: '/fixtures/nisha-96.jpg',
    },
  },
  {
    id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
    handle: 'vikram',
    displayName: 'Vikram',
    bio: null,
    avatar: {
      smallUrl: '/fixtures/vikram-48.jpg',
      largeUrl: '/fixtures/vikram-96.jpg',
    },
  },
];

/* =========================================================
   ORIGINAL POSTS
   =========================================================
   30 originals.

   original 1 and original 2 intentionally share the
   same createdAt timestamp to test timestamp tie-breaking.
   ========================================================= */

export const originalPosts: PostFixture[] = [
  {
    id: '11111111-1111-4111-8111-000000000001',
    kind: 'original',
    text: 'Starting a new backend project today.',
    createdAt: '2026-09-10T10:00:00.000Z',
    authorId: users[0].id,
    replyToId: null,
    repostOfId: null,
  },
  {
    id: '11111111-1111-4111-8111-000000000002',
    kind: 'original',
    text: 'Learning NestJS one step at a time.',
    createdAt: '2026-09-10T10:00:00.000Z',
    authorId: users[1].id,
    replyToId: null,
    repostOfId: null,
  },
  {
    id: '11111111-1111-4111-8111-000000000003',
    kind: 'original',
    text: 'Clean architecture makes projects easier to understand.',
    createdAt: '2026-09-09T10:00:00.000Z',
    authorId: users[2].id,
    replyToId: null,
    repostOfId: null,
  },
  {
    id: '11111111-1111-4111-8111-000000000004',
    kind: 'original',
    text: 'Today I learned about dependency injection.',
    createdAt: '2026-09-08T10:00:00.000Z',
    authorId: users[3].id,
    replyToId: null,
    repostOfId: null,
  },
  {
    id: '11111111-1111-4111-8111-000000000005',
    kind: 'original',
    text: 'Design and engineering work better together.',
    createdAt: '2026-09-07T10:00:00.000Z',
    authorId: users[4].id,
    replyToId: null,
    repostOfId: null,
  },
  {
    id: '11111111-1111-4111-8111-000000000006',
    kind: 'original',
    text: 'Keeping APIs predictable is underrated.',
    createdAt: '2026-09-06T10:00:00.000Z',
    authorId: users[5].id,
    replyToId: null,
    repostOfId: null,
  },
  {
    id: '11111111-1111-4111-8111-000000000007',
    kind: 'original',
    text: 'Cursor pagination is interesting.',
    createdAt: '2026-09-05T10:00:00.000Z',
    authorId: users[0].id,
    replyToId: null,
    repostOfId: null,
  },
  {
    id: '11111111-1111-4111-8111-000000000008',
    kind: 'original',
    text: 'Testing the repository boundary.',
    createdAt: '2026-09-04T10:00:00.000Z',
    authorId: users[1].id,
    replyToId: null,
    repostOfId: null,
  },
  {
    id: '11111111-1111-4111-8111-000000000009',
    kind: 'original',
    text: 'Small functions are easier to test.',
    createdAt: '2026-09-03T10:00:00.000Z',
    authorId: users[2].id,
    replyToId: null,
    repostOfId: null,
  },
  {
    id: '11111111-1111-4111-8111-000000000010',
    kind: 'original',
    text: 'A good README saves time.',
    createdAt: '2026-09-02T10:00:00.000Z',
    authorId: users[3].id,
    replyToId: null,
    repostOfId: null,
  },
  {
    id: '11111111-1111-4111-8111-000000000011',
    kind: 'original',
    text: 'Working with TypeScript today.',
    createdAt: '2026-09-01T10:00:00.000Z',
    authorId: users[4].id,
    replyToId: null,
    repostOfId: null,
  },
  {
    id: '11111111-1111-4111-8111-000000000012',
    kind: 'original',
    text: 'Backend development is becoming clearer.',
    createdAt: '2026-08-31T10:00:00.000Z',
    authorId: users[5].id,
    replyToId: null,
    repostOfId: null,
  },
  {
    id: '11111111-1111-4111-8111-000000000013',
    kind: 'original',
    text: 'Readable code is valuable code.',
    createdAt: '2026-08-30T10:00:00.000Z',
    authorId: users[0].id,
    replyToId: null,
    repostOfId: null,
  },
  {
    id: '11111111-1111-4111-8111-000000000014',
    kind: 'original',
    text: 'Building with fixtures before a database.',
    createdAt: '2026-08-29T10:00:00.000Z',
    authorId: users[1].id,
    replyToId: null,
    repostOfId: null,
  },
  {
    id: '11111111-1111-4111-8111-000000000015',
    kind: 'original',
    text: 'Stable data makes debugging easier.',
    createdAt: '2026-08-28T10:00:00.000Z',
    authorId: users[2].id,
    replyToId: null,
    repostOfId: null,
  },
  {
    id: '11111111-1111-4111-8111-000000000016',
    kind: 'original',
    text: 'Learning how HTTP requests flow.',
    createdAt: '2026-08-27T10:00:00.000Z',
    authorId: users[3].id,
    replyToId: null,
    repostOfId: null,
  },
  {
    id: '11111111-1111-4111-8111-000000000017',
    kind: 'original',
    text: 'Service boundaries keep responsibilities clear.',
    createdAt: '2026-08-26T10:00:00.000Z',
    authorId: users[4].id,
    replyToId: null,
    repostOfId: null,
  },
  {
    id: '11111111-1111-4111-8111-000000000018',
    kind: 'original',
    text: 'Repositories hide data access details.',
    createdAt: '2026-08-25T10:00:00.000Z',
    authorId: users[5].id,
    replyToId: null,
    repostOfId: null,
  },
  {
    id: '11111111-1111-4111-8111-000000000019',
    kind: 'original',
    text: 'Explicit DTOs make APIs easier to reason about.',
    createdAt: '2026-08-24T10:00:00.000Z',
    authorId: users[0].id,
    replyToId: null,
    repostOfId: null,
  },
  {
    id: '11111111-1111-4111-8111-000000000020',
    kind: 'original',
    text: 'Good tests describe expected behavior.',
    createdAt: '2026-08-23T10:00:00.000Z',
    authorId: users[1].id,
    replyToId: null,
    repostOfId: null,
  },
  {
    id: '11111111-1111-4111-8111-000000000021',
    kind: 'original',
    text: 'Error handling should be predictable.',
    createdAt: '2026-08-22T10:00:00.000Z',
    authorId: users[2].id,
    replyToId: null,
    repostOfId: null,
  },
  {
    id: '11111111-1111-4111-8111-000000000022',
    kind: 'original',
    text: 'I am checking the feed contract.',
    createdAt: '2026-08-21T10:00:00.000Z',
    authorId: users[3].id,
    replyToId: null,
    repostOfId: null,
  },
  {
    id: '11111111-1111-4111-8111-000000000023',
    kind: 'original',
    text: 'Fixed timestamps help pagination tests.',
    createdAt: '2026-08-20T10:00:00.000Z',
    authorId: users[4].id,
    replyToId: null,
    repostOfId: null,
  },
  {
    id: '11111111-1111-4111-8111-000000000024',
    kind: 'original',
    text: 'No database is needed for this stage.',
    createdAt: '2026-08-19T10:00:00.000Z',
    authorId: users[5].id,
    replyToId: null,
    repostOfId: null,
  },
  {
    id: '11111111-1111-4111-8111-000000000025',
    kind: 'original',
    text: 'Next step is persistence.',
    createdAt: '2026-08-18T10:00:00.000Z',
    authorId: users[0].id,
    replyToId: null,
    repostOfId: null,
  },
  {
    id: '11111111-1111-4111-8111-000000000026',
    kind: 'original',
    text: 'Keeping the first stage focused.',
    createdAt: '2026-08-17T10:00:00.000Z',
    authorId: users[1].id,
    replyToId: null,
    repostOfId: null,
  },
  {
    id: '11111111-1111-4111-8111-000000000027',
    kind: 'original',
    text: 'Backend APIs connect the UI to data.',
    createdAt: '2026-08-16T10:00:00.000Z',
    authorId: users[2].id,
    replyToId: null,
    repostOfId: null,
  },
  {
    id: '11111111-1111-4111-8111-000000000028',
    kind: 'original',
    text: 'Understanding architecture before coding.',
    createdAt: '2026-08-15T10:00:00.000Z',
    authorId: users[3].id,
    replyToId: null,
    repostOfId: null,
  },
  {
    id: '11111111-1111-4111-8111-000000000029',
    kind: 'original',
    text: 'One more fixture for pagination.',
    createdAt: '2026-08-14T10:00:00.000Z',
    authorId: users[4].id,
    replyToId: null,
    repostOfId: null,
  },
  {
    id: '11111111-1111-4111-8111-000000000030',
    kind: 'original',
    text: 'The first stage is almost complete.',
    createdAt: '2026-08-13T10:00:00.000Z',
    authorId: users[5].id,
    replyToId: null,
    repostOfId: null,
  },
];

/* =========================================================
   REPLIES
   =========================================================
   12 replies.

   They deliberately start from originalPosts[2],
   so originalPosts[0] and originalPosts[1] can demonstrate
   the "no reactions" case when combined with likes.
   ========================================================= */

export const replies: PostFixture[] = [
  {
    id: '22222222-2222-4222-8222-000000000001',
    kind: 'reply',
    text: 'That sounds like a great project.',
    createdAt: '2026-08-12T09:00:00.000Z',
    authorId: users[1].id,
    replyToId: originalPosts[2].id,
    repostOfId: null,
  },
  {
    id: '22222222-2222-4222-8222-000000000002',
    kind: 'reply',
    text: 'I agree with this approach.',
    createdAt: '2026-08-11T09:00:00.000Z',
    authorId: users[2].id,
    replyToId: originalPosts[3].id,
    repostOfId: null,
  },
  {
    id: '22222222-2222-4222-8222-000000000003',
    kind: 'reply',
    text: 'Dependency injection makes testing easier.',
    createdAt: '2026-08-10T09:00:00.000Z',
    authorId: users[3].id,
    replyToId: originalPosts[4].id,
    repostOfId: null,
  },
  {
    id: '22222222-2222-4222-8222-000000000004',
    kind: 'reply',
    text: 'The cursor rules are especially useful.',
    createdAt: '2026-08-09T09:00:00.000Z',
    authorId: users[4].id,
    replyToId: originalPosts[5].id,
    repostOfId: null,
  },
  {
    id: '22222222-2222-4222-8222-000000000005',
    kind: 'reply',
    text: 'Good point about predictable APIs.',
    createdAt: '2026-08-08T09:00:00.000Z',
    authorId: users[5].id,
    replyToId: originalPosts[6].id,
    repostOfId: null,
  },
  {
    id: '22222222-2222-4222-8222-000000000006',
    kind: 'reply',
    text: 'Testing this boundary will help a lot.',
    createdAt: '2026-08-07T09:00:00.000Z',
    authorId: users[0].id,
    replyToId: originalPosts[7].id,
    repostOfId: null,
  },
  {
    id: '22222222-2222-4222-8222-000000000007',
    kind: 'reply',
    text: 'Small functions really are easier to maintain.',
    createdAt: '2026-08-06T09:00:00.000Z',
    authorId: users[1].id,
    replyToId: originalPosts[8].id,
    repostOfId: null,
  },
  {
    id: '22222222-2222-4222-8222-000000000008',
    kind: 'reply',
    text: 'The README should explain the architecture.',
    createdAt: '2026-08-05T09:00:00.000Z',
    authorId: users[2].id,
    replyToId: originalPosts[9].id,
    repostOfId: null,
  },
  {
    id: '22222222-2222-4222-8222-000000000009',
    kind: 'reply',
    text: 'TypeScript makes these contracts clearer.',
    createdAt: '2026-08-04T09:00:00.000Z',
    authorId: users[3].id,
    replyToId: originalPosts[10].id,
    repostOfId: null,
  },
  {
    id: '22222222-2222-4222-8222-000000000010',
    kind: 'reply',
    text: 'Fixtures are useful before persistence.',
    createdAt: '2026-08-03T09:00:00.000Z',
    authorId: users[4].id,
    replyToId: originalPosts[11].id,
    repostOfId: null,
  },
  {
    id: '22222222-2222-4222-8222-000000000011',
    kind: 'reply',
    text: 'Stable data makes debugging easier.',
    createdAt: '2026-08-02T09:00:00.000Z',
    authorId: users[5].id,
    replyToId: originalPosts[12].id,
    repostOfId: null,
  },
  {
    id: '22222222-2222-4222-8222-000000000012',
    kind: 'reply',
    text: 'Looking forward to the database stage.',
    createdAt: '2026-08-01T09:00:00.000Z',
    authorId: users[0].id,
    replyToId: originalPosts[13].id,
    repostOfId: null,
  },
];

/* =========================================================
   REPOSTS
   ========================================================= */

export const reposts: PostFixture[] = [
  {
    id: '33333333-3333-4333-8333-000000000001',
    kind: 'repost',
    text: null,
    createdAt: '2026-07-31T09:00:00.000Z',
    authorId: users[2].id,
    replyToId: null,
    repostOfId: originalPosts[14].id,
  },
  {
    id: '33333333-3333-4333-8333-000000000002',
    kind: 'repost',
    text: null,
    createdAt: '2026-07-30T09:00:00.000Z',
    authorId: users[3].id,
    replyToId: null,
    repostOfId: originalPosts[15].id,
  },
  {
    id: '33333333-3333-4333-8333-000000000003',
    kind: 'repost',
    text: null,
    createdAt: '2026-07-29T09:00:00.000Z',
    authorId: users[4].id,
    replyToId: null,
    repostOfId: originalPosts[16].id,
  },
  {
    id: '33333333-3333-4333-8333-000000000004',
    kind: 'repost',
    text: null,
    createdAt: '2026-07-28T09:00:00.000Z',
    authorId: users[5].id,
    replyToId: null,
    repostOfId: originalPosts[17].id,
  },
];

/* =========================================================
   ALL POSTS
   ========================================================= */

export const posts: PostFixture[] = [
  ...originalPosts,
  ...replies,
  ...reposts,
];

/* =========================================================
   MEDIA
   =========================================================
   10 media rows.

   Vikram (users[5]) has no media.
   ========================================================= */

export const media: MediaFixture[] = [
  {
    id: '44444444-4444-4444-8444-000000000001',
    postId: originalPosts[0].id,
    altText: 'Laptop on a desk',
    width: 1200,
    height: 800,
    position: 0,
    smallUrl: '/fixtures/desk-480.jpg',
    largeUrl: '/fixtures/desk-1200.jpg',
  },
  {
    id: '44444444-4444-4444-8444-000000000002',
    postId: originalPosts[1].id,
    altText: 'Code editor on a screen',
    width: 1200,
    height: 800,
    position: 0,
    smallUrl: '/fixtures/code-480.jpg',
    largeUrl: '/fixtures/code-1200.jpg',
  },
  {
    id: '44444444-4444-4444-8444-000000000003',
    postId: originalPosts[2].id,
    altText: 'Coffee beside a laptop',
    width: 1200,
    height: 800,
    position: 0,
    smallUrl: '/fixtures/coffee-480.jpg',
    largeUrl: '/fixtures/coffee-1200.jpg',
  },
  {
    id: '44444444-4444-4444-8444-000000000004',
    postId: originalPosts[4].id,
    altText: 'Design workspace',
    width: 1200,
    height: 800,
    position: 0,
    smallUrl: '/fixtures/design-480.jpg',
    largeUrl: '/fixtures/design-1200.jpg',
  },
  {
    id: '44444444-4444-4444-8444-000000000005',
    postId: originalPosts[6].id,
    altText: 'Notebook and keyboard',
    width: 1200,
    height: 800,
    position: 0,
    smallUrl: '/fixtures/notebook-480.jpg',
    largeUrl: '/fixtures/notebook-1200.jpg',
  },
  {
    id: '44444444-4444-4444-8444-000000000006',
    postId: originalPosts[10].id,
    altText: 'TypeScript code',
    width: 1200,
    height: 800,
    position: 0,
    smallUrl: '/fixtures/typescript-480.jpg',
    largeUrl: '/fixtures/typescript-1200.jpg',
  },
  {
    id: '44444444-4444-4444-8444-000000000007',
    postId: originalPosts[12].id,
    altText: 'Clean workspace',
    width: 1200,
    height: 800,
    position: 0,
    smallUrl: '/fixtures/workspace-480.jpg',
    largeUrl: '/fixtures/workspace-1200.jpg',
  },
  {
    id: '44444444-4444-4444-8444-000000000008',
    postId: originalPosts[16].id,
    altText: 'Design sketches',
    width: 1200,
    height: 800,
    position: 0,
    smallUrl: '/fixtures/sketches-480.jpg',
    largeUrl: '/fixtures/sketches-1200.jpg',
  },
  {
    id: '44444444-4444-4444-8444-000000000009',
    postId: originalPosts[20].id,
    altText: 'API documentation',
    width: 1200,
    height: 800,
    position: 0,
    smallUrl: '/fixtures/api-480.jpg',
    largeUrl: '/fixtures/api-1200.jpg',
  },
  {
    id: '44444444-4444-4444-8444-000000000010',
    postId: originalPosts[24].id,
    altText: 'Backend notes',
    width: 1200,
    height: 800,
    position: 0,
    smallUrl: '/fixtures/backend-480.jpg',
    largeUrl: '/fixtures/backend-1200.jpg',
  },
];

/* =========================================================
   LIKES
   =========================================================
   15 likes.

   originalPosts[1] intentionally has no likes and no replies,
   giving us an original with no reactions.

   originalPosts[2] is liked, giving us a liked-original case.
   ========================================================= */

export const likes: LikeFixture[] = [
  { userId: users[0].id, postId: originalPosts[2].id },
  { userId: users[1].id, postId: originalPosts[2].id },
  { userId: users[2].id, postId: originalPosts[3].id },
  { userId: users[3].id, postId: originalPosts[4].id },
  { userId: users[4].id, postId: originalPosts[5].id },
  { userId: users[5].id, postId: originalPosts[6].id },
  { userId: users[0].id, postId: originalPosts[7].id },
  { userId: users[1].id, postId: originalPosts[8].id },
  { userId: users[2].id, postId: originalPosts[9].id },
  { userId: users[3].id, postId: originalPosts[10].id },
  { userId: users[4].id, postId: originalPosts[11].id },
  { userId: users[5].id, postId: originalPosts[12].id },
  { userId: users[0].id, postId: originalPosts[13].id },
  { userId: users[1].id, postId: originalPosts[14].id },
  { userId: users[2].id, postId: originalPosts[15].id },
];

/* =========================================================
   FOLLOWS
   =========================================================
   8 directional follow edges.
   ========================================================= */

export const follows: FollowFixture[] = [
  {
    followerId: users[0].id,
    followingId: users[1].id,
  },
  {
    followerId: users[0].id,
    followingId: users[2].id,
  },
  {
    followerId: users[1].id,
    followingId: users[0].id,
  },
  {
    followerId: users[1].id,
    followingId: users[3].id,
  },
  {
    followerId: users[2].id,
    followingId: users[4].id,
  },
  {
    followerId: users[3].id,
    followingId: users[0].id,
  },
  {
    followerId: users[4].id,
    followingId: users[1].id,
  },
  {
    followerId: users[5].id,
    followingId: users[0].id,
  },
];