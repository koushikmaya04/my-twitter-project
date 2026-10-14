import { randomUUID } from 'node:crypto';
import { inArray } from 'drizzle-orm';
import {
  INestApplication,
  Inject,
  ValidationPipe,
} from '@nestjs/common';
import { DATABASE } from '../src/database/database.provider';
import { SOCIAL_FEED_READ_FAILURE } from '../src/data/repository/social-feed-read-failure.token';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { posts, sessions } from '../src/database/schema';
import { createHash, randomBytes } from 'node:crypto';

import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/errors/http-exception.filter';

describe('Social Feed HTTP API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

  
app = moduleRef.createNestApplication();

app.useGlobalFilters(new HttpExceptionFilter());

app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
);

await app.init();

  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health/live returns 200', async () => {
    const response = await request(app.getHttpServer())
      .get('/health/live')
      .expect(200);

    expect(response.body).toEqual({
      status: 'ok',
    });

    expect(response.headers['x-request-id']).toBeDefined();
  });

  it('GET /feed returns the first page', async () => {
    const response = await request(app.getHttpServer())
      .get('/feed?limit=10')
      .expect(200);

    expect(response.body.items).toHaveLength(10);
    expect(response.body.hasMore).toBe(true);
    expect(response.body.nextCursor).toEqual(
      expect.any(String),
    );

    expect(response.body.items[0]).toHaveProperty('id');
    expect(response.body.items[0]).toHaveProperty(
      'createdAt',
    );
    expect(response.body.items[0]).toHaveProperty(
      'author',
    );
  });

  it('GET /feed continues with the next cursor', async () => {
    const firstPage = await request(app.getHttpServer())
      .get('/feed?limit=10')
      .expect(200);

    const cursor = firstPage.body.nextCursor;

    const secondPage = await request(app.getHttpServer())
      .get(`/feed?limit=10&cursor=${encodeURIComponent(cursor)}`)
      .expect(200);

    const firstIds = firstPage.body.items.map(
      (item: { id: string }) => item.id,
    );

    const secondIds = secondPage.body.items.map(
      (item: { id: string }) => item.id,
    );

    expect(
      secondIds.some((id: string) =>
        firstIds.includes(id),
      ),
    ).toBe(false);

    expect(secondPage.body.items).toHaveLength(10);
    expect(secondPage.body.hasMore).toBe(true);
  });

  it('rejects an invalid limit', async () => {
    const response = await request(app.getHttpServer())
      .get('/feed?limit=0')
      .expect(400);

    expect(response.body.error.code).toBe(
      'VALIDATION_ERROR',
    );

    expect(response.body.error.message).toBe(
      'limit must be an integer from 1 to 50',
    );

    expect(response.body.requestId).toEqual(
      expect.any(String),
    );

    expect(response.headers['x-request-id']).toBe(
      response.body.requestId,
    );
  });

  it('rejects the legacy page parameter', async () => {
    const response = await request(app.getHttpServer())
      .get('/feed?page=1')
      .expect(400);

    expect(response.body.error.code).toBe(
      'VALIDATION_ERROR',
    );

    expect(response.body.requestId).toEqual(
      expect.any(String),
    );
  });

  it('rejects a malformed cursor', async () => {
    const response = await request(app.getHttpServer())
      .get('/feed?cursor=garbage')
      .expect(400);

    expect(response.body.error.code).toBe(
      'VALIDATION_ERROR',
    );

    expect(response.body.requestId).toEqual(
      expect.any(String),
    );
  });

  it('GET /posts/:id returns an existing post', async () => {
    const response = await request(app.getHttpServer())
      .get(
        '/posts/11111111-1111-4111-8111-000000000001',
      )
      .expect(200);

    expect(response.body.item).toHaveProperty(
      'id',
      '11111111-1111-4111-8111-000000000001',
    );

    expect(response.body.item).toHaveProperty(
      'author',
    );

    expect(response.body.item).toHaveProperty(
      'media',
    );
  });

  it('GET /posts/:id returns 404 for a missing post', async () => {
    const response = await request(app.getHttpServer())
      .get(
        '/posts/99999999-9999-4999-8999-999999999999',
      )
      .expect(404);

    expect(response.body.error.code).toBe(
      'NOT_FOUND',
    );

    expect(response.body.requestId).toEqual(
      expect.any(String),
    );
  });

  it('GET /posts/:id returns 400 for a malformed UUID', async () => {
    const response = await request(app.getHttpServer())
      .get('/posts/not-a-uuid')
      .expect(400);

    expect(response.body.error.code).toBe(
      'VALIDATION_ERROR',
    );

    expect(response.body.requestId).toEqual(
      expect.any(String),
    );
  });

  it('GET /users/:id returns an existing user', async () => {
    const response = await request(app.getHttpServer())
      .get(
        '/users/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      )
      .expect(200);

    expect(response.body.item).toHaveProperty(
      'id',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    );

    expect(response.body.item).toHaveProperty(
      'handle',
    );

    expect(response.body.item).toHaveProperty(
      'followerCount',
    );

    expect(response.body.item).toHaveProperty(
      'followingCount',
    );
  });

  it('returns 404 for an unknown route', async () => {
    const response = await request(app.getHttpServer())
      .get('/does-not-exist')
      .expect(404);

    expect(response.body.error.code).toBe(
      'NOT_FOUND',
    );

    expect(response.body.requestId).toEqual(
      expect.any(String),
    );
  });
    it('returns a controlled 503 read failure and succeeds after the override clears', async () => {
    let failReads = true;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SOCIAL_FEED_READ_FAILURE)
      .useValue(() => failReads)
      .compile();

    const failureApp = moduleRef.createNestApplication();

    failureApp.useGlobalFilters(new HttpExceptionFilter());

    await failureApp.init();

    const failedResponse = await request(
      failureApp.getHttpServer(),
    )
      .get('/feed?limit=10')
      .expect(503);

    expect(failedResponse.body.error.code).toBe(
      'SERVICE_UNAVAILABLE',
    );

    expect(failedResponse.body.requestId).toEqual(
      expect.any(String),
    );

    expect(failedResponse.headers['x-request-id']).toBe(
      failedResponse.body.requestId,
    );

    failReads = false;

    const recoveredResponse = await request(
      failureApp.getHttpServer(),
    )
      .get('/feed?limit=10')
      .expect(200);

    expect(recoveredResponse.body.items).toHaveLength(10);

    await failureApp.close();
  });
    it('rejects a non-integer limit', async () => {
    const response = await request(app.getHttpServer())
      .get('/feed?limit=1.5')
      .expect(400);

    expect(response.body.error.code).toBe(
      'VALIDATION_ERROR',
    );

    expect(response.body.requestId).toEqual(
      expect.any(String),
    );
  });

  it('rejects a limit above the maximum', async () => {
    const response = await request(app.getHttpServer())
      .get('/feed?limit=51')
      .expect(400);

    expect(response.body.error.code).toBe(
      'VALIDATION_ERROR',
    );

    expect(response.body.requestId).toEqual(
      expect.any(String),
    );
  });

  it('rejects a repeated limit parameter', async () => {
    const response = await request(app.getHttpServer())
      .get('/feed?limit=10&limit=20')
      .expect(400);

    expect(response.body.error.code).toBe(
      'VALIDATION_ERROR',
    );

    expect(response.body.requestId).toEqual(
      expect.any(String),
    );
  });
    
