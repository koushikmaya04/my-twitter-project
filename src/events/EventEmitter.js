/**
 * Custom EventEmitter — Observer Pattern Implementation
 * 
 * DEMONSTRATES: Observer Pattern (aka Pub/Sub)
 * 
 * WHY OBSERVER PATTERN: Decouples event producers from event consumers.
 * When a user likes a tweet, the TweetCard component emits a 'like' event.
 * The NotificationContainer listens for that event and shows a toast.
 * Neither component needs to know about the other — they communicate
 * through the EventEmitter, which acts as a message bus.
 * 
 * This is a custom implementation — we do NOT use Node's EventEmitter
 * or any external library.
 * 
 * Supported events:
 * - 'like'        → { username, tweetId, tweetContent }
 * - 'comment'     → { username, tweetId, commentText }
 * - 'retweet'     → { username, tweetId, tweetContent }
 * - 'newFollower' → { followerName, followedName }
 */
class EventEmitter {
  constructor() {
    // Map of event names to arrays of listener functions
    // Using a Map for O(1) event name lookup
    this._listeners = new Map();
  }

  /**
   * Subscribe to an event.
   * 
   * @param {string} event - Event name to listen for
   * @param {Function} listener - Callback function to invoke when event fires
   * @returns {Function} Unsubscribe function for cleanup
   */
  on(event, listener) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(listener);

    // Return an unsubscribe function — useful for React useEffect cleanup
    return () => this.off(event, listener);
  }

  /**
   * Unsubscribe from an event.
   * 
   * @param {string} event - Event name
   * @param {Function} listener - The specific listener to remove
   */
  off(event, listener) {
    if (!this._listeners.has(event)) return;
    const listeners = this._listeners.get(event);
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * Emit an event, notifying all subscribed listeners.
   * 
   * @param {string} event - Event name to emit
   * @param {*} data - Data payload to pass to listeners
   */
  emit(event, data) {
    if (!this._listeners.has(event)) return;
    // Create a copy of listeners array to avoid issues if a listener
    // unsubscribes during iteration
    const listeners = [...this._listeners.get(event)];
    listeners.forEach((listener) => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in event listener for '${event}':`, error);
      }
    });
  }

  /**
   * Subscribe to an event for ONE emission only.
   * After the event fires once, the listener is automatically removed.
   * 
   * @param {string} event - Event name
   * @param {Function} listener - One-time callback
   */
  once(event, listener) {
    const wrapper = (data) => {
      listener(data);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }

  /**
   * Remove all listeners for a specific event, or all events if no event specified.
   * Useful for cleanup.
   */
  removeAllListeners(event) {
    if (event) {
      this._listeners.delete(event);
    } else {
      this._listeners.clear();
    }
  }

  /**
   * Get the number of listeners for a specific event.
   * Useful for debugging.
   */
  listenerCount(event) {
    return this._listeners.has(event) ? this._listeners.get(event).length : 0;
  }
}

/**
 * Singleton instance — shared across the entire application.
 * All components import this same instance to emit/listen for events.
 * This is the "message bus" that connects producers and consumers.
 */
export const eventEmitter = new EventEmitter();
export default EventEmitter;
