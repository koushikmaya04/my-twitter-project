/**
 * Post — Base class for all social media content.
 * 
 * DEMONSTRATES:
 * - OOP Inheritance (base class for Tweet and Retweet)
 * - Encapsulation (private #likeCount field — cannot be directly accessed or modified
 *   from outside the class; must use like(), unlike(), getLikeCount() methods)
 * 
 * WHY ENCAPSULATION: Prevents React components from directly mutating the like counter.
 * All changes go through controlled methods that can enforce business rules.
 */
class Post {
  // Private fields — not accessible outside the class
  #likeCount;
  #comments;

  constructor({ id, content, author, handle, avatar, timestamp, likes = 0 }) {
    this.id = id;
    this.content = content;
    this.author = author;
    this.handle = handle;
    this.avatar = avatar;
    this.timestamp = timestamp;
    this.#likeCount = likes;
    this.#comments = [];
    this.retweetCount = 0;
    this.isLiked = false;
    this.isRetweeted = false;
    this.isBookmarked = false;
  }

  /**
   * ENCAPSULATION: Controlled method to increment likes.
   * Enforces that likeCount can only increase by 1 at a time.
   */
  like() {
    if (!this.isLiked) {
      this.#likeCount++;
      this.isLiked = true;
    }
    return this.#likeCount;
  }

  /**
   * ENCAPSULATION: Controlled method to decrement likes.
   * Prevents likeCount from going below 0.
   */
  unlike() {
    if (this.isLiked && this.#likeCount > 0) {
      this.#likeCount--;
      this.isLiked = false;
    }
    return this.#likeCount;
  }

  /**
   * ENCAPSULATION: Getter — the ONLY way to read the like count.
   * External code cannot set this value directly.
   */
  getLikeCount() {
    return this.#likeCount;
  }

  /**
   * Set like count directly (used for initialization and rollback).
   * Still controlled — goes through a method, not direct field access.
   */
  setLikeCount(count) {
    this.#likeCount = Math.max(0, count);
  }

  addComment(comment) {
    this.#comments.push({
      id: Date.now() + Math.random(),
      ...comment,
      timestamp: new Date().toISOString()
    });
    return this.getCommentCount();
  }

  getComments() {
    // Return a copy to prevent external mutation of the internal array
    return [...this.#comments];
  }

  getCommentCount() {
    return this.#comments.length;
  }

  /**
   * Serialize to plain object for React state.
   * React state needs plain objects (classes don't serialize well).
   */
  toPlainObject() {
    return {
      id: this.id,
      content: this.content,
      author: this.author,
      handle: this.handle,
      avatar: this.avatar,
      timestamp: this.timestamp,
      likeCount: this.#likeCount,
      comments: [...this.#comments],
      commentCount: this.#comments.length,
      retweetCount: this.retweetCount,
      isLiked: this.isLiked,
      isRetweeted: this.isRetweeted,
      isBookmarked: this.isBookmarked,
      type: 'post'
    };
  }
}

export default Post;