it('does not skip or duplicate posts when timestamps are tied', async () => {
  const db = app.get(DATABASE) as any;

  const [lowerId, higherId] = [
    randomUUID(),
    randomUUID(),
  ].sort();

  const testPostIds = [lowerId, higherId];

  // Both posts will have exactly the same timestamp.
  // A future timestamp ensures they appear at the top of the feed.
  const tiedTimestamp = new Date('2099-01-01T10:00:00.000Z');

  try {
    await db.insert(posts).values([
      {
        id: lowerId,
        authorId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        kind: 'original',
        text: 'Pagination tie test - lower ID',
        createdAt: tiedTimestamp,
        replyToId: null,
        repostOfId: null,
      },
      {
        id: higherId,
        authorId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        kind: 'original',
        text: 'Pagination tie test - higher ID',
        createdAt: tiedTimestamp,
        replyToId: null,
        repostOfId: null,
      },
    ]);

    const firstPage = await request(app.getHttpServer())
      .get('/feed?limit=1')
      .expect(200);

    expect(firstPage.body.items).toHaveLength(1);
    expect(firstPage.body.items[0].id).toBe(higherId);
    expect(firstPage.body.nextCursor).toEqual(
      expect.any(String),
    );

    const secondPage = await request(app.getHttpServer())
      .get(
        `/feed?limit=1&cursor=${encodeURIComponent(
          firstPage.body.nextCursor,
        )}`,
      )
      .expect(200);

    expect(secondPage.body.items).toHaveLength(1);
    expect(secondPage.body.items[0].id).toBe(lowerId);

    expect(secondPage.body.items[0].id).not.toBe(
      firstPage.body.items[0].id,
    );

    expect(secondPage.body.items[0].createdAt).toBe(
      firstPage.body.items[0].createdAt,
    );
  } finally {
    // Remove only the two posts created by this test.
    await db
      .delete(posts)
      .where(inArray(posts.id, testPostIds));
  }
});

  
it('returns three pages without duplicates or skipped posts', async () => {
  const page1 = await request(app.getHttpServer())
    .get('/feed?limit=10')
    .expect(200);

  expect(page1.body.items).toHaveLength(10);
  expect(page1.body.hasMore).toBe(true);
  expect(page1.body.nextCursor).toEqual(expect.any(String));

  const page2 = await request(app.getHttpServer())
    .get(
      `/feed?limit=10&cursor=${encodeURIComponent(
        page1.body.nextCursor,
      )}`,
    )
    .expect(200);

  expect(page2.body.items).toHaveLength(10);
  expect(page2.body.hasMore).toBe(true);
  expect(page2.body.nextCursor).toEqual(expect.any(String));

  const page3 = await request(app.getHttpServer())
    .get(
      `/feed?limit=10&cursor=${encodeURIComponent(
        page2.body.nextCursor,
      )}`,
    )
    .expect(200);

  expect(page3.body.items).toHaveLength(10);

  const ids = [
    ...page1.body.items,
    ...page2.body.items,
    ...page3.body.items,
  ].map((item: { id: string }) => item.id);

  expect(ids).toHaveLength(30);
  expect(new Set(ids).size).toBe(30);

  // With 32 original posts, two posts should remain.
  expect(page3.body.hasMore).toBe(true);
  expect(page3.body.nextCursor).toEqual(expect.any(String));
});

  
    it('handles delayed feed requests without blocking health checks', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        AppModule,
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              simulatedIoMs: 200,
            }),
          ],
        }),
      ],
    }).compile();

    const delayedApp = moduleRef.createNestApplication();

    delayedApp.useGlobalFilters(new HttpExceptionFilter());

    await delayedApp.init();

    const feedStartedAt = Date.now();

    const feedRequest = request(delayedApp.getHttpServer())
      .get('/feed?limit=10');

    await new Promise((resolve) =>
      setTimeout(resolve, 20),
    );

    const healthStartedAt = Date.now();

    await request(delayedApp.getHttpServer())
      .get('/health/live')
      .expect(200);

    const healthDuration = Date.now() - healthStartedAt;

    const feedResponse = await feedRequest.expect(200);

    const feedDuration = Date.now() - feedStartedAt;

    expect(feedResponse.body.items).toHaveLength(10);

    expect(healthDuration).toBeLessThan(100);
    expect(feedDuration).toBeGreaterThanOrEqual(200);

    await delayedApp.close();
  });


  describe('Authentication HTTP API', () => {
    const handle = `auth_test_${Date.now()}`;
    const password = 'SecurePass123!';

    it('rejects access to the current-account endpoint without a session', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);

      expect(response.body.error).toBeDefined();
      expect(response.body.requestId).toEqual(
        expect.any(String),
      );
    });
    
