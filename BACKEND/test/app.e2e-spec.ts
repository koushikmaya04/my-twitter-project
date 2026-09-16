import { SOCIAL_FEED_READ_FAILURE } from '../src/data/repository/social-feed-read-failure.token';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';

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
    const firstPage = await request(app.getHttpServer())
      .get('/feed?limit=1')
      .expect(200);

    expect(firstPage.body.items).toHaveLength(1);
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

    const firstId = firstPage.body.items[0].id;
    const secondId = secondPage.body.items[0].id;

    expect(secondId).not.toBe(firstId);

    expect(secondPage.body.items[0].createdAt).toBe(
      firstPage.body.items[0].createdAt,
    );
  });
    it('returns three pages without duplicates or skipped posts', async () => {
    const page1 = await request(app.getHttpServer())
      .get('/feed?limit=10')
      .expect(200);

    const page2 = await request(app.getHttpServer())
      .get(
        `/feed?limit=10&cursor=${encodeURIComponent(
          page1.body.nextCursor,
        )}`,
      )
      .expect(200);

    const page3 = await request(app.getHttpServer())
      .get(
        `/feed?limit=10&cursor=${encodeURIComponent(
          page2.body.nextCursor,
        )}`,
      )
      .expect(200);

    const ids = [
      ...page1.body.items,
      ...page2.body.items,
      ...page3.body.items,
    ].map((item: { id: string }) => item.id);

    expect(ids).toHaveLength(30);
    expect(new Set(ids).size).toBe(30);

    expect(page1.body.hasMore).toBe(true);
    expect(page2.body.hasMore).toBe(true);
    expect(page3.body.hasMore).toBe(false);
    expect(page3.body.nextCursor).toBeNull();
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
});