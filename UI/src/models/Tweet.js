import Post from './Post.js';
import { resolveImageUrl } from '../services/api.js';
import { DEFAULT_AVATAR } from '../utils/constants.js';

/**
 * Tweet — Extends Post with image and category data.
 * 
 * DEMONSTRATES:
 * - OOP Inheritance (extends Post, inherits like/unlike/comment methods)
 * - Factory Pattern (static fromAPIPhoto transforms API data into domain model)
 * 
 * WHY INHERITANCE: Tweet IS-A Post with additional image-specific properties.
 * All Post behaviors (likes, comments, encapsulation) are inherited automatically.
 */
class Tweet extends Post {
  constructor({ imageUrl, thumbnailUrl, albumId, category, verified = false, ...postProps }) {
    // Call parent constructor — required for inheritance
    super(postProps);
    this.imageUrl = imageUrl;
    this.thumbnailUrl = thumbnailUrl;
    this.albumId = albumId;
    this.category = category;
    this.verified = verified;
  }

  /**
   * FACTORY METHOD: Transforms a JSONPlaceholder photo object into a Tweet instance.
   */
  static fromAPIPhoto(photo) {
    const usernames = [
      { author: 'Alex Thompson', handle: '@alexthompson' },
      { author: 'Sarah Chen', handle: '@sarahchen' },
      { author: 'Mike Rodriguez', handle: '@mikerodz' },
      { author: 'Emily Park', handle: '@emilypark' },
      { author: 'James Wilson', handle: '@jameswilson' },
      { author: 'Aria Patel', handle: '@ariapatel' },
      { author: 'David Kim', handle: '@davidkim' },
      { author: 'Olivia Brown', handle: '@oliviabrown' },
      { author: 'Liam Johnson', handle: '@liamjohnson' },
      { author: 'Sophia Martinez', handle: '@sophiamartinez' },
      { author: 'Noah Davis', handle: '@noahdavis' },
      { author: 'Mia Garcia', handle: '@miagarcia' },
      { author: 'Ethan Lee', handle: '@ethanlee' },
      { author: 'Ava Robinson', handle: '@avarobinson' },
      { author: 'Lucas Hall', handle: '@lucashall' }
    ];

    const categories = [
      'Technology', 'Science', 'Design', 'Photography', 'Nature',
      'Travel', 'Architecture', 'Art', 'Music', 'Food'
    ];

    const user = usernames[photo.id % usernames.length];
    const category = categories[photo.albumId % categories.length];

    const hours = (photo.id % 23) + 1;
    const timestamp = hours <= 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
    const baseLikes = ((photo.id * 17) % 500) + 10;
    const baseRetweets = ((photo.id * 13) % 100) + 2;
    const formattedTitle = photo.title.charAt(0).toUpperCase() + photo.title.slice(1);

    const tweet = new Tweet({
      id: photo.id,
      content: formattedTitle,
      author: user.author,
      handle: user.handle,
      avatar: DEFAULT_AVATAR,
      timestamp: timestamp,
      likes: baseLikes,
      imageUrl: `https://picsum.photos/id/${(photo.id % 1000) + 1}/600/400`,
      thumbnailUrl: `https://picsum.photos/id/${(photo.id % 1000) + 1}/150/150`,
      albumId: photo.albumId,
      category: category,
      verified: photo.id % 3 === 0
    });

    tweet.retweetCount = baseRetweets;
    return tweet;
  }

  static fromAPIPost(post) {
    const firstMedia = post.media?.[0] ?? null;
    const authorHandle = post.author?.handle
      ? (post.author.handle.startsWith('@') ? post.author.handle : `@${post.author.handle}`)
      : '';

    const tweet = new Tweet({
      id: post.id,
      content: post.text ?? '',
      author: post.author?.displayName ?? '',
      handle: authorHandle,
      avatar: resolveImageUrl(post.author?.avatar?.smallUrl) || DEFAULT_AVATAR,
      timestamp: post.createdAt,
      likes: post.likeCount ?? 0,
      imageUrl: resolveImageUrl(firstMedia?.largeUrl) ?? null,
      thumbnailUrl: resolveImageUrl(firstMedia?.smallUrl) ?? null,
      albumId: null,
      category: null,
      verified: false,
    });

    tweet.authorId = post.author?.id ?? null;
    tweet.version = post.version ?? 1;
    tweet.isEdited = Boolean(post.isEdited);
    tweet.editedAt = post.editedAt ?? null;
    tweet.kind = post.kind ?? 'original';
    tweet.createdAt = post.createdAt;
    tweet.replyToId = post.replyToId ?? null;
    tweet.repostOfId = post.repostOfId ?? null;
    tweet.retweetCount = post.repostCount ?? 0;
    tweet.commentCount = post.replyCount ?? 0;
    tweet.isLiked = Boolean(post.likedByViewer);
    tweet.isRetweeted = Boolean(post.repostedByViewer);

    return tweet;
  }

  /**
   * Override parent's toPlainObject to include Tweet-specific fields.
   * Demonstrates polymorphism — same method name, extended behavior.
   */
  toPlainObject() {
    return {
      ...super.toPlainObject(),
      authorId: this.authorId,
      version: this.version,
      isEdited: this.isEdited,
      editedAt: this.editedAt,
      kind: this.kind,
      createdAt: this.createdAt,
      replyToId: this.replyToId,
      repostOfId: this.repostOfId,
      isRetweeted: this.isRetweeted,
      retweetCount: this.retweetCount,
      commentCount: this.commentCount,
      imageUrl: this.imageUrl,
      thumbnailUrl: this.thumbnailUrl,
      albumId: this.albumId,
      category: this.category,
      verified: this.verified,
      type: 'tweet'
    };
  }
}

export default Tweet;
