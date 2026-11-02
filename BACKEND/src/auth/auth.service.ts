import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
  NotFoundException,
   BadRequestException,
} from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import * as argon2 from 'argon2';
import { and, desc, eq, gt, isNull, ne } from 'drizzle-orm';

import { DATABASE } from '../database/database.provider';
import { sessions, users } from '../database/schema';

@Injectable()
export class AuthService {
  constructor(@Inject(DATABASE) private readonly db: any) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private readSessionToken(cookieHeader?: string): string | undefined {
    const cookie = cookieHeader
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('session='));

    return cookie?.slice('session='.length) || undefined;
  }

private validateObjectInput(
  input: unknown,
  allowedFields: string[],
): Record<string, unknown> {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input)
  ) {
    throw new BadRequestException(
      'Request body must be a JSON object',
    );
  }

  const body = input as Record<string, unknown>;

  if (Object.keys(body).some(
    (key) => !allowedFields.includes(key),
  )) {
    throw new BadRequestException(
      'Request body contains unsupported fields',
    );
  }

  return body;
}

private normalizeAndValidateHandle(
  value: unknown,
): string {
  if (typeof value !== 'string') {
    throw new BadRequestException(
      'Handle must be a string',
    );
  }

  const handle = value.trim().toLowerCase();

  if (handle.length < 3 || handle.length > 30) {
    throw new BadRequestException(
      'Handle must contain between 3 and 30 characters',
    );
  }

  if (!/^[a-z0-9_]+$/.test(handle)) {
    throw new BadRequestException(
      'Handle may contain only letters, numbers, and underscores',
    );
  }

  return handle;
}

