# Social Feed Backend

NestJS backend for the Social Feed / Twitter clone assignment.

This project implements the Stage A server foundation described in PRD 01. It provides a fixture-backed social feed API with cursor pagination, users, posts, validation, request IDs, structured errors, configurable simulated I/O, and automated tests.

## Project Structure

```text
BACKEND/
├── Labs/
│   └── raw-http-server/
│       ├── package.json
│       ├── server.js
│       └── request-lifecycle.md
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── config/
│   ├── common/
│   ├── health/
│   ├── users/
│   ├── posts/
│   ├── feed/
│   └── data/
├── test/
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
├── .env.example
├── package.json
├── package-lock.json
└── tsconfig files
```

## Requirements

- Node.js LTS
- npm
- NestJS 12
- TypeScript

## Installation

From the `BACKEND` directory:

```bash
npm install
```

## Environment Configuration

Create a `.env` file based on `.env.example`.

```env
PORT=3000
FRONTEND_ORIGIN=http://localhost:5173
DEMO_USER_ID=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa
SIMULATED_IO_MS=0
```

| Variable | Description | Default |
|---|---|---|
| `PORT` | Port used by the backend | `3000` |
| `FRONTEND_ORIGIN` | Allowed frontend origin for CORS | `http://localhost:5173` |
| `DEMO_USER_ID` | Fixture user used as the demo viewer identity | seeded demo user |
| `SIMULATED_IO_MS` | Non-blocking simulated repository delay | `0` |

`SIMULATED_IO_MS` must be between `0` and `1000`.

## Running the Backend

Development:

```bash
npm run start:dev
```

Normal mode:

```bash
npm run start
```

Production:

```bash
npm run build
npm run start:prod
```

The API runs at:

```text
http://localhost:3000
```

# API

## Health

### GET /health/live

```http
GET http://localhost:3000/health/live
```

Response:

```json
{
  "status": "ok"
}
```

## Feed

### GET /feed

Returns original posts ordered by:

1. `createdAt` descending
2. post ID descending when timestamps are equal

Default page size is `10`.

```http
GET http://localhost:3000/feed
```

or:

```http
GET http://localhost:3000/feed?limit=10
```

Response shape:

```json
{
  "items": [],
  "nextCursor": "...",
  "hasMore": true
}
```

## Cursor Pagination

Use `nextCursor` from a response to request the next page:

```http
GET /feed?limit=10&cursor=<nextCursor>
```

The cursor contains the timestamp and ID of the last item from the previous page.

Legacy page-based pagination is not supported:

```http
GET /feed?page=1
```

returns a structured validation error.

## Feed Query Validation

Supported query parameters:

```text
cursor
limit
```

`limit` must be an integer from `1` to `50`.

Invalid examples:

```http
GET /feed?limit=0
GET /feed?limit=1.5
GET /feed?limit=51
GET /feed?limit=abc
```

Repeated parameters and unknown query parameters are rejected.

## Posts

### GET /posts/:id

Returns a post by UUID.

```http
GET http://localhost:3000/posts/11111111-1111-4111-8111-000000000001
```

Malformed UUIDs return `400`.

A valid UUID that does not exist returns `404`.

## Users

### GET /users/:id

Returns a user profile by UUID.

```http
GET http://localhost:3000/users/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa
```

The response contains the user's ID, handle, display name, bio, avatar metadata, post count, follower count, and following count.

# Error Responses

