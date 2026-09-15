import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
// eslint-disable-next-line import/no-extraneous-dependencies
import { DRIZZLE_DATABASE } from '@server/database/database.module';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import { appSession, appUser } from '@server/schema';

const SESSION_TIMEOUT_MS = 15 * 60 * 1000;

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('未提供认证令牌');
    }

    const token = authHeader.slice(7);
    if (!token) {
      throw new UnauthorizedException('认证令牌无效');
    }

    const now = new Date();
    const activeSince = new Date(now.getTime() - SESSION_TIMEOUT_MS);

    const sessionResults = await this.db
      .select({
        id: appSession.id,
        userId: appSession.userId,
        status: appSession.status,
        lastActiveAt: appSession.lastActiveAt,
      })
      .from(appSession)
      .where(
        and(
          eq(appSession.sessionToken, token),
          eq(appSession.status, 'active'),
        ),
      )
      .limit(1);

    if (sessionResults.length === 0) {
      throw new UnauthorizedException('会话不存在或已失效');
    }

    const session = sessionResults[0];

    if (session.lastActiveAt.getTime() < activeSince.getTime()) {
      await this.db
        .update(appSession)
        .set({ status: 'invalid' })
        .where(eq(appSession.id, session.id));
      throw new UnauthorizedException('会话已超时，请重新登录');
    }

    const userResults = await this.db
      .select({
        userId: appUser.userId,
        username: appUser.username,
        role: appUser.role,
      })
      .from(appUser)
      .where(eq(appUser.userId, session.userId))
      .limit(1);

    if (userResults.length === 0) {
      throw new UnauthorizedException('用户不存在');
    }

    const user = userResults[0];

    request.user = {
      userId: user.userId,
      username: user.username,
      role: user.role,
      sessionId: session.id,
    };

    await this.db
      .update(appSession)
      .set({ lastActiveAt: now })
      .where(eq(appSession.id, session.id));

    return true;
  }
}
