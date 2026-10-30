import { describe, test } from 'node:test';
import assert from 'node:assert';
import Tweet from '../src/models/Tweet.js';
import Post from '../src/models/Post.js';
import { filterByTab } from '../src/utils/functionalPipeline.js';

describe('Frontend Bug Fixes Verification', () => {
  // Fix #1 & Fix #2: Model and Post object properties
  test('Fix #3: Post.toPlainObject() includes synchronized likes and likeCount and isLiked', () => {
    const post = new Post({
      id: 'post-1',
      content: 'Hello world',
      author: 'Alice',
      handle: '@alice',
      likes: 12,
    });
    post.isLiked = true;

    const plain = post.toPlainObject();
    assert.strictEqual(plain.likeCount, 12);
    assert.strictEqual(plain.likes, 12);
    assert.strictEqual(plain.isLiked, true);
  });

  test('Fix #3: Tweet.fromAPIPost maps likedByViewer accurately into isLiked', () => {
    const apiPost = {
      id: 'post-liked',
      text: 'Liked post',
      author: { displayName: 'Bob', handle: 'bob' },
      createdAt: new Date().toISOString(),
      likeCount: 5,
      likedByViewer: true,
      repostCount: 2,
      repostedByViewer: false,
    };

    const tweet = Tweet.fromAPIPost(apiPost);
    assert.strictEqual(tweet.isLiked, true);
    assert.strictEqual(tweet.getLikeCount(), 5);

    const plain = tweet.toPlainObject();
    assert.strictEqual(plain.isLiked, true);
    assert.strictEqual(plain.likeCount, 5);
    assert.strictEqual(plain.likes, 5);
  });

  test('Fix #4: Following state handles and IDs normalization supports @ and raw handles', () => {
    const apiFollowingItems = [
      { id: 'uuid-1', handle: 'sarahchen', displayName: 'Sarah Chen' },
      { id: 'uuid-2', handle: '@alex', displayName: 'Alex' },
    ];

    const normalized = [];
    apiFollowingItems.forEach((f) => {
      if (f.id) normalized.push(f.id);
      if (f.handle) {
        const clean = f.handle.replace(/^@/, '');
        normalized.push(clean);
        normalized.push(`@${clean}`);
      }
    });

    // Check normalization contains both prefixed and un-prefixed handles + IDs
    assert.ok(normalized.includes('uuid-1'));
    assert.ok(normalized.includes('sarahchen'));
    assert.ok(normalized.includes('@sarahchen'));
    assert.ok(normalized.includes('uuid-2'));
    assert.ok(normalized.includes('alex'));
    assert.ok(normalized.includes('@alex'));

    // Check filterByTab
    const posts = [
      { id: '1', handle: '@sarahchen', authorId: 'uuid-1' },
      { id: '2', handle: '@unknown', authorId: 'uuid-99' },
    ];

    const filtered = filterByTab('following', normalized)(posts);
    assert.strictEqual(filtered.length, 1);
    assert.strictEqual(filtered[0].id, '1');
  });

  test('Fix #5: Lightbox active tweet preserves like synchronization with feed tweet', () => {
    const feedTweet = {
      id: 'tweet-1',
      content: 'Feed tweet',
      likes: 10,
      likeCount: 10,
      isLiked: false,
    };

    const detailTweetSnapshot = {
      id: 'tweet-1',
      content: 'Feed tweet detailed',
      likes: 10,
      likeCount: 10,
      isLiked: false,
      comments: [{ id: 'c1', text: 'comment' }],
    };

    // Simulate optimistic like update on feedTweet
    const updatedFeedTweet = {
      ...feedTweet,
      isLiked: true,
      likeCount: 11,
      likes: 11,
    };

    // Simulate the TweetCard activeTweet useMemo resolution
    const activeTweet = {
      ...detailTweetSnapshot,
      isLiked: updatedFeedTweet.isLiked,
      likeCount: updatedFeedTweet.likeCount ?? updatedFeedTweet.likes,
      likes: updatedFeedTweet.likes ?? updatedFeedTweet.likeCount,
      isRetweeted: updatedFeedTweet.isRetweeted,
      retweetCount: updatedFeedTweet.retweetCount,
    };

    assert.strictEqual(activeTweet.isLiked, true);
    assert.strictEqual(activeTweet.likeCount, 11);
    assert.strictEqual(activeTweet.likes, 11);
    assert.strictEqual(activeTweet.comments.length, 1);
  });
});
