import Post from './Post.js';

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
   * 
   * JSONPlaceholder photo structure:
   *   { albumId, id, title, url, thumbnailUrl }
   * 
   * This method converts that raw API data into our domain model,
   * so the rest of the app never sees the raw API structure.
   */
  static fromAPIPhoto(photo) {
    // Generate realistic-looking Twitter usernames and display names
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

    // Generate a semi-random time string
    const hours = (photo.id % 23) + 1;
    const timestamp = hours <= 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`;

    // Generate semi-random like/retweet/comment counts based on the photo ID for consistency
    const baseLikes = ((photo.id * 17) % 500) + 10;
    const baseRetweets = ((photo.id * 13) % 100) + 2;

    // Capitalize the first letter and add some tweet-like formatting to the title
    const formattedTitle = photo.title.charAt(0).toUpperCase() + photo.title.slice(1);

    const tweet = new Tweet({
      id: photo.id,
      content: formattedTitle,
      author: user.author,
      handle: user.handle,
      avatar: `https://i.pravatar.cc/48?img=${photo.id % 70}`,
      timestamp: timestamp,
      likes: baseLikes,
      // The API returns via.placeholder.com which is currently down/timing out globally.
      // We dynamically swap it to picsum.photos so the UI actually works for the user.
      imageUrl: `https://picsum.photos/id/${(photo.id % 1000) + 1}/600/400`,
      thumbnailUrl: `https://picsum.photos/id/${(photo.id % 1000) + 1}/150/150`,
      albumId: photo.albumId,
      category: category,
      verified: photo.id % 3 === 0
    });

    tweet.retweetCount = baseRetweets;
    return tweet;
  }

  /**
   * Override parent's toPlainObject to include Tweet-specific fields.
   * Demonstrates polymorphism — same method name, extended behavior.
   */
  toPlainObject() {
    return {
      ...super.toPlainObject(),
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