private validatePassword(value: unknown): string {
  if (typeof value !== 'string') {
    throw new BadRequestException(
      'Password must be a string',
    );
  }

  const length = Array.from(value).length;

  if (length < 8 || length > 128) {
    throw new BadRequestException(
      'Password must contain between 8 and 128 characters',
    );
  }

  return value;
}

  async register(input: {
    handle: string;
    displayName: string;
    password: string;
  }) {
   
const body = this.validateObjectInput(input, [
  'handle',
  'displayName',
  'password',
]);

const handle = this.normalizeAndValidateHandle(
  body.handle,
);

if (typeof body.displayName !== 'string') {
  throw new BadRequestException(
    'Display name must be a string',
  );
}

const displayName = body.displayName.trim();
const displayNameLength = Array.from(displayName).length;

if (displayNameLength < 1 || displayNameLength > 80) {
  throw new BadRequestException(
    'Display name must contain between 1 and 80 characters',
  );
}

const password = this.validatePassword(body.password);
const passwordHash = await argon2.hash(password);


    try {
      const [user] = await this.db
        .insert(users)
        .values({
          id: randomUUID(),
          handle,
          displayName,
          passwordHash,
        })
        .returning({
          id: users.id,
          handle: users.handle,
          displayName: users.displayName,
          createdAt: users.createdAt,
        });

      return { item: user };
    } catch (error) {
      // DrizzleQueryError wraps the underlying PostgreSQL error in cause.
      const dbError = error as {
        code?: string;
        cause?: { code?: string };
      };

      if (dbError.code === '23505' || dbError.cause?.code === '23505') {
        throw new ConflictException('Handle is already taken');
      }

      throw error;
    }
  }

  async login(
    input: { handle: string; password: string },
    metadata?: { userAgent?: string; ipAddress?: string },
  ) {
   const body = this.validateObjectInput(input, [
  'handle',
  'password',
]);

const handle = this.normalizeAndValidateHandle(
  body.handle,
);

const password = this.validatePassword(body.password);

   const [user] = await this.db
  .select({
    id: users.id,
    handle: users.handle,
    displayName: users.displayName,
    createdAt: users.createdAt,
    passwordHash: users.passwordHash,
    deactivatedAt: users.deactivatedAt,
  })
      .from(users)
      .where(eq(users.handle, handle))
      .limit(1);
if (
  !user?.passwordHash ||
  !(await argon2.verify(user.passwordHash, password)) ||
  user.deactivatedAt !== null
) {
  throw new UnauthorizedException('Invalid handle or password');
}

    // Send the raw token only to the browser; store its hash in PostgreSQL.
    const token = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    );

    await this.db.insert(sessions).values({
      tokenHash,
      userId: user.id,
      expiresAt,
      userAgent: metadata?.userAgent || null,
      ipAddress: metadata?.ipAddress || null,
    });

    return {
      token,
      item: {
        id: user.id,
        handle: user.handle,
        displayName: user.displayName,
        createdAt: user.createdAt,
      },
    };
  }

  /**
   * Resolve the viewer ID from an optional session cookie without throwing.
   * Returns null when unauthenticated — safe to call on public endpoints.
   * Fix #3: used by GET /feed to pass the real viewerId so likedByViewer is correct.
   */
  async resolveViewer(cookieHeader?: string): Promise<string | null> {
    const token = this.readSessionToken(cookieHeader);
    if (!token) return null;

    const [result] = await this.db
      .select({ id: users.id })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(
        and(
          eq(sessions.tokenHash, this.hashToken(token)),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, new Date()),
          isNull(users.deactivatedAt),
        ),
      )
      .limit(1);

    return result?.id ?? null;
  }
  async me(cookieHeader?: string) {
    const token = this.readSessionToken(cookieHeader);

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    const [result] = await this.db
      .select({
        id: users.id,
        handle: users.handle,
        displayName: users.displayName,
        createdAt: users.createdAt,
        sessionId: sessions.id,
        tokenHash: sessions.tokenHash,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(
        and(
          eq(sessions.tokenHash, this.hashToken(token)),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, new Date()),
           isNull(users.deactivatedAt),
        ),
      )
      .limit(1);

    if (!result) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    return result;
  }

async deactivate(userId: string): Promise<void> {
  const now = new Date();

  await this.db.transaction(async (tx: any) => {
    const [user] = await tx
      .update(users)
      .set({
        deactivatedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(users.id, userId),
          isNull(users.deactivatedAt),
        ),
      )
      .returning({ id: users.id });

    if (!user) {
      throw new NotFoundException('Active account not found');
    }

    await tx
      .update(sessions)
      .set({ revokedAt: now })
      .where(
        and(
          eq(sessions.userId, userId),
          isNull(sessions.revokedAt),
        ),
      );
  });
}

  async logout(cookieHeader?: string) {
    const token = this.readSessionToken(cookieHeader);

    if (!token) {
      return;
    }

    await this.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(sessions.tokenHash, this.hashToken(token)),
          isNull(sessions.revokedAt),
        ),
      );
  }

  parseUserAgent(userAgent?: string | null): {
    browser: string;
    os: string;
    deviceType: 'desktop' | 'mobile' | 'tablet';
  } {
    if (!userAgent) {
      return {
        browser: 'Web Browser',
        os: 'Desktop / Mobile Device',
        deviceType: 'desktop',
      };
    }
    const ua = userAgent;
    let browser = 'Web Browser';
    if (ua.includes('Firefox/')) {
      browser = 'Firefox';
    } else if (ua.includes('Edg/') || ua.includes('Edge/')) {
      browser = 'Edge';
    } else if (ua.includes('Chrome/') && ua.includes('Safari/')) {
      browser = 'Chrome';
    } else if (ua.includes('Safari/') && !ua.includes('Chrome/')) {
      browser = 'Safari';
    } else if (ua.includes('MSIE') || ua.includes('Trident/')) {
      browser = 'Internet Explorer';
    } else if (ua.includes('Opera/') || ua.includes('OPR/')) {
      browser = 'Opera';
    }

    let os = 'Unknown OS';
    if (ua.includes('Windows NT 10.0')) {
      os = 'Windows 10/11';
    } else if (ua.includes('Windows NT')) {
      os = 'Windows';
    } else if (ua.includes('iPhone')) {
      os = 'iOS (iPhone)';
    } else if (ua.includes('iPad')) {
      os = 'iOS (iPad)';
    } else if (ua.includes('Macintosh') || ua.includes('Mac OS X')) {
      os = 'macOS';
    } else if (ua.includes('Android')) {
      os = 'Android';
    } else if (ua.includes('Linux')) {
      os = 'Linux';
    }

    let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
    if (ua.includes('iPad') || ua.includes('Tablet')) {
      deviceType = 'tablet';
    } else if (ua.includes('Mobile') || ua.includes('iPhone') || ua.includes('Android')) {
      deviceType = 'mobile';
    }

    return { browser, os, deviceType };
  }

  async getSessions(
    userId: string,
    currentCookie?: string,
    currentUserAgent?: string,
    currentIp?: string,
  ) {
    const currentToken = this.readSessionToken(currentCookie);
    const currentTokenHash = currentToken ? this.hashToken(currentToken) : null;
    const now = new Date();

    if (currentTokenHash && currentUserAgent) {
      await this.db
        .update(sessions)
        .set({
          userAgent: currentUserAgent,
          ...(currentIp ? { ipAddress: currentIp } : {}),
        })
        .where(
          and(
            eq(sessions.tokenHash, currentTokenHash),
            isNull(sessions.userAgent),
          ),
        );
    }

    const activeSessions = await this.db
      .select({
        id: sessions.id,
        createdAt: sessions.createdAt,
        expiresAt: sessions.expiresAt,
        userAgent: sessions.userAgent,
        ipAddress: sessions.ipAddress,
        tokenHash: sessions.tokenHash,
      })
      .from(sessions)
      .where(
        and(
          eq(sessions.userId, userId),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, now),
        ),
      )
      .orderBy(desc(sessions.createdAt));

    const items = activeSessions.map((s: any) => {
      const parsed = this.parseUserAgent(s.userAgent);
      return {
        id: s.id,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        browser: parsed.browser,
        os: parsed.os,
        deviceType: parsed.deviceType,
        ipAddress: s.ipAddress || null,
        isCurrent: Boolean(currentTokenHash && s.tokenHash === currentTokenHash),
      };
    });

    return {
      items,
      count: items.length,
    };
  }

  async revokeSession(userId: string, sessionId: string, currentCookie?: string) {
    const currentToken = this.readSessionToken(currentCookie);
    const currentTokenHash = currentToken ? this.hashToken(currentToken) : null;
    const now = new Date();

    const [sessionToRevoke] = await this.db
      .select({
        id: sessions.id,
        userId: sessions.userId,
        tokenHash: sessions.tokenHash,
        revokedAt: sessions.revokedAt,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .where(
        and(
          eq(sessions.id, sessionId),
          eq(sessions.userId, userId),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, now),
        ),
      )
      .limit(1);

    if (!sessionToRevoke) {
      throw new NotFoundException('Session not found or already revoked');
    }

    await this.db
      .update(sessions)
      .set({ revokedAt: now })
      .where(eq(sessions.id, sessionId));

    const isCurrent = Boolean(
      currentTokenHash && sessionToRevoke.tokenHash === currentTokenHash,
    );

    return {
      revoked: true,
      isCurrent,
    };
  }

  async revokeOtherSessions(userId: string, currentCookie?: string) {
    const currentToken = this.readSessionToken(currentCookie);
    if (!currentToken) {
      throw new UnauthorizedException('Authentication required');
    }
    const currentTokenHash = this.hashToken(currentToken);
    const now = new Date();

    const [currentSession] = await this.db
      .select({
        id: sessions.id,
      })
      .from(sessions)
      .where(
        and(
          eq(sessions.tokenHash, currentTokenHash),
          eq(sessions.userId, userId),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, now),
        ),
      )
      .limit(1);

    if (!currentSession) {
      throw new UnauthorizedException('Current session is invalid or expired');
    }

    // Revoke all active sessions for this user EXCEPT the current session tokenHash
    const updated = await this.db
      .update(sessions)
      .set({ revokedAt: now })
      .where(
        and(
          eq(sessions.userId, userId),
          ne(sessions.tokenHash, currentTokenHash),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, now),
        ),
      )
      .returning({ id: sessions.id });

    return {
      revokedCount: (updated || []).length,
    };
  }
}
