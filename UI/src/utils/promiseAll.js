/**
 * Custom Promise.all Implementation
 * 
 * DEMONSTRATES: Understanding of Promise mechanics and concurrent async operations.
 * 
 * WHY CUSTOM: To show deep understanding of how Promise.all works internally:
 * 1. It accepts an array of promises
 * 2. It resolves when ALL promises resolve (preserving result order)
 * 3. It rejects immediately if ANY promise rejects
 * 
 * This custom implementation is used in the image loading system
 * where we need to track completion of batched image loads.
 * 
 * We do NOT simply use the built-in Promise.all everywhere.
 * 
 * @param {Promise[]} promises - Array of promises to resolve concurrently
 * @returns {Promise<Array>} A promise that resolves with an array of results
 */
export function customPromiseAll(promises) {
  return new Promise((resolve, reject) => {
    // Handle edge case: empty array should resolve immediately with []
    if (!promises || promises.length === 0) {
      resolve([]);
      return;
    }

    const results = new Array(promises.length);
    let resolvedCount = 0;
    let hasRejected = false;

    promises.forEach((promise, index) => {
      // Wrap non-promise values in Promise.resolve for consistency
      Promise.resolve(promise)
        .then((value) => {
          if (hasRejected) return; // Don't process if already rejected

          // Store result at the ORIGINAL index to preserve order.
          // This is crucial — results must match the input order,
          // not the resolution order.
          results[index] = value;
          resolvedCount++;

          // Only resolve when ALL promises have resolved
          if (resolvedCount === promises.length) {
            resolve(results);
          }
        })
        .catch((error) => {
          if (hasRejected) return; // Prevent multiple rejections
          hasRejected = true;

          // Reject immediately on first failure — same as native Promise.all
          reject(error);
        });
    });
  });
}

export default customPromiseAll;
