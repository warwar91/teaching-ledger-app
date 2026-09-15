import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@server/database/database.module';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { announcement, announcementItem } from '@server/schema';

@Injectable()
export class AnnouncementService {
  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async findAll(page: number = 1, pageSize: number = 12) {
    const offset = (page - 1) * pageSize;
    const rows = await this.db
      .select({
        id: announcement.id,
        title: announcement.title,
        publisher: announcement.publisher,
        publishDate: announcement.publishDate,
        announcementType: announcement.announcementType,
      })
      .from(announcement)
      .where(eq(announcement.isPublished, true))
      .orderBy(desc(announcement.publishDate))
      .limit(pageSize)
      .offset(offset);

    const countResult = await this.db
      .select()
      .from(announcement)
      .where(eq(announcement.isPublished, true));

    return {
      list: rows,
      total: countResult.length,
      page,
      pageSize,
      totalPages: Math.ceil(countResult.length / pageSize),
    };
  }

  async findOne(id: string) {
    const rows = await this.db
      .select()
      .from(announcement)
      .where(eq(announcement.id, id as any))
      .limit(1);
    if (rows.length === 0) {
      throw new NotFoundException('公告不存在');
    }
    const result: any = rows[0];
    if (result.announcementType === 'task') {
      const items = await this.db
        .select()
        .from(announcementItem)
        .where(eq(announcementItem.announcementId, id as any))
        .orderBy(announcementItem.sortOrder);
      result.items = items;
    }
    return result;
  }

  async create(data: {
    title: string;
    content: string;
    publisher?: string;
    attachmentUrl?: string;
    attachmentName?: string;
    createdBy?: string;
    announcementType?: string;
    items?: Array<{ content: string; deadline?: string }>;
  }) {
    const type = data.announcementType || 'regular';
    const content = type === 'task' ? '' : (data.content || '');

    const rows = await this.db
      .insert(announcement)
      .values({
        title: data.title,
        content,
        publisher: data.publisher,
        attachmentUrl: data.attachmentUrl,
        attachmentName: data.attachmentName,
        createdBy: data.createdBy,
        announcementType: type,
      })
      .returning();

    const newAnnouncement = rows[0];

    if (type === 'task' && data.items && data.items.length > 0) {
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        if (item.content && item.content.trim()) {
          await this.db.insert(announcementItem).values({
            announcementId: newAnnouncement.id,
            content: item.content.trim(),
            deadline: item.deadline || null,
            sortOrder: i,
          });
        }
      }
    }

    return newAnnouncement;
  }

  async update(id: string, data: {
    title?: string;
    content?: string;
    publisher?: string;
    attachmentUrl?: string;
    attachmentName?: string;
    isPublished?: boolean;
    updatedBy?: string;
    items?: Array<{ id?: string; content: string; deadline?: string }>;
  }) {
    const rows = await this.db
      .update(announcement)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(announcement.id, id as any))
      .returning();

    if (rows.length === 0) {
      throw new NotFoundException('公告不存在');
    }

    if (data.items !== undefined) {
      await this.db.delete(announcementItem).where(eq(announcementItem.announcementId, id as any));
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        if (item.content && item.content.trim()) {
          await this.db.insert(announcementItem).values({
            announcementId: id,
            content: item.content.trim(),
            deadline: item.deadline || null,
            sortOrder: i,
          });
        }
      }
    }

    return rows[0];
  }

  async remove(id: string) {
    const rows = await this.db
      .delete(announcement)
      .where(eq(announcement.id, id as any))
      .returning({ id: announcement.id });
    if (rows.length === 0) {
      throw new NotFoundException('公告不存在');
    }
    return { success: true };
  }

  async adminFindAll() {
    const announcements = await this.db
      .select()
      .from(announcement)
      .orderBy(desc(announcement.publishDate));

    for (const ann of announcements) {
      if ((ann as any).announcementType === 'task') {
        (ann as any).items = await this.db
          .select()
          .from(announcementItem)
          .where(eq(announcementItem.announcementId, ann.id))
          .orderBy(announcementItem.sortOrder);
      }
    }
    return announcements;
  }

  async getUserLedgers(userId: string) {
    const { ledger } = await import('@server/schema');
    return this.db
      .select({
        id: ledger.id,
        name: ledger.name,
        ledgerType: ledger.ledgerType,
      })
      .from(ledger)
      .where(and(
        eq(ledger.ownerUserId, userId),
        eq(ledger.isDeleted, false),
      ));
  }

  async claimItems(
    userId: string,
    announcementId: string,
    itemIds: string[],
    targetLedgerId: string,
    overrides: {
      expectedDate?: string;
      mainExecutor?: string;
      remark?: string;
    }
  ) {
    const { ledger, ledgerRecord } = await import('@server/schema');

    const ledgerRows = await this.db
      .select()
      .from(ledger)
      .where(and(
        eq(ledger.id, targetLedgerId as any),
        eq(ledger.ownerUserId, userId),
        eq(ledger.isDeleted, false),
      ))
      .limit(1);

    if (ledgerRows.length === 0) {
      throw new BadRequestException('目标台账不存在或无权操作');
    }

    const annRows = await this.db
      .select()
      .from(announcement)
      .where(and(
        eq(announcement.id, announcementId as any),
        eq(announcement.isPublished, true),
      ))
      .limit(1);

    if (annRows.length === 0) {
      throw new NotFoundException('公告不存在');
    }

    const items = await this.db
      .select()
      .from(announcementItem)
      .where(and(
        eq(announcementItem.announcementId, announcementId as any),
        inArray(announcementItem.id, itemIds as any),
      ));

    if (items.length === 0) {
      throw new BadRequestException('未选择有效的台账条目');
    }

    const maxSeqResult = await this.db
      .select({ maxSeq: ledgerRecord.seqNo })
      .from(ledgerRecord)
      .where(eq(ledgerRecord.ledgerId, targetLedgerId as any))
      .orderBy(desc(ledgerRecord.seqNo))
      .limit(1);

    let nextSeq = maxSeqResult.length > 0 ? maxSeqResult[0].maxSeq : 0;

    const inserted: any[] = [];
    for (const item of items) {
      nextSeq += 1;
      const row = await this.db
        .insert(ledgerRecord)
        .values({
          ledgerId: targetLedgerId,
          seqNo: nextSeq,
          content: item.content,
          expectedDate: overrides.expectedDate || (item.deadline as any) || null,
          mainExecutor: overrides.mainExecutor || null,
          remark: overrides.remark || null,
          progressStatus: 'pending',
          createdBy: userId,
        })
        .returning();
      inserted.push(row[0]);
    }

    return { inserted: inserted.length, records: inserted };
  }
}