it('rejects an invalid session cookie', async () => {
  const response = await request(app.getHttpServer())
    .get('/auth/me')
    .set('Cookie', 'session=not-a-valid-session-token')
    .expect(401);

  expect(response.body.error).toBeDefined();
  expect(response.body.requestId).toEqual(
    expect.any(String),
  );
});


    it('registers an account without exposing credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          handle,
          displayName: 'Authentication Test',
          password,
        })
        .expect(201);

      expect(response.body.item.handle).toBe(handle);
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('rejects duplicate handles regardless of letter case', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          handle: handle.toUpperCase(),
          displayName: 'Duplicate Account',
          password,
        })
        .expect(409);

      expect(response.body.error).toBeDefined();
      expect(response.body.requestId).toEqual(
        expect.any(String),
      );
    });

    
it('creates only one account for 20 concurrent registrations of the same normalized handle', async () => {
  const sharedHandle = `race_${Date.now()}`;

  const responses = await Promise.all(
    Array.from({ length: 20 }, (_, index) => {
      const submittedHandle =
        index % 2 === 0
          ? sharedHandle
          : `  ${sharedHandle.toUpperCase()}  `;

      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          handle: submittedHandle,
          displayName: `Concurrent Test ${index}`,
          password: 'SecurePass123!',
        });
    }),
  );

  const created = responses.filter(
    (response) => response.status === 201,
  );

  const conflicts = responses.filter(
    (response) => response.status === 409,
  );

  expect(created).toHaveLength(1);
  expect(conflicts).toHaveLength(19);

  for (const response of responses) {
    expect(response.body).not.toHaveProperty('password');
    expect(response.body).not.toHaveProperty('passwordHash');
  }
});

  
it('rejects an expired session cookie', async () => {
  const db = app.get(DATABASE) as any;

  // Create a test account.
  const register = await request(app.getHttpServer())
    .post('/auth/register')
    .send({
      handle: `expired_test_${Date.now()}`,
      displayName: 'Expired Session Test',
      password: 'SecurePass123!',
    })
    .expect(201);

  const userId = register.body.item.id;

  // Generate a raw token, then store only its SHA-256 hash.
  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256')
    .update(token)
    .digest('hex');

  await db.insert(sessions).values({
    tokenHash,
    userId,
    expiresAt: new Date(Date.now() - 60_000),
  });

  // The session expired one minute ago.
  const response = await request(app.getHttpServer())
    .get('/auth/me')
    .set('Cookie', `session=${token}`)
    .expect(401);

  expect(response.body.error).toBeDefined();
  expect(response.body.requestId).toEqual(
    expect.any(String),
  );
});


    it('logs in, identifies the session account, and revokes the session on logout', async () => {
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ handle, password })
        .expect(200);

   
