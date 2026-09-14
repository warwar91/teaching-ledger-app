import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
// eslint-disable-next-line import/no-extraneous-dependencies
import { DRIZZLE_DATABASE } from '@server/database/database.module';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, desc, asc, count, sql, inArray } from 'drizzle-orm';
import dayjs from 'dayjs';
import * as bcrypt from 'bcryptjs';
import { appUser, ledger, ledgerRecord, appSession, loginAttempt } from '@server/schema';
import type {
  AdminUserItem,
  LedgerItem,
  LedgerDetail,
  LedgerRecordItem,
  LedgerType,
  ProgressStatus,
  UserRole,
} from '@shared/api.interface';

const BCRYPT_SALT_ROUNDS = 12;

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  private toLedgerRecordItem(row: typeof ledgerRecord.$inferSelect): LedgerRecordItem {
    return {
      id: row.id,
      ledgerId: row.ledgerId,
      seqNo: row.seqNo,
      content: row.content,
      imageUrls: row.imageUrls ?? [],
      expectedDate: row.expectedDate ?? null,
      mainExecutor: row.mainExecutor ?? null,
      progressStatus: row.progressStatus as ProgressStatus,
      skipReminder: row.skipReminder,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toLedgerItem(
    row: {
      id: string;
      name: string;
      ledgerType: string;
      ownerUserId: string;
      isDeleted: boolean;
      deletedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    },
    recordCount: number,
    pendingCount: number,
  ): LedgerItem {
    return {
      id: row.id,
      name: row.name,
      ledgerType: row.ledgerType as LedgerType,
      ownerUserId: row.ownerUserId,
      isDeleted: row.isDeleted,
      deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      recordCount,
      pendingCount,
    };
  }

  async getUsers(): Promise<AdminUserItem[]> {
    try {
      const users = await this.db
        .select({
          userId: appUser.userId,
          username: appUser.username,
          role: appUser.role,
          createdAt: appUser.createdAt,
        })
        .from(appUser)
        .orderBy(desc(appUser.createdAt));

      const result: AdminUserItem[] = [];
      for (const user of users) {
        const counts = await this.db
          .select({
            ledgerType: ledger.ledgerType,
            cnt: count(),
          })
          .from(ledger)
          .where(
            and(
              eq(ledger.ownerUserId, user.userId),
              eq(ledger.isDeleted, false),
            ),
          )
          .groupBy(ledger.ledgerType);

        let weeklyCount = 0;
        let semesterCount = 0;
        for (const c of counts) {
          if (c.ledgerType === 'weekly') {
            weeklyCount = Number(c.cnt);
          } else if (c.ledgerType === 'semester') {
            semesterCount = Number(c.cnt);
          }
        }

        result.push({
          userId: user.userId,
          username: user.username,
          role: user.role as UserRole,
          createdAt: user.createdAt.toISOString(),
          weeklyCount,
          semesterCount,
        });
      }

      return result;
    } catch (error) {
      this.logger.error('获取用户列表失败', JSON.stringify(error));
      throw error;
    }
  }

  async getUserLedgers(
    userId: string,
    type?: 'weekly' | 'semester',
  ): Promise<LedgerItem[]> {
    try {
      const userResults = await this.db
        .select({ userId: appUser.userId })
        .from(appUser)
        .where(eq(appUser.userId, userId))
        .limit(1);

      if (userResults.length === 0) {
        throw new NotFoundException('用户不存在');
      }

      const conditions = [eq(ledger.ownerUserId, userId), eq(ledger.isDeleted, false)];
      if (type) {
        conditions.push(eq(ledger.ledgerType, type));
      }

      const ledgers = await this.db
        .select()
        .from(ledger)
        .where(and(...conditions))
        .orderBy(desc(ledger.createdAt));

      const items: LedgerItem[] = [];
      for (const row of ledgers) {
        const counts = await this.db
          .select({
            total: count(),
            pending: sql<number>`count(*) filter (where ${ledgerRecord.progressStatus} != 'completed')`,
          })
          .from(ledgerRecord)
          .where(eq(ledgerRecord.ledgerId, row.id));

        const totalCount = Number(counts[0]?.total ?? 0);
        const pendingCount = Number(counts[0]?.pending ?? 0);
        items.push(this.toLedgerItem(row, totalCount, pendingCount));
      }

      return items;
    } catch (error) {
      this.logger.error(`获取用户台账列表失败: userId=${userId}`, JSON.stringify(error));
      throw error;
    }
  }

  async getLedgerDetail(id: string): Promise<LedgerDetail> {
    try {
      const ledgerResults = await this.db
        .select()
        .from(ledger)
        .where(eq(ledger.id, id))
        .limit(1);

      if (ledgerResults.length === 0) {
        throw new NotFoundException('台账不存在');
      }

      const ledgerRow = ledgerResults[0];

      const records = await this.db
        .select()
        .from(ledgerRecord)
        .where(eq(ledgerRecord.ledgerId, id))
        .orderBy(asc(ledgerRecord.seqNo));

      return {
        id: ledgerRow.id,
        name: ledgerRow.name,
        ledgerType: ledgerRow.ledgerType as LedgerType,
        records: records.map((r: typeof ledgerRecord.$inferSelect) =>
          this.toLedgerRecordItem(r),
        ),
        createdAt: ledgerRow.createdAt.toISOString(),
      };
    } catch (error) {
      this.logger.error(`获取台账详情失败: id=${id}`, JSON.stringify(error));
      throw error;
    }
  }

  async deleteUserData(userId: string): Promise<{ deletedLedgers: number }> {
    try {
      const userResults = await this.db
        .select({ userId: appUser.userId })
        .from(appUser)
        .where(eq(appUser.userId, userId))
        .limit(1);

      if (userResults.length === 0) {
        throw new NotFoundException('用户不存在');
      }

      const userLedgers = await this.db
        .select({ id: ledger.id })
        .from(ledger)
        .where(eq(ledger.ownerUserId, userId));

      const ledgerIds = userLedgers.map((l: { id: string }) => l.id);

      if (ledgerIds.length === 0) {
        return { deletedLedgers: 0 };
      }

      const deleted = await this.db
        .delete(ledger)
        .where(eq(ledger.ownerUserId, userId))
        .returning({ id: ledger.id });

      this.logger.log(
        `清除用户数据: userId=${userId}, deletedLedgers=${deleted.length}`,
      );

      return { deletedLedgers: deleted.length };
    } catch (error) {
      this.logger.error(`清除用户数据失败: userId=${userId}`, JSON.stringify(error));
      throw error;
    }
  }

  async exportLedger(
    ledgerId: string,
  ): Promise<{ filename: string; buffer: Buffer }> {
    try {
      const ledgerResults = await this.db
        .select({ name: ledger.name })
        .from(ledger)
        .where(eq(ledger.id, ledgerId))
        .limit(1);

      if (ledgerResults.length === 0) {
        throw new NotFoundException('台账不存在');
      }

      const records = await this.db
        .select()
        .from(ledgerRecord)
        .where(eq(ledgerRecord.ledgerId, ledgerId))
        .orderBy(asc(ledgerRecord.seqNo));

      const statusMap: Record<string, string> = {
        pending: '待处理',
        in_progress: '进行中',
        completed: '已完成',
      };

      const headers = ['序号', '内容', '主要执行人', '预计完成时间', '进度状态', '图片链接', '录入时间'];
      const dataRows: string[][] = [];

      for (const rec of records) {
        dataRows.push([
          String(rec.seqNo),
          rec.content,
          rec.mainExecutor ?? '',
          rec.expectedDate ?? '',
          statusMap[rec.progressStatus] ?? rec.progressStatus,
          rec.imageUrls?.join('; ') ?? '',
          dayjs(rec.createdAt).format('YYYY-MM-DD HH:mm:ss'),
        ]);
      }

      const Excel = (await import('exceljs')).default;
      const workbook = new Excel.Workbook();
      const worksheet = workbook.addWorksheet('台账记录');

      worksheet.columns = headers.map((h: string) => ({
        header: h,
        key: h,
        width: h === '内容' ? 50 : h === '图片链接' ? 40 : 18,
      }));

      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, size: 12 };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE8F0FE' },
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      for (const row of dataRows) {
        worksheet.addRow(row);
      }

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.alignment = { vertical: 'top', wrapText: true };
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      return {
        filename: ledgerResults[0].name,
        buffer: Buffer.from(buffer as unknown as ArrayBuffer),
      };
    } catch (error) {
      this.logger.error(`导出台账失败: ledgerId=${ledgerId}`, JSON.stringify(error));
      throw error;
    }
  }

  async resetPassword(
    adminUserId: string,
    targetUserId: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const userResults = await this.db
        .select({
          userId: appUser.userId,
          username: appUser.username,
          role: appUser.role,
        })
        .from(appUser)
        .where(eq(appUser.userId, targetUserId))
        .limit(1);

      if (userResults.length === 0) {
        throw new NotFoundException('目标用户不存在');
      }

      const targetUser = userResults[0];

      if (targetUser.userId === adminUserId) {
        throw new ForbiddenException('不能重置自己的密码');
      }

      const passwordHash = bcrypt.hashSync(newPassword, BCRYPT_SALT_ROUNDS);

      await this.db
        .update(appUser)
        .set({ passwordHash })
        .where(eq(appUser.userId, targetUserId));

      const invalidated = await this.db
        .update(appSession)
        .set({ status: 'invalid' })
        .where(
          and(
            eq(appSession.userId, targetUserId),
            eq(appSession.status, 'active'),
          ),
        )
        .returning({ id: appSession.id });

      this.logger.log(
        `[AUDIT] 管理员重置密码: adminUserId=${adminUserId}, targetUserId=${targetUserId}, targetUsername=${targetUser.username}, invalidatedSessions=${invalidated.length}`,
      );

      return {
        success: true,
        message: '密码已重置，该用户已被强制下线',
      };
    } catch (error) {
      this.logger.error(
        `重置密码失败: adminUserId=${adminUserId}, targetUserId=${targetUserId}`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  async deleteUser(
    adminUserId: string,
    targetUserId: string,
  ): Promise<{
    userId: string;
    username: string;
    deletedLedgers: number;
    deletedRecords: number;
    deletedSessions: number;
    deletedLoginAttempts: number;
  }> {
    try {
      const userResults = await this.db
        .select({
          userId: appUser.userId,
          username: appUser.username,
          role: appUser.role,
        })
        .from(appUser)
        .where(eq(appUser.userId, targetUserId))
        .limit(1);

      if (userResults.length === 0) {
        throw new NotFoundException('目标用户不存在');
      }

      const targetUser = userResults[0];

      if (targetUser.userId === adminUserId) {
        throw new ForbiddenException('不能删除自己的账户');
      }

      const result = await this.db.transaction(async (tx) => {
        const userLedgers = await tx
          .select({ id: ledger.id })
          .from(ledger)
          .where(eq(ledger.ownerUserId, targetUserId));
        const ledgerIds = userLedgers.map((l: { id: string }) => l.id);

        let deletedRecords = 0;
        if (ledgerIds.length > 0) {
          const recordResult = await tx
            .delete(ledgerRecord)
            .where(inArray(ledgerRecord.ledgerId, ledgerIds))
            .returning({ id: ledgerRecord.id });
          deletedRecords = recordResult.length;
        }

        const ledgerResult = await tx
          .delete(ledger)
          .where(eq(ledger.ownerUserId, targetUserId))
          .returning({ id: ledger.id });

        const sessionResult = await tx
          .delete(appSession)
          .where(eq(appSession.userId, targetUserId))
          .returning({ id: appSession.id });

        const attemptResult = await tx
          .delete(loginAttempt)
          .where(eq(loginAttempt.username, targetUser.username))
          .returning({ id: loginAttempt.id });

        await tx
          .delete(appUser)
          .where(eq(appUser.userId, targetUserId));

        return {
          userId: targetUser.userId,
          username: targetUser.username,
          deletedLedgers: ledgerResult.length,
          deletedRecords,
          deletedSessions: sessionResult.length,
          deletedLoginAttempts: attemptResult.length,
        };
      });

      this.logger.log(
        `[AUDIT] 管理员删除用户: adminUserId=${adminUserId}, targetUserId=${result.userId}, targetUsername=${result.username}, deletedLedgers=${result.deletedLedgers}, deletedRecords=${result.deletedRecords}, deletedSessions=${result.deletedSessions}, deletedLoginAttempts=${result.deletedLoginAttempts}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `删除用户失败: adminUserId=${adminUserId}, targetUserId=${targetUserId}`,
        JSON.stringify(error),
      );
      throw error;
    }
  }
}
