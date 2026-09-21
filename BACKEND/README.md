# Social Feed Backend

A NestJS backend for a Twitter-style social feed application.

This branch, `intern/koushik/social-persistence`, adds the PostgreSQL persistence layer using **Drizzle ORM** while preserving the existing repository contract and application structure.

## Tech Stack

- **Node.js**
- **TypeScript**
- **NestJS**
- **PostgreSQL**
- **Drizzle ORM**
- **Drizzle Kit**
- **Jest**
- **Supertest**
- **pg**
- **Oxlint**
- **Prettier**

## Project Structure

```text
BACKEND/
├── db/
│   ├── schema.sql
│   ├── seed.sql
│   ├── queries.sql
│   ├── constraint-tests.sql
│   └── transaction-tests.sql
│
├── drizzle/
│   ├── 0000_flimsy_loki.sql
│   └── meta/
│
├── docs/
│   ├── data-dictionary.md
│   ├── db-seed-manifest.md
│   ├── decisions.md
│   ├── erd.md
│   ├── query-plan-report.md
│   └── sql-mapping.md
│
├── src/
│   ├── common/
│   ├── config/
│   ├── data/
│   │   ├── fixtures/
│   │   └── repository/
│   ├── database/
│   │   ├── schema/
│   │   ├── database.module.ts
│   │   ├── database.provider.ts
│   │   └── seed.ts
│   ├── feed/
│   ├── health/
│   ├── posts/
│   ├── search/
│   ├── users/
│   ├── app.module.ts
│   └── main.ts
│
├── test/
│   ├── app.e2e-spec.ts
│   ├── social-feed.integration.spec.ts
│   └── jest-e2e.json
│
├── .env.example
├── drizzle.config.ts
├── package.json
└── package-lock.json
```

## Architecture

The backend follows a repository-based architecture.

```text
Controller
    ↓
Service
    ↓
SocialFeedRepository contract
    ↓
DrizzleSocialFeedRepository
    ↓
Drizzle ORM
    ↓
PostgreSQL
```

The repository interface defines what the application needs from persistence, while `DrizzleSocialFeedRepository` provides the actual PostgreSQL implementation.

This keeps business/application code independent from the database implementation.

A repository token is used for NestJS dependency injection:

```ts
export const SOCIAL_FEED_REPOSITORY =
  Symbol('SOCIAL_FEED_REPOSITORY');
```

The current production provider is:

```ts
{
  provide: SOCIAL_FEED_REPOSITORY,
  useClass: DrizzleSocialFeedRepository,
}
```

The earlier fixture repository remains in the codebase and implements the same contract.

## Database Layer

The database layer is implemented in:

```text
src/database/
```

### Database Provider

`database.provider.ts` creates the PostgreSQL connection pool and the Drizzle database instance.

```ts
const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 5000,
});

const db = drizzle({ client: pool });
```

The database is exposed through a NestJS dependency-injection token:

```ts
export const DATABASE = Symbol('DATABASE');
```

Repositories can then inject the shared database instance instead of creating their own connection.

The database provider also closes the PostgreSQL pool during application shutdown.

### Database Module

`database.module.ts` is marked as global:

```ts
@Global()
@Module({
  providers: [databaseProvider],
  exports: [databaseProvider],
})
export class DatabaseModule {}
```

This makes the database provider available throughout the application.

## Database Schema

The Drizzle schema is located in:

```text
src/database/schema/
```

The schema is split into separate files:

```text
users.ts
posts.ts
post-media.ts
likes.ts
follows.ts
index.ts
```

The main entities are:

- **users**
- **posts**
- **post_media**
- **likes**
- **follows**

### Users

Stores user identity information such as:

- UUID
- handle
- display name

### Posts

Supports:

- original posts
- replies
- reposts

A post can reference another post through:

```text
reply_to_id
repost_of_id
```

### Post Media

Stores media associated with posts.

Each media record contains:

- UUID
- post ID
- position
- alt text
- width
- height
- small URL
- large URL

### Likes

Represents the relationship between a user and a post.

The database prevents duplicate user/post like combinations.

### Follows

Represents the relationship between follower and following users.

The schema also enforces relationship constraints.

## Drizzle Configuration

`drizzle.config.ts` configures Drizzle Kit.

Drizzle Kit:

1. reads the TypeScript schema
2. generates SQL migrations
3. stores generated migrations in `drizzle/`
4. connects to PostgreSQL using `DATABASE_URL`

## Environment Variables

Create a `.env` file inside `BACKEND/`.

Example:

```env
PORT=3000
FRONTEND_ORIGIN=http://localhost:5173

DEMO_USER_ID=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa

DATABASE_URL=postgresql://postgres:password@localhost:5432/social_feed_dev

DATABASE_CONNECT_TIMEOUT_MS=5000

SIMULATED_IO_MS=0
```

| Variable | Purpose |
|---|---|
| `PORT` | Backend HTTP port |
| `FRONTEND_ORIGIN` | Allowed frontend origin for CORS |
| `DEMO_USER_ID` | Default/demo viewer ID |
| `DATABASE_URL` | PostgreSQL connection string |
| `DATABASE_CONNECT_TIMEOUT_MS` | PostgreSQL connection timeout |
| `SIMULATED_IO_MS` | Optional artificial repository delay |

Do not commit `.env`.

Use `.env.example` as the template.

## Installation

```bash
git clone https://github.com/koushikmaya04/my-twitter-project.git

cd my-twitter-project/BACKEND

npm install
```

Create the environment file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Update `DATABASE_URL` with your PostgreSQL credentials.

## PostgreSQL Setup

Create a PostgreSQL database:

```sql
CREATE DATABASE social_feed_dev;
```

Make sure PostgreSQL is running before performing migrations.

Example connection string:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/social_feed_dev
```

## Database Workflow

The intended database workflow is:

```text
Drizzle schema
      ↓
Generate migration
      ↓
Apply migration
      ↓
Seed database
      ↓
Run application
```

### Generate Migration

```bash
npm run db:generate
```

This generates SQL migration files inside:

```text
drizzle/
```

### Apply Migration

```bash
npm run db:migrate
```

This creates or updates the PostgreSQL schema.

### Check Migration State

```bash
npm run db:check
```

## Database Seeding

The seed script is:

```text
src/database/seed.ts
```

Run it with:

```bash
npm run db:seed
```

The seed script loads the existing fixture data:

```text
src/data/fixtures/fixture-data.ts
```

and inserts it into PostgreSQL.

The seed process inserts:

- users
- posts
- post media
- likes
- follows

Before inserting, the seed script deletes existing data in dependency-safe order:

```text
likes
post_media
follows
posts
users
```

This makes seeding deterministic and repeatable during development.

### Important

Database migration and database seeding are different operations.

**Migration:**

```text
Creates/changes database structure
```

**Seed:**

```text
Inserts development/test data
```

Running the application does not automatically run the seed script.

## Repository Layer

The repository contract is defined in:

```text
src/data/repository/social-feed.repository.ts
```

It defines operations including:

```text
listOriginalFeed()
getPostById()
getUserById()
listReplies()
listProfileMedia()
searchOriginals()
createPost()
setLike()
```

The concrete PostgreSQL implementation is:

```text
src/data/repository/drizzle-social-feed.repository.ts
```

## Drizzle Repository

`DrizzleSocialFeedRepository` translates application operations into database queries.

It handles:

- feed queries
- post lookup
- reply lookup
- profile media
- search
- likes
- post creation
- repost validation
- database transactions
- cursor pagination
- batch hydration
- PostgreSQL error handling

## Cursor Pagination

Feed-style list endpoints use cursor pagination instead of offset pagination.

The cursor is based on:

```text
(created_at, id)
```

The ordering is:

```sql
ORDER BY created_at DESC, id DESC
```

The repository requests:

```text
limit + 1
```

rows.

For a requested limit of `10`, 11 rows are fetched. The 11th row determines whether another page exists.

The response contains:

```json
{
  "items": [],
  "hasMore": true,
  "nextCursor": "..."
}
```

The cursor is encoded as base64url JSON containing:

```json
{
  "v": 1,
  "createdAt": "...",
  "id": "..."
}
```

This provides deterministic pagination even when multiple posts have identical timestamps.

## Batch Hydration

The repository avoids performing one database query per post.

A page of posts is hydrated with bounded batch queries for:

- media
- like counts
- reply counts
- viewer like state

The results are grouped in memory using `Map` and `Set`.

Conceptually:

```text
Fetch page
   ↓
Get post IDs
   ↓
Batch media query
   ↓
Batch like-count query
   ↓
Batch reply-count query
   ↓
Batch viewer-like query
   ↓