const cookies = login.headers['set-cookie'];

expect(cookies).toBeDefined();

const cookieList = Array.isArray(cookies)
  ? cookies
  : [cookies];

const sessionCookie = cookieList.find(
  (cookie) => cookie.startsWith('session='),
);

expect(sessionCookie).toBeDefined();

      expect(sessionCookie).toBeDefined();
      expect(sessionCookie).toContain('HttpOnly');

      const cookie = sessionCookie!.split(';')[0];

      const currentAccount = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', cookie)
        .expect(200);

      expect(currentAccount.body.item.handle).toBe(handle);

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', cookie)
        .expect(200);

      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', cookie)
        .expect(401);
    });

   
    it('rejects incorrect credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          handle,
          password: 'WrongPassword123!',
        })
        .expect(401);
    });
  });

  describe('Profile HTTP API', () => {
    it('rejects profile updates without a session', async () => {
      const response = await request(app.getHttpServer())
        .patch('/users/me')
        .send({
          displayName: 'Unauthorized Update',
          bio: 'This should not be saved',
        })
        .expect(401);

      expect(response.body.error).toBeDefined();
      expect(response.body.requestId).toEqual(
        expect.any(String),
      );
    });
    
    it('updates the authenticated user profile', async () => {
      const handle = `profile_test_${Date.now()}`;
      const password = 'SecurePass123!';

      // Register a dedicated test account.
      const register = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          handle,
          displayName: 'Original Name',
          password,
        })
        .expect(201);

      const userId = register.body.item.id;

      // Log in to obtain a valid session cookie.
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ handle, password })
        .expect(200);

      const cookies = login.headers['set-cookie'];
      const cookieList = Array.isArray(cookies)
        ? cookies
        : [cookies];

      const sessionCookie = cookieList.find(
        (cookie) => cookie.startsWith('session='),
      );

      expect(sessionCookie).toBeDefined();

      const cookie = sessionCookie!.split(';')[0];

      // Update the profile using the authenticated session.
      const response = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Cookie', cookie)
        .send({
          displayName: 'Updated Name',
          bio: 'Learning NestJS and PostgreSQL',
        })
        .expect(200);

      expect(response.body.item.id).toBe(userId);
      expect(response.body.item.handle).toBe(handle);
      expect(response.body.item.displayName).toBe('Updated Name');
      expect(response.body.item.bio).toBe(
        'Learning NestJS and PostgreSQL',
      );

      // Verify the update persists when the profile is fetched again.
      const profile = await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .expect(200);

      expect(profile.body.item.displayName).toBe('Updated Name');
      expect(profile.body.item.bio).toBe(
        'Learning NestJS and PostgreSQL',
      );
    });
    