API errors use a consistent envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "limit must be an integer from 1 to 50",
    "details": [
      {
        "field": "limit",
        "reason": "out_of_range"
      }
    ]
  },
  "requestId": "opaque-request-id"
}
```

Supported error codes include:

```text
VALIDATION_ERROR
NOT_FOUND
CONFLICT
SERVICE_UNAVAILABLE
INTERNAL_ERROR
```

# Request IDs

Every request receives a unique request ID.

It is returned through:

```text
X-Request-Id
```

The same request ID is included in structured error responses.

Request logs contain:

- HTTP method
- request path
- response status
- duration
- request ID

Request bodies and secrets are not logged.

# CORS

CORS is enabled only for the configured frontend origin.

Default:

```env
FRONTEND_ORIGIN=http://localhost:5173
```

CORS is not authentication.

# Fixture Data

The repository uses deterministic in-memory fixture data.

The fixtures include:

- 6 users
- 30 original posts
- 12 replies
- 4 reposts
- 10 media records
- 15 likes
- 8 follows

The fixtures include pagination and relationship cases such as:

- two posts with the same timestamp
- a user without media
- an original with no reactions
- a liked original
- multiple feed pages

IDs and timestamps are fixed so tests remain deterministic.

# Repository Boundary

Product logic is separated from fixture storage through the `SocialFeedRepository` interface.

The fixture implementation is:

```text
FixtureSocialFeedRepository
```

The repository is injected through:

```text
SOCIAL_FEED_REPOSITORY
```

This allows the repository implementation to be replaced by a fake repository in tests.

# Simulated I/O

The fixture repository supports configurable non-blocking latency:

```env
SIMULATED_IO_MS=200
```

The implementation uses an asynchronous timer and does not block the Node.js event loop with synchronous sleep.

The value must be:

```text
0 <= SIMULATED_IO_MS <= 1000
```

# Frontend Integration

The existing React frontend runs on:

```text
http://localhost:5173
```

The frontend API adapter calls:

```text
http://localhost:3000
```

Feed pagination uses:

```text
cursor -> nextCursor -> nextCursor
```

The frontend converts API posts into the existing Tweet model and deduplicates posts by ID when appending pages.

The existing Intersection Observer continues to control infinite scrolling.

# Testing

## Unit tests

```bash
npm test
```

The feed service has a unit test using a fake repository.

## End-to-end tests

```bash
npm run test:e2e
```

The E2E suite verifies:

- health endpoint
- feed response
- cursor continuation
- duplicate prevention
- invalid limits
- legacy `page` rejection
- malformed cursor handling
- existing posts
- missing posts
- malformed UUIDs
- existing users
- unknown routes

## Lint

```bash
npm run lint
```

## Format

```bash
npm run format
```

## Build

```bash
npm run build
```

# Raw Node.js Lab

The original Node.js HTTP exercise is preserved under:

```text
Labs/raw-http-server/
```

Files:

```text
Labs/raw-http-server/
├── package.json
├── server.js
└── request-lifecycle.md
```

The raw server demonstrates:

- Node's built-in HTTP server
- request routing
- JSON responses
- asynchronous delay
- non-blocking behavior
- concurrent request handling

The NestJS application is the Stage A server implementation, while the raw server remains as the prerequisite Node.js lab.

# Sample Requests

Health:

```bash
curl http://localhost:3000/health/live
```

First feed page:

```bash
curl "http://localhost:3000/feed?limit=10"
```

Next feed page:

```bash
curl "http://localhost:3000/feed?limit=10&cursor=<NEXT_CURSOR>"
```

Post:

```bash
curl http://localhost:3000/posts/11111111-1111-4111-8111-000000000001
```

User:

```bash
curl http://localhost:3000/users/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa
```

# Known Limitations

- Stage A uses deterministic in-memory fixtures instead of a persistent database.
- Authentication is not implemented in Stage A.
- The API focuses on the required read endpoints.
- Media URLs are fixture paths and require appropriate static serving if actual image rendering is needed.
- OpenAPI documentation is not required for the Stage A acceptance gate.

# Stage A Status

The current implementation provides:

- Raw Node.js HTTP lab
- NestJS server scaffold
- Fixture-backed repository
- Repository dependency injection
- Health endpoint
- Feed endpoint
- Post endpoint
- User endpoint
- Cursor pagination
- Query validation
- UUID validation
- Structured error responses
- Request IDs
- Request logging
- Configurable CORS
- Configurable simulated I/O
- Unit testing
- E2E testing
- Frontend cursor-pagination integration