Combine results
```

This avoids the classic N+1 query pattern.

## Search

Original posts can be searched using PostgreSQL `ILIKE`.

The search implementation:

- limits input to 200 characters
- escapes `\`
- escapes `%`
- escapes `_`
- uses parameterized SQL
- supports cursor pagination

This prevents `%` and `_` from unintentionally acting as wildcard characters in user input.

## Creating Posts

`createPost()` supports:

```text
original
reply
repost
```

### Replies

A reply must have:

```text
replyToId
```

The target post must exist.

Replies to reposts are rejected.

### Reposts

A repost must have:

```text
repostOfId
```

The target must exist and must be an original post.

The database also prevents duplicate reposts by the same user for the same target.

PostgreSQL unique-constraint errors are mapped to:

```text
409 Conflict
```

## Transactions

Post creation uses a database transaction:

```ts
this.db.transaction(async (tx) => {
  // validation
  // insert
  // reload created post
});
```

This ensures the validation and write happen within one transactional boundary.

The transaction executor is also passed to `getPostById()` so the newly created post can be loaded using the same transaction.

## Likes

Likes are stored in the `likes` relation rather than as a mutable counter column.

When a user likes a post:

```text
INSERT INTO likes
```

When a user unlikes:

```text
DELETE FROM likes
```

The implementation uses:

```ts
.onConflictDoNothing({
  target: [likes.userId, likes.postId],
});
```

This makes repeated "like" requests idempotent.

The current like count is calculated from the `likes` table.

## Health Checks

Two health endpoints are available.

### Liveness

```http
GET /health/live
```

Response:

```json
{
  "status": "ok"
}
```

This verifies that the application process is running.

### Readiness

```http
GET /health/ready
```

The readiness check executes:

```sql
SELECT 1
```

against PostgreSQL.

Successful response:

```json
{
  "status": "ok",
  "database": "ok"
}
```

If the database cannot be reached, the endpoint returns a service-unavailable response.

## Request IDs and Logging

The application adds request IDs to incoming requests.

A request ID is generated for each request and exposed using the:

```text
X-Request-Id
```

response header.

Request logging also records:

- HTTP method
- request URL
- status code
- request duration
- request ID

This makes individual requests easier to trace during development and debugging.

## Error Handling

Domain errors are defined in:

```text
src/common/errors/domain-errors.ts
```

The main errors are:

| Error | HTTP Status | Meaning |
|---|---:|---|
| `NotFoundDomainError` | 404 | Requested resource does not exist |
| `InvalidTargetError` | 422 | Operation references an invalid target |
| `ConflictDomainError` | 409 | Operation conflicts with existing state |

A global exception filter converts application errors into HTTP responses.

## Testing

The backend contains unit, integration, and e2e testing infrastructure.

### Unit / Integration Tests

```bash
npm test
```

### Watch Mode

```bash
npm run test:watch
```

### Coverage

```bash
npm run test:cov
```

### End-to-End Tests

```bash
npm run test:e2e
```

The repository includes:

```text
test/app.e2e-spec.ts
test/social-feed.integration.spec.ts
```

The integration tests exercise the persistence layer against the database-backed implementation.

## Useful Commands

### Start in development mode

```bash
npm run start:dev
```

### Start normally

```bash
npm start
```

### Build

```bash
npm run build
```

### Run production build

```bash
npm run start:prod
```

### Lint

```bash
npm run lint
```

### Format

```bash
npm run format
```

### Database commands

```bash
npm run db:generate
npm run db:migrate
npm run db:check
npm run db:seed
```

## Recommended First-Time Setup

```bash
cd BACKEND

npm install

cp .env.example .env

# Configure PostgreSQL in .env

npm run db:generate
npm run db:migrate
npm run db:seed

npm run start:dev
```

Then verify the backend:

```bash
curl http://localhost:3000/health/live
```

and:

```bash
curl http://localhost:3000/health/ready
```

## Database Documentation

Additional database documentation is available under:

```text
docs/
```

Important references include:

- `docs/erd.md` — entity relationship model
- `docs/data-dictionary.md` — database field definitions
- `docs/decisions.md` — database design decisions
- `docs/query-plan-report.md` — query/index planning
- `docs/sql-mapping.md` — mapping between PRD SQL queries and repository implementation
- `docs/db-seed-manifest.md` — seed dataset documentation

The raw SQL used during database modeling and verification is in:

```text
db/schema.sql
db/seed.sql
db/queries.sql
db/constraint-tests.sql
db/transaction-tests.sql
```

## Development Notes

This branch deliberately keeps the `SocialFeedRepository` interface separate from its implementation.

This allows:

```text
Application code
      ↓
Repository contract
      ↓
Fixture repository
```

or:

```text
Application code
      ↓
Repository contract
      ↓
Drizzle repository
      ↓
PostgreSQL
```

without changing the consumers of the repository.

The fixture data remains useful for deterministic development and testing, while `DrizzleSocialFeedRepository` provides the persistent database-backed implementation.

## Branch

Current implementation branch:

```text
intern/koushik/social-persistence
```

Repository:

https://github.com/koushikmaya04/my-twitter-project
