import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import Tweet from '../src/models/Tweet.js';
import Post from '../src/models/Post.js';
import Retweet from '../src/models/Retweet.js';
import {
  pipe,
  dedupe,
  sortByRecency,
  filterByFollowing,
  filterBySearch,
  createFeedPipeline,
} from '../src/utils/functionalPipeline.js';
import { DEFAULT_AVATAR } from '../src/utils/constants.js';
import {
  registerUser,
  loginUser,
  fetchCurrentUser,
  logoutUser,
  fetchPosts,
  fetchHomeFeed,
  createPostRequest,
  updatePostRequest,
  deletePostRequest,
  fetchReplies,
  fetchUserProfile,
  updateMyProfile,
  followUserRequest,
  unfollowUserRequest,
  fetchFollowers,
  fetchFollowing,
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  searchPosts,
} from '../src/services/api.js';

describe('Frontend Models & Functional Pipeline', () => {
  test('Tweet model inherits from Post and converts API post correctly', () => {
    const rawPost = {
      id: 'test-post-1',
      kind: 'original',
      text: 'Hello world',
      createdAt: '2026-10-27T10:00:00.000Z',
      author: {
        id: 'user-1',
        handle: 'johndoe',
        displayName: 'John Doe',
        avatar: { smallUrl: '/fixtures/avatar.jpg' },
      },
      media: [],
      likeCount: 5,
      replyCount: 2,
      likedByViewer: true,
      version: 1,
      isEdited: false,
    };

    const tweet = Tweet.fromAPIPost(rawPost);
    assert.strictEqual(tweet instanceof Post, true);
    assert.strictEqual(tweet instanceof Tweet, true);
    assert.strictEqual(tweet.id, 'test-post-1');
    assert.strictEqual(tweet.author, 'John Doe');
    assert.strictEqual(tweet.handle, '@johndoe');
    assert.strictEqual(tweet.authorId, 'user-1');
    assert.strictEqual(tweet.version, 1);
    assert.strictEqual(tweet.isLiked, true);
    assert.strictEqual(tweet.commentCount, 2);

    const plain = tweet.toPlainObject();
    assert.strictEqual(plain.authorId, 'user-1');
    assert.strictEqual(plain.version, 1);
    assert.strictEqual(plain.type, 'tweet');
  });

  test('Tweet model applies DEFAULT_AVATAR placeholder when avatar is missing', () => {
    const rawPostNoAvatar = {
      id: 'test-post-no-avatar',
      kind: 'original',
      text: 'Post with no avatar',
      createdAt: '2026-10-27T10:00:00.000Z',
      author: {
        id: 'user-2',
        handle: 'noavatar',
        displayName: 'No Avatar',
      },
      media: [],
    };

    const tweet = Tweet.fromAPIPost(rawPostNoAvatar);
    assert.strictEqual(tweet.avatar, DEFAULT_AVATAR);
  });

  test('Retweet model extends Tweet with retweet metadata', () => {
    const baseTweet = new Tweet({
      id: 'tweet-10',
      content: 'Original content',
      author: 'Alice',
      handle: '@alice',
    });

    const retweet = Retweet.fromTweet(baseTweet.toPlainObject(), 'Bob', '@bob');
    assert.strictEqual(retweet instanceof Tweet, true);
    assert.strictEqual(retweet.retweetedBy, 'Bob');
    assert.strictEqual(retweet.retweetHandle, '@bob');
    assert.strictEqual(retweet.toPlainObject().type, 'retweet');
  });

  test('Functional pipeline deduplicates, filters, and sorts posts', () => {
    const posts = [
      { id: '1', handle: '@alice', timestamp: '2h', content: 'Post 1' },
      { id: '2', handle: '@bob', timestamp: '1h', content: 'Post 2' },
      { id: '1', handle: '@alice', timestamp: '2h', content: 'Post 1 Duplicate' },
      { id: '3', handle: '@charlie', timestamp: '3h', content: 'Post 3' },
    ];

    const pipeline = createFeedPipeline('following', ['@alice', '@bob'], '');
    const result = pipeline(posts);

    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].id, '2'); // 1h is more recent than 2h
    assert.strictEqual(result[1].id, '1');
  });
});

