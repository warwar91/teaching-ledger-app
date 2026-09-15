import {
  Injectable,
  Inject,
  Logger,
  ConflictException,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
// eslint-disable-next-line import/no-extraneous-dependencies
import { DRIZZLE_DATABASE } from '@server/database/database.module';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { appUser, appSession, loginAttempt } from '@server/schema';
import type { AuthResponse, UserInfo } from '@shared/api.interface';
import { v4 as uuidv4 } from 'uuid';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';

const BCRYPT_SALT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15分钟无操作自动退出

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  private hashPassword(password: string): string {
    return bcrypt.hashSync(password, BCRYPT_SALT_ROUNDS);
  }

  private verifyPassword(password: string, hash: string): boolean {
    return bcrypt.compareSync(password, hash);
  }

  private async createSession(userId: string): Promise<string> {
    const now = new Date();
    const token = this.generateToken();

    await this.db.transaction(async (tx) => {
      await tx
        .update(appSession)
        .set({ status: 'invalid' })
        .where(
          and(
            eq(appSession.userId, userId),
            eq(appSession.status, 'active'),
          ),
        );

      await tx.insert(appSession).values({
        userId,
        sessionToken: token,
        loginAt: now,
        lastActiveAt: now,
        status: 'active',
      });
    });

    this.logger.log(`用户 ${userId} 登录成功，创建新会话`);
    return token;
  }

  private async getLoginAttempt(username: string): Promise<{
    attemptCount: number;
    lockedUntil: Date | null;
  } | null> {
    const results = await this.db
      .select({
        attemptCount: loginAttempt.attemptCount,
        lockedUntil: loginAttempt.lockedUntil,
      })
      .from(loginAttempt)
      .where(eq(loginAttempt.username, username))
      .limit(1);

    return results.length > 0 ? results[0] : null;
  }

  private async incrementLoginAttempt(username: string): Promise<void> {
    const now = new Date();
    const existing = await this.getLoginAttempt(username);

    if (!existing) {
      await this.db.insert(loginAttempt).values({
        username,
        attemptCount: 1,
        lastAttemptAt: now,
      });
      return;
    }

    const newCount = existing.attemptCount + 1;
    const lockedUntil = newCount >= MAX_LOGIN_ATTEMPTS
      ? new Date(now.getTime() + LOCK_DURATION_MS)
      : existing.lockedUntil;

    await this.db
      .update(loginAttempt)
      .set({
        attemptCount: newCount,
        lockedUntil,
        lastAttemptAt: now,
      })
      .where(eq(loginAttempt.username, username));
  }

  private async resetLoginAttempt(username: string): Promise<void> {
    await this.db
      .update(loginAttempt)
      .set({
        attemptCount: 0,
        lockedUntil: null,
        lastAttemptAt: new Date(),
      })
      .where(eq(loginAttempt.username, username));
  }

  private async checkLoginLocked(username: string): Promise<void> {
    const attempt = await this.getLoginAttempt(username);
    if (!attempt || !attempt.lockedUntil) return;

    if (attempt.lockedUntil.getTime() > Date.now()) {
      const remainingSec = Math.ceil(
        (attempt.lockedUntil.getTime() - Date.now()) / 1000,
      );
      throw new HttpException(
        `账号已被临时锁定，请 ${remainingSec} 秒后重试`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.resetLoginAttempt(username);
  }

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const { username, password } = dto;

    const existingUsers = await this.db
      .select({ id: appUser.id })
      .from(appUser)
      .where(eq(appUser.username, username))
      .limit(1);

    if (existingUsers.length > 0) {
      throw new ConflictException('用户名已存在');
    }

    const userId = uuidv4();
    const passwordHash = this.hashPassword(password);
    const role = username === 'admin' ? 'admin' : 'user';

    await this.db.insert(appUser).values({
      userId,
      username,
      passwordHash,
      role,
    });

    this.logger.log(`新用户注册成功: ${username} (${role})`);

    const token = await this.createSession(userId);

    return {
      token,
      userId,
      username,
      role: role as 'admin' | 'user',
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const { username, password } = dto;

    await this.checkLoginLocked(username);

    const userResults = await this.db
      .select({
        userId: appUser.userId,
        username: appUser.username,
        role: appUser.role,
        passwordHash: appUser.passwordHash,
      })
      .from(appUser)
      .where(eq(appUser.username, username))
      .limit(1);

    if (userResults.length === 0) {
      await this.incrementLoginAttempt(username);
      throw new UnauthorizedException('用户名或密码错误');
    }

    const user = userResults[0];

    if (!this.verifyPassword(password, user.passwordHash)) {
      await this.incrementLoginAttempt(username);
      throw new UnauthorizedException('用户名或密码错误');
    }

    await this.resetLoginAttempt(username);

    const token = await this.createSession(user.userId);

    return {
      token,
      userId: user.userId,
      username: user.username,
      role: user.role as 'admin' | 'user',
    };
  }

  async logout(sessionId: string): Promise<void> {
    const updated = await this.db
      .update(appSession)
      .set({ status: 'inactive' })
      .where(eq(appSession.id, sessionId))
      .returning({ id: appSession.id });

    if (updated.length === 0) {
      throw new UnauthorizedException('会话不存在');
    }

    this.logger.log(`会话 ${sessionId} 已退出`);
  }

  async getCurrentUser(userId: string): Promise<UserInfo> {
    const userResults = await this.db
      .select({
        userId: appUser.userId,
        username: appUser.username,
        role: appUser.role,
      })
      .from(appUser)
      .where(eq(appUser.userId, userId))
      .limit(1);

    if (userResults.length === 0) {
      throw new UnauthorizedException('用户不存在');
    }

    const user = userResults[0];
    return {
      userId: user.userId,
      username: user.username,
      role: user.role as 'admin' | 'user',
    };
  }

  async heartbeat(sessionId: string): Promise<void> {
    const updated = await this.db
      .update(appSession)
      .set({ lastActiveAt: new Date() })
      .where(eq(appSession.id, sessionId))
      .returning({ id: appSession.id });

    if (updated.length === 0) {
      throw new UnauthorizedException('会话不存在');
    }
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const userResults = await this.db
      .select({
        userId: appUser.userId,
        passwordHash: appUser.passwordHash,
      })
      .from(appUser)
      .where(eq(appUser.userId, userId))
      .limit(1);

    if (userResults.length === 0) {
      throw new UnauthorizedException('用户不存在');
    }

    const user = userResults[0];

    if (!this.verifyPassword(oldPassword, user.passwordHash)) {
      throw new UnauthorizedException('原密码不正确');
    }

    if (oldPassword === newPassword) {
      throw new ConflictException('新密码不能与原密码相同');
    }

    const newHash = this.hashPassword(newPassword);

    await this.db
      .update(appUser)
      .set({ passwordHash: newHash })
      .where(eq(appUser.userId, userId));

    // 密码修改后使所有会话失效，强制重新登录
    await this.db
      .update(appSession)
      .set({ status: 'invalid' })
      .where(
        and(
          eq(appSession.userId, userId),
          eq(appSession.status, 'active'),
        ),
      );

    this.logger.log(`用户 ${userId} 修改密码成功，已失效所有会话`);
    return { message: '密码修改成功，请重新登录' };
  }
}
