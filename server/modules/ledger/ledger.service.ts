import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
// eslint-disable-next-line import/no-extraneous-dependencies
import { DRIZZLE_DATABASE } from '@server/database/database.module';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, desc, asc, count, gte, lt, max, inArray, sql } from 'drizzle-orm';
import dayjs from 'dayjs';
import { ledger, ledgerRecord } from '@server/schema';
import type {
  LedgerItem,
  LedgerDetail,
  LedgerRecordItem,
  CreateLedgerRequest,
  CreateRecordsRequest,
  UpdateRecordRequest,
  ReminderItem,
  LedgerType,
  ProgressStatus,
} from '@shared/api.interface';

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

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

  private toLedgerRecordItem(row: typeof ledgerRecord.$inferSelect): LedgerRecordItem {
    return {
      id: row.id,
      ledgerId: row.ledgerId,
      seqNo: row.seqNo,
      content: row.content,
      remark: row.remark ?? null,
      imageUrls: row.imageUrls ?? [],
      expectedDate: row.expectedDate ?? null,
      mainExecutor: row.mainExecutor ?? null,
      progressStatus: row.progressStatus as ProgressStatus,
      skipReminder: row.skipReminder,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async verifyLedgerOwner(userId: string, ledgerId: string): Promise<void> {
    const results = await this.db
      .select({ ownerUserId: ledger.ownerUserId, isDeleted: ledger.isDeleted })
      .from(ledger)
      .where(eq(ledger.id, ledgerId))
      .limit(1);

    if (results.length === 0 || results[0].isDeleted) {
      throw new NotFoundException('台账不存在');
    }
    if (results[0].ownerUserId !== userId) {
      throw new ForbiddenException('无权操作此台账');
    }
  }

  async getLedgerList(
    userId: string,
    type?: 'weekly' | 'semester',
    semester?: string,
  ): Promise<LedgerItem[]> {
    try {
      const conditions = [eq(ledger.ownerUserId, userId), eq(ledger.isDeleted, false)];
      if (type) {
        conditions.push(eq(ledger.ledgerType, type));
      }
      if (semester) {
        conditions.push(eq(ledger.semester, semester));
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
      this.logger.error(`获取台账列表失败: userId=${userId}`, JSON.stringify(error));
      throw error;
    }
  }

  async createLedger(
    userId: string,
    dto: CreateLedgerRequest,
  ): Promise<LedgerItem> {
    try {
      if (!dto.name || !dto.name.trim()) {
        throw new BadRequestException('台账名称不能为空');
      }
      if (!dto.ledgerType || !['weekly', 'semester'].includes(dto.ledgerType)) {
        throw new BadRequestException('台账类型无效');
      }

      const results = await this.db
        .insert(ledger)
        .values({
          ownerUserId: userId,
          name: dto.name.trim(),
          ledgerType: dto.ledgerType,
          semester: dto.semester || '2026-2027-1',
        })
        .returning();

      const row = results[0];
      return this.toLedgerItem(row, 0, 0);
    } catch (error) {
      this.logger.error(`创建台账失败: userId=${userId}`, JSON.stringify(error));
      throw error;
    }
  }

  async getLedgerDetail(userId: string, id: string): Promise<LedgerDetail> {
    try {
      await this.verifyLedgerOwner(userId, id);

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
        records: records.map((r: typeof ledgerRecord.$inferSelect) => this.toLedgerRecordItem(r)),
        createdAt: ledgerRow.createdAt.toISOString(),
      };
    } catch (error) {
      this.logger.error(`获取台账详情失败: id=${id}`, JSON.stringify(error));
      throw error;
    }
  }

  async renameLedger(userId: string, id: string, name: string): Promise<{ id: string; name: string }> {
    try {
      if (!name || !name.trim()) {
        throw new BadRequestException('台账名称不能为空');
      }
      await this.verifyLedgerOwner(userId, id);
      const updated = await this.db
        .update(ledger)
        .set({ name: name.trim(), updatedAt: new Date() })
        .where(eq(ledger.id, id))
        .returning({ id: ledger.id, name: ledger.name });
      if (updated.length === 0) {
        throw new NotFoundException('台账不存在');
      }
      return { id: updated[0].id, name: updated[0].name };
    } catch (error) {
      this.logger.error(`重命名台账失败: id=${id}`, JSON.stringify(error));
      throw error;
    }
  }

  async deleteLedger(userId: string, id: string): Promise<void> {
    try {
      await this.verifyLedgerOwner(userId, id);

      const now = new Date();
      const updated = await this.db
        .update(ledger)
        .set({ isDeleted: true, deletedAt: now })
        .where(eq(ledger.id, id))
        .returning({ id: ledger.id });

      if (updated.length === 0) {
        throw new NotFoundException('台账不存在');
      }
    } catch (error) {
      this.logger.error(`删除台账失败: id=${id}`, JSON.stringify(error));
      throw error;
    }
  }

  async batchDeleteLedgers(userId: string, ids: string[]): Promise<void> {
    try {
      if (!ids || ids.length === 0) {
        throw new BadRequestException('未提供要删除的台账ID');
      }

      const ledgers = await this.db
        .select({ id: ledger.id, ownerUserId: ledger.ownerUserId })
        .from(ledger)
        .where(inArray(ledger.id, ids));

      if (ledgers.length === 0) {
        throw new NotFoundException('台账不存在');
      }

      const invalidIds = ledgers.filter((l: { ownerUserId: string }) => l.ownerUserId !== userId);
      if (invalidIds.length > 0) {
        throw new ForbiddenException('无权操作部分台账');
      }

      const now = new Date();
      await this.db
        .update(ledger)
        .set({ isDeleted: true, deletedAt: now })
        .where(inArray(ledger.id, ids));
    } catch (error) {
      this.logger.error(`批量删除台账失败: ids=${ids.join(',')}`, JSON.stringify(error));
      throw error;
    }
  }

  private async cleanupExpired(userId: string): Promise<void> {
    const cutoff = dayjs().subtract(14, 'day').toDate();
    const expired = await this.db
      .select({ id: ledger.id })
      .from(ledger)
      .where(
        and(
          eq(ledger.ownerUserId, userId),
          eq(ledger.isDeleted, true),
          lt(ledger.deletedAt, cutoff),
        ),
      );

    if (expired.length > 0) {
      const expiredIds = expired.map((e: { id: string }) => e.id);
      await this.db.delete(ledgerRecord).where(inArray(ledgerRecord.ledgerId, expiredIds));
      await this.db.delete(ledger).where(inArray(ledger.id, expiredIds));
      this.logger.log(`清理过期回收站台账: userId=${userId}, count=${expiredIds.length}`);
    }
  }

  async getRecycleList(userId: string): Promise<LedgerItem[]> {
    try {
      await this.cleanupExpired(userId);

      const ledgers = await this.db
        .select()
        .from(ledger)
        .where(and(eq(ledger.ownerUserId, userId), eq(ledger.isDeleted, true)))
        .orderBy(desc(ledger.deletedAt));

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
      this.logger.error(`获取回收站列表失败: userId=${userId}`, JSON.stringify(error));
      throw error;
    }
  }

  async restoreLedger(userId: string, id: string): Promise<void> {
    try {
      const results = await this.db
        .select({ ownerUserId: ledger.ownerUserId })
        .from(ledger)
        .where(and(eq(ledger.id, id), eq(ledger.isDeleted, true)))
        .limit(1);

      if (results.length === 0) {
        throw new NotFoundException('台账不存在或不在回收站中');
      }
      if (results[0].ownerUserId !== userId) {
        throw new ForbiddenException('无权操作此台账');
      }

      const updated = await this.db
        .update(ledger)
        .set({ isDeleted: false, deletedAt: null })
        .where(eq(ledger.id, id))
        .returning({ id: ledger.id });

      if (updated.length === 0) {
        throw new NotFoundException('台账不存在');
      }
    } catch (error) {
      this.logger.error(`恢复台账失败: id=${id}`, JSON.stringify(error));
      throw error;
    }
  }

  async permanentDeleteLedger(userId: string, id: string): Promise<void> {
    try {
      const results = await this.db
        .select({ ownerUserId: ledger.ownerUserId })
        .from(ledger)
        .where(and(eq(ledger.id, id), eq(ledger.isDeleted, true)))
        .limit(1);

      if (results.length === 0) {
        throw new NotFoundException('台账不存在或不在回收站中');
      }
      if (results[0].ownerUserId !== userId) {
        throw new ForbiddenException('无权操作此台账');
      }

      await this.db.delete(ledgerRecord).where(eq(ledgerRecord.ledgerId, id));
      await this.db.delete(ledger).where(eq(ledger.id, id));
    } catch (error) {
      this.logger.error(`永久删除台账失败: id=${id}`, JSON.stringify(error));
      throw error;
    }
  }

  async createRecords(
    userId: string,
    ledgerId: string,
    dto: CreateRecordsRequest,
  ): Promise<LedgerRecordItem[]> {
    try {
      await this.verifyLedgerOwner(userId, ledgerId);

      if (!dto.records || dto.records.length === 0) {
        throw new BadRequestException('未提供记录数据');
      }

      const maxSeqResult = await this.db
        .select({ maxSeq: max(ledgerRecord.seqNo) })
        .from(ledgerRecord)
        .where(eq(ledgerRecord.ledgerId, ledgerId));

      const currentMax = Number(maxSeqResult[0]?.maxSeq ?? 0);

      const values = dto.records.map((r, index: number) => ({
        ledgerId,
        seqNo: currentMax + index + 1,
        content: r.content,
        remark: r.remark ?? null,
        imageUrls: r.imageUrls ?? [],
        expectedDate: r.expectedDate ?? null,
        mainExecutor: r.mainExecutor ?? null,
      }));

      const inserted = await this.db
        .insert(ledgerRecord)
        .values(values)
        .returning();

      return inserted.map((r: typeof ledgerRecord.$inferSelect) => this.toLedgerRecordItem(r));
    } catch (error) {
      this.logger.error(`新增记录失败: ledgerId=${ledgerId}`, JSON.stringify(error));
      throw error;
    }
  }

  async updateRecord(
    userId: string,
    recordId: string,
    dto: UpdateRecordRequest,
  ): Promise<LedgerRecordItem> {
    try {
      const recordResults = await this.db
        .select()
        .from(ledgerRecord)
        .where(eq(ledgerRecord.id, recordId))
        .limit(1);

      if (recordResults.length === 0) {
        throw new NotFoundException('记录不存在');
      }

      const record = recordResults[0];
      await this.verifyLedgerOwner(userId, record.ledgerId);

      const patch: Partial<typeof ledgerRecord.$inferInsert> = {};
      if (dto.content !== undefined) patch.content = dto.content;
      if (dto.remark !== undefined) patch.remark = dto.remark;
      if (dto.imageUrls !== undefined) patch.imageUrls = dto.imageUrls;
      if (dto.expectedDate !== undefined) patch.expectedDate = dto.expectedDate;
      if (dto.mainExecutor !== undefined) patch.mainExecutor = dto.mainExecutor;
      if (dto.progressStatus !== undefined) patch.progressStatus = dto.progressStatus;
      if (dto.skipReminder !== undefined) patch.skipReminder = dto.skipReminder;

      if (Object.keys(patch).length === 0) {
        throw new BadRequestException('未提供可更新字段');
      }

      const updated = await this.db
        .update(ledgerRecord)
        .set(patch)
        .where(eq(ledgerRecord.id, recordId))
        .returning();

      if (updated.length === 0) {
        throw new NotFoundException('记录不存在');
      }

      return this.toLedgerRecordItem(updated[0]);
    } catch (error) {
      this.logger.error(`更新记录失败: recordId=${recordId}`, JSON.stringify(error));
      throw error;
    }
  }

  async deleteRecord(userId: string, recordId: string): Promise<void> {
    try {
      const recordResults = await this.db
        .select()
        .from(ledgerRecord)
        .where(eq(ledgerRecord.id, recordId))
        .limit(1);

      if (recordResults.length === 0) {
        throw new NotFoundException('记录不存在');
      }

      const record = recordResults[0];
      await this.verifyLedgerOwner(userId, record.ledgerId);

      await this.db.delete(ledgerRecord).where(eq(ledgerRecord.id, recordId));
    } catch (error) {
      this.logger.error(`删除记录失败: recordId=${recordId}`, JSON.stringify(error));
      throw error;
    }
  }

  async getPendingReminders(userId: string): Promise<ReminderItem[]> {
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const twoDaysLater = dayjs().add(2, 'day').format('YYYY-MM-DD');

      const activeLedgers = await this.db
        .select({ id: ledger.id, name: ledger.name })
        .from(ledger)
        .where(and(eq(ledger.ownerUserId, userId), eq(ledger.isDeleted, false)));

      if (activeLedgers.length === 0) {
        return [];
      }

      const ledgerIds = activeLedgers.map((l: { id: string }) => l.id);
      const ledgerNameMap = new Map(
        activeLedgers.map((l: { id: string; name: string }) => [l.id, l.name]),
      );

      const pendingRecords = await this.db
        .select()
        .from(ledgerRecord)
        .where(
          and(
            inArray(ledgerRecord.ledgerId, ledgerIds),
            eq(ledgerRecord.progressStatus, 'pending'),
            eq(ledgerRecord.skipReminder, false),
          ),
        );

      const dueSoonRecords = await this.db
        .select()
        .from(ledgerRecord)
        .where(
          and(
            inArray(ledgerRecord.ledgerId, ledgerIds),
            lt(ledgerRecord.expectedDate, twoDaysLater),
            sql`${ledgerRecord.progressStatus} != 'completed'`,
            eq(ledgerRecord.skipReminder, false),
          ),
        );

      const reminderMap = new Map<string, ReminderItem>();

      for (const rec of pendingRecords) {
        const daysLeft = rec.expectedDate
          ? dayjs(rec.expectedDate).diff(dayjs().startOf('day'), 'day')
          : 0;
        reminderMap.set(rec.id, {
          id: rec.id,
          ledgerId: rec.ledgerId,
          ledgerName: ledgerNameMap.get(rec.ledgerId) ?? '',
          content: rec.content,
          expectedDate: rec.expectedDate ?? null,
          progressStatus: rec.progressStatus as ProgressStatus,
          daysLeft,
          reason: 'pending',
        });
      }

      for (const rec of dueSoonRecords) {
        const daysLeft = rec.expectedDate
          ? dayjs(rec.expectedDate).diff(dayjs().startOf('day'), 'day')
          : 0;
        const existing = reminderMap.get(rec.id);
        if (existing) {
          reminderMap.set(rec.id, {
            ...existing,
            reason: 'both',
            daysLeft,
          });
        } else {
          reminderMap.set(rec.id, {
            id: rec.id,
            ledgerId: rec.ledgerId,
            ledgerName: ledgerNameMap.get(rec.ledgerId) ?? '',
            content: rec.content,
            expectedDate: rec.expectedDate ?? null,
            progressStatus: rec.progressStatus as ProgressStatus,
            daysLeft,
            reason: 'due_soon',
          });
        }
      }

      return Array.from(reminderMap.values()).sort(
        (a: ReminderItem, b: ReminderItem) => a.daysLeft - b.daysLeft,
      );
    } catch (error) {
      this.logger.error(`获取提醒列表失败: userId=${userId}`, JSON.stringify(error));
      throw error;
    }
  }

  async skipReminder(userId: string, recordId: string): Promise<void> {
    try {
      const recordResults = await this.db
        .select()
        .from(ledgerRecord)
        .where(eq(ledgerRecord.id, recordId))
        .limit(1);

      if (recordResults.length === 0) {
        throw new NotFoundException('记录不存在');
      }

      const record = recordResults[0];
      await this.verifyLedgerOwner(userId, record.ledgerId);

      await this.db
        .update(ledgerRecord)
        .set({ skipReminder: true })
        .where(eq(ledgerRecord.id, recordId));
    } catch (error) {
      this.logger.error(`设置不再提示失败: recordId=${recordId}`, JSON.stringify(error));
      throw error;
    }
  }

  async exportLedger(
    userId: string,
    ledgerId: string,
  ): Promise<{ filename: string; buffer: Buffer }> {
    try {
      await this.verifyLedgerOwner(userId, ledgerId);

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

      const headers = ['序号', '内容', '备注', '主要执行人', '预计完成时间', '进度状态', '图片链接', '录入时间'];
      const dataRows: string[][] = [];

      for (const rec of records) {
        dataRows.push([
          String(rec.seqNo),
          rec.content,
          rec.remark ?? '',
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
}
