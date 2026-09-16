/**
 * Custom Debounce Implementation
 * 
 * DEMONSTRATES: Debounce pattern — delays function execution until the user
 * stops triggering it for a specified duration.
 * 
 * WHY DEBOUNCE: In a search bar, firing a filter/search on every keystroke
 * is wasteful. Debounce waits until the user pauses typing, then executes
 * once. This reduces unnecessary re-renders and (in a real app) API calls.
 * 
 * HOW IT WORKS:
 * 1. Each call clears the previous timer (if any)
 * 2. A new timer is set for `delay` milliseconds
 * 3. If the function is called again before the timer fires, step 1 resets it
 * 4. The function only executes when the user stops calling it for `delay` ms
 * 
 * This is a custom implementation — we do NOT use lodash.debounce.
 * 
 * @param {Function} fn - The function to debounce
 * @param {number} delay - Delay in milliseconds (default: 300ms)
 * @returns {Function} Debounced version of fn
 */
export function debounce(fn, delay = 300) {
  let timeoutId = null;

  const debounced = function (...args) {
    // Step 1: Clear any existing timer — this is the key to debouncing.
    // If the user types another character before `delay` ms have passed,
    // we cancel the previous pending execution.
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    // Step 2: Set a new timer. The function will only execute
    // after `delay` ms of inactivity.
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
      timeoutId = null;
    }, delay);
  };

  // Allow manual cancellation if needed
  debounced.cancel = function () {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
}

export default debounce;
 


// em ledu simple mannam pampina  request 0.3 sec lopala vere request oste ah patha request override iyytadi