it('rejects attempts to change the immutable handle', async () => {
  const handle = `immutable_test_${Date.now()}`;
  const password = 'SecurePass123!';

  await request(app.getHttpServer())
    .post('/auth/register')
    .send({
      handle,
      displayName: 'Immutable Test',
      password,
    })
    .expect(201);

  const login = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ handle, password })
    .expect(200);

  const cookies = login.headers['set-cookie'];
  const cookieList = Array.isArray(cookies)
    ? cookies
    : [cookies];

  const sessionCookie = cookieList.find(
    (cookie) => cookie.startsWith('session='),
  );

  expect(sessionCookie).toBeDefined();

  const cookie = sessionCookie!.split(';')[0];

  const response = await request(app.getHttpServer())
    .patch('/users/me')
    .set('Cookie', cookie)
    .send({
      handle: 'changed_handle',
    })
    .expect(400);

  expect(response.body.error).toBeDefined();
});

it('rejects a display name longer than 80 characters', async () => {
  const handle = `display_limit_${Date.now()}`;
  const password = 'SecurePass123!';

  await request(app.getHttpServer())
    .post('/auth/register')
    .send({
      handle,
      displayName: 'Valid Name',
      password,
    })
    .expect(201);

  const login = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ handle, password })
    .expect(200);

  const cookies = login.headers['set-cookie'];
  const cookieList = Array.isArray(cookies)
    ? cookies
    : [cookies];

  const sessionCookie = cookieList.find(
    (cookie) => cookie.startsWith('session='),
  );

  expect(sessionCookie).toBeDefined();

  const cookie = sessionCookie!.split(';')[0];

  await request(app.getHttpServer())
    .patch('/users/me')
    .set('Cookie', cookie)
    .send({
      displayName: 'A'.repeat(81),
    })
    .expect(400);
});

it('rejects a bio longer than 160 characters', async () => {
  const handle = `bio_limit_${Date.now()}`;
  const password = 'SecurePass123!';

  await request(app.getHttpServer())
    .post('/auth/register')
    .send({
      handle,
      displayName: 'Bio Limit Test',
      password,
    })
    .expect(201);

  const login = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ handle, password })
    .expect(200);

  const cookies = login.headers['set-cookie'];
  const cookieList = Array.isArray(cookies)
    ? cookies
    : [cookies];

  const sessionCookie = cookieList.find(
    (cookie) => cookie.startsWith('session='),
  );

  expect(sessionCookie).toBeDefined();

  const cookie = sessionCookie!.split(';')[0];

  await request(app.getHttpServer())
    .patch('/users/me')
    .set('Cookie', cookie)
    .send({
      bio: 'B'.repeat(161),
    })
    .expect(400);
});

it('trims whitespace from the display name', async () => {
  const handle = `trim_name_${Date.now()}`;
  const password = 'SecurePass123!';

  await request(app.getHttpServer())
    .post('/auth/register')
    .send({ handle, displayName: 'Original', password })
    .expect(201);

  const login = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ handle, password })
    .expect(200);

  const cookies = login.headers['set-cookie'];
  const cookieList = Array.isArray(cookies) ? cookies : [cookies];
  const sessionCookie = cookieList.find((c) => c.startsWith('session='));

  expect(sessionCookie).toBeDefined();
  const cookie = sessionCookie!.split(';')[0];

  const response = await request(app.getHttpServer())
    .patch('/users/me')
    .set('Cookie', cookie)
    .send({ displayName: '  Maya  ' })
    .expect(200);

  expect(response.body.item.displayName).toBe('Maya');
});

it('rejects a display name that becomes empty after trimming', async () => {
  const handle = `empty_name_${Date.now()}`;
  const password = 'SecurePass123!';

  await request(app.getHttpServer())
    .post('/auth/register')
    .send({ handle, displayName: 'Original', password })
    .expect(201);

  const login = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ handle, password })
    .expect(200);

  const cookies = login.headers['set-cookie'];
  const cookieList = Array.isArray(cookies) ? cookies : [cookies];
  const sessionCookie = cookieList.find((c) => c.startsWith('session='));

  expect(sessionCookie).toBeDefined();
  const cookie = sessionCookie!.split(';')[0];

  await request(app.getHttpServer())
    .patch('/users/me')
    .set('Cookie', cookie)
    .send({ displayName: '   ' })
    .expect(400);
});




  });
});
