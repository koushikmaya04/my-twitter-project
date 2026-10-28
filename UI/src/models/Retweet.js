import Tweet from './Tweet.js';

/**
 * Retweet — Extends Tweet with retweet-specific metadata.
 * 
 * DEMONSTRATES:
 * - Multi-level Inheritance (Retweet → Tweet → Post)
 * - Polymorphism (overrides toPlainObject with retweet-specific data)
 * 
 * WHY: A Retweet IS-A Tweet that was shared by another user.
 * It carries all the original tweet data plus retweet metadata.
 */
class Retweet extends Tweet {
  constructor({ retweetedBy, retweetHandle, retweetTimestamp, ...tweetProps }) {
    super(tweetProps);
    this.retweetedBy = retweetedBy;
    this.retweetHandle = retweetHandle;
    this.retweetTimestamp = retweetTimestamp || new Date().toISOString();
  }

  /**
   * Factory: Create a Retweet from an existing tweet's plain object.
   */
  static fromTweet(tweetData, retweetedBy, retweetHandle) {
    return new Retweet({
      ...tweetData,
      id: `rt-${tweetData.id}-${Date.now()}`,
      retweetedBy,
      retweetHandle,
      retweetTimestamp: new Date().toISOString()
    });
  }

  /**
   * Override toPlainObject with retweet-specific fields.
   * Three-level polymorphism: Retweet → Tweet → Post
   */
  toPlainObject() {
    return {
      ...super.toPlainObject(),
      retweetedBy: this.retweetedBy,
      retweetHandle: this.retweetHandle,
      retweetTimestamp: this.retweetTimestamp,
      type: 'retweet'
    };
  }
}

export default Retweet;