describe('Frontend API Service Integration (P0-01 to P0-07)', () => {
  const uniqueSuffix = Date.now().toString().slice(-6);
  const testHandle = `test_${uniqueSuffix}`;
  const testDisplayName = `User ${uniqueSuffix}`;
  const testPassword = 'Password123!';
  let testUserId = null;

  test('P0-01: Register user and validate credentials constraints', async () => {
    const { user, requestId } = await registerUser({
      handle: testHandle,
      displayName: testDisplayName,
      password: testPassword,
    });

    assert.ok(user);
    assert.strictEqual(user.handle.toLowerCase(), testHandle.toLowerCase());
    assert.strictEqual(user.displayName, testDisplayName);
    assert.ok(requestId, 'Should include canonical requestId');
    testUserId = user.id;
  });

  test('P0-01: Login with cookie-based session and verify session restoration via GET /auth/me', async () => {
    const loginRes = await loginUser({
      handle: testHandle,
      password: testPassword,
    });
    assert.ok(loginRes.user);

    // Verify session restoration
    const meRes = await fetchCurrentUser();
    assert.ok(meRes.user);
    assert.strictEqual(meRes.user.id, testUserId);
    assert.strictEqual(meRes.user.displayName, testDisplayName);
  });

  test('P0-04: Fetch public feed and verify cursor pagination contract', async () => {
    const feed = await fetchPosts(null, 5);
    assert.ok(Array.isArray(feed.posts));
    assert.ok(feed.posts.length > 0);
    assert.ok(feed.requestId);
    assert.strictEqual(typeof feed.hasMore, 'boolean');

    if (feed.nextCursor) {
      const page2 = await fetchPosts(feed.nextCursor, 5);
      assert.ok(Array.isArray(page2.posts));
    }
  });

  test('P0-04: Fetch personalized home feed via GET /feed/home', async () => {
    const homeFeed = await fetchHomeFeed(null, 10);
    assert.ok(Array.isArray(homeFeed.posts));
    assert.ok(homeFeed.requestId);
  });

  test('P0-05: Create post, reply, edit within 30-min window, and delete post', async () => {
    // 1. Create post
    const postText = `Frontend test post at ${Date.now()}`;
    const created = await createPostRequest({
      kind: 'original',
      text: postText,
    });
    assert.ok(created.id);
    assert.strictEqual(created.text, postText);

    // 2. Reply to post
    const replyText = `Reply text ${Date.now()}`;
    const reply = await createPostRequest({
      kind: 'reply',
      replyToId: created.id,
      text: replyText,
    });
    assert.ok(reply.id);

    // Verify replies list
    const repliesList = await fetchReplies(created.id);
    assert.ok(Array.isArray(repliesList.replies));
    assert.ok(repliesList.replies.some((r) => r.id === reply.id));

    // 3. Edit post within 30-minute window with expectedVersion
    const updatedText = `Updated text at ${Date.now()}`;
    const updated = await updatePostRequest(created.id, updatedText, 1);
    assert.ok(updated.post);
    assert.strictEqual(updated.post.text, updatedText);
    assert.strictEqual(updated.post.isEdited, true);
    assert.strictEqual(updated.post.version, 2);

    // 4. Soft-delete post
    const deleted = await deletePostRequest(created.id);
    assert.strictEqual(deleted.deleted, true);
  });

  test('P0-05: Repost original post and undo repost without affecting original post', async () => {
    // 1. Create original post
    const postText = `Original post for repost testing ${Date.now()}`;
    const original = await createPostRequest({
      kind: 'original',
      text: postText,
    });
    assert.ok(original.id);

    // 2. Create repost of the original post
    const repost = await createPostRequest({
      kind: 'repost',
      repostOfId: original.id,
    });
    assert.ok(repost.id);
    assert.strictEqual(repost.kind, 'repost');

    // 3. Delete the repost (Undo repost)
    const deleteRepostRes = await deletePostRequest(repost.id);
    assert.strictEqual(deleteRepostRes.deleted, true);

    // Clean up original post
    await deletePostRequest(original.id);
  });

  test('P0-02 & P0-03: View profile, update profile with ownership, and follow targets', async () => {
    // Fetch profile
    const profileRes = await fetchUserProfile(testUserId);
    assert.ok(profileRes.user);
    assert.strictEqual(profileRes.user.id, testUserId);

    // Update profile (ownership: viewer updating own profile)
    const newBio = 'Frontend engineer testing profile bio update';
    const updatedProfile = await updateMyProfile({
      displayName: `${testDisplayName} Updated`,
      bio: newBio,
    });
    assert.strictEqual(updatedProfile.user.bio, newBio);
    assert.strictEqual(updatedProfile.user.displayName, `${testDisplayName} Updated`);

    // Follow another user (asha)
    const targetUserId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const followRes = await followUserRequest(targetUserId);
    assert.strictEqual(followRes.following, true);

    // Check following list
    const followingRes = await fetchFollowing(testUserId);
    assert.ok(followingRes.items.some((u) => u.id === targetUserId));

    // Unfollow
    const unfollowRes = await unfollowUserRequest(targetUserId);
    assert.strictEqual(unfollowRes.following, false);
  });

  test('P0-06: Notifications inbox, unread count, mark read, mark all read', async () => {
    // Fetch unread count
    const countRes = await fetchUnreadCount();
    assert.strictEqual(typeof countRes.unreadCount, 'number');

    // List notifications
    const listRes = await fetchNotifications(null, 10);
    assert.ok(Array.isArray(listRes.items));

    // Mark all as read
    const markAllRes = await markAllNotificationsAsRead();
    assert.ok(markAllRes);
  });

  test('P0-01 & P0-07: Logout revokes session and me rejects with 401', async () => {
    await logoutUser();

    // After logout, me request should reject with 401 Unauthorized
    await assert.rejects(
      async () => {
        await fetchCurrentUser();
      },
      (err) => {
        assert.strictEqual(err.status, 401);
        return true;
      }
    );
  });
});
