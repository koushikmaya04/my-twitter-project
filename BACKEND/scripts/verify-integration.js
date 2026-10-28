async function verifyAll() {
  let allPassed = true;
  function assert(condition, message) {
    if (!condition) {
      console.error('FAIL:', message);
      allPassed = false;
    } else {
      console.log('PASS:', message);
    }
  }

  // 1. Static Fixture check (Backend & Vite Proxy)
  const bImg = await fetch('http://localhost:3000/fixtures/desk-1200.jpg');
  assert(bImg.status === 200, 'Backend serves fixture image directly (200)');
  assert(bImg.headers.get('content-type').includes('image'), 'Backend serves image content-type');

  const fImg = await fetch('http://localhost:5173/fixtures/desk-1200.jpg');
  assert(fImg.status === 200, 'Frontend dev proxy serves fixture image (200)');

  // 2. Request ID Consistency (SUCCESS)
  const feedRes = await fetch('http://localhost:3000/feed?limit=3', {
    headers: { Origin: 'http://localhost:5173' }
  });
  const feedHeader = feedRes.headers.get('x-request-id');
  const feedCors = feedRes.headers.get('access-control-expose-headers');
  const feedBody = await feedRes.json();
  assert(feedRes.status === 200, 'Feed returns 200');
  assert(Boolean(feedHeader), 'Feed has X-Request-ID header: ' + feedHeader);
  assert(feedHeader === feedBody.requestId, 'Feed header X-Request-ID matches JSON requestId');
  assert(feedCors && feedCors.toLowerCase().includes('x-request-id'), 'CORS exposes X-Request-ID: ' + feedCors);
  assert(!('replyToId' in (feedBody.items[0] || {})), 'Feed DTO does not leak replyToId');
  assert(!('repostOfId' in (feedBody.items[0] || {})), 'Feed DTO does not leak repostOfId');

  // 3. Request ID Consistency (400 Bad Request)
  const errRes = await fetch('http://localhost:3000/search/posts?q=x', {
    headers: { Origin: 'http://localhost:5173' }
  });
  const errHeader = errRes.headers.get('x-request-id');
  const errBody = await errRes.json();
  assert(errRes.status === 400, 'Short query rejected with 400');
  assert(Boolean(errHeader), 'Error response has X-Request-ID header: ' + errHeader);
  assert(errHeader === errBody.requestId, 'Error header X-Request-ID matches JSON requestId');
  assert(errBody.error?.code === 'VALIDATION_ERROR', 'Error has sanitized code VALIDATION_ERROR');

  // 4. Keyboard Search Endpoint & Parameters
  const searchRes = await fetch('http://localhost:3000/search/posts?q=hello%20world', {
    headers: { Origin: 'http://localhost:5173' }
  });
  const searchHeader = searchRes.headers.get('x-request-id');
  const searchBody = await searchRes.json();
  assert(searchRes.status === 200, 'Search query "hello world" returns 200');
  assert(searchHeader === searchBody.requestId, 'Search header matches JSON requestId');
  assert(Array.isArray(searchBody.items), 'Search returns items array');

  // 5. Post Detail API & Media
  const detailRes = await fetch('http://localhost:3000/posts/11111111-1111-4111-8111-000000000001', {
    headers: { Origin: 'http://localhost:5173' }
  });
  const detailHeader = detailRes.headers.get('x-request-id');
  const detailBody = await detailRes.json();
  assert(detailRes.status === 200, 'Post detail returns 200');
  assert(detailHeader === detailBody.requestId, 'Detail header matches JSON requestId');
  assert(detailBody.item && detailBody.item.media?.length > 0, 'Detail returns item with media');
  assert(detailBody.item.media[0].largeUrl === '/fixtures/desk-1200.jpg', 'Detail media has largeUrl: ' + detailBody.item.media[0].largeUrl);
  assert(!('replyToId' in detailBody.item), 'Post detail DTO does not leak replyToId');

  console.log('\nFINAL STATUS:', allPassed ? 'ALL CHECKS PASSED!' : 'SOME CHECKS FAILED!');
}
verifyAll().catch(console.error);
