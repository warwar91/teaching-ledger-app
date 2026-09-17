import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { PG_CLIENT } from '@server/database/database.module';
import type { Sql } from 'postgres';

@Injectable()
export class AnnouncementService {
  constructor(@Inject(PG_CLIENT) private readonly sql: Sql) {}

  async findAll(page: number = 1, pageSize: number = 12) {
    const offset = (page - 1) * pageSize;
    const rows = await this.sql`
      SELECT id, title, publisher,
        publish_date as "publishDate",
        announcement_type as "announcementType"
      FROM announcement
      WHERE is_published = true
      ORDER BY publish_date DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `;
    const countResult = await this.sql`SELECT COUNT(*)::int as total FROM announcement WHERE is_published = true`;
    return {
      list: rows,
      total: countResult[0]?.total || 0,
      page,
      pageSize,
      totalPages: Math.ceil((countResult[0]?.total || 0) / pageSize),
    };
  }

  async findOne(id: string, requirePublished: boolean = true) {
    const rows = await this.sql`
      SELECT id, title, content, publisher,
        publish_date as "publishDate",
        attachment_url as "attachmentUrl",
        attachment_name as "attachmentName",
        is_published as "isPublished",
        announcement_type as "announcementType",
        created_at as "createdAt",
        created_by as "createdBy",
        updated_at as "updatedAt",
        updated_by as "updatedBy"
      FROM announcement WHERE id = ${id}::uuid
    `;
    if (rows.length === 0) {
      throw new NotFoundException('公告不存在');
    }
    const result: any = rows[0];
    if (requirePublished && !result.isPublished) {
      throw new NotFoundException('公告不存在');
    }
    if (result.announcementType === 'task') {
      const items = await this.sql`
        SELECT id, content, deadline, sort_order as "sortOrder"
        FROM announcement_item WHERE announcement_id = ${id}::uuid ORDER BY sort_order
      `;
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

    const rows = await this.sql`
      INSERT INTO announcement (title, content, publisher, attachment_url, attachment_name, created_by, announcement_type)
      VALUES (${data.title}, ${content}, ${data.publisher || null}, ${data.attachmentUrl || null}, ${data.attachmentName || null}, ${data.createdBy || null}, ${type})
      RETURNING id, title, content, publisher,
        publish_date as "publishDate",
        attachment_url as "attachmentUrl",
        attachment_name as "attachmentName",
        is_published as "isPublished",
        announcement_type as "announcementType",
        created_at as "createdAt",
        created_by as "createdBy",
        updated_at as "updatedAt",
        updated_by as "updatedBy"
    `;
    const newAnnouncement = rows[0];

    if (type === 'task' && data.items && data.items.length > 0) {
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        if (item.content && item.content.trim()) {
          await this.sql`
            INSERT INTO announcement_item (announcement_id, content, deadline, sort_order)
            VALUES (${newAnnouncement.id}, ${item.content.trim()}, ${item.deadline || null}, ${i})
          `;
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
    const existing = await this.sql`SELECT id FROM announcement WHERE id = ${id}::uuid`;
    if (existing.length === 0) {
      throw new NotFoundException('公告不存在');
    }

    const rows = await this.sql`
      UPDATE announcement SET
        title = COALESCE(${data.title ?? null}, title),
        content = COALESCE(${data.content ?? null}, content),
        publisher = COALESCE(${data.publisher ?? null}, publisher),
        attachment_url = COALESCE(${data.attachmentUrl ?? null}, attachment_url),
        attachment_name = COALESCE(${data.attachmentName ?? null}, attachment_name),
        is_published = COALESCE(${data.isPublished ?? null}, is_published),
        updated_by = ${data.updatedBy || null},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}::uuid
      RETURNING id, title, content, publisher,
        publish_date as "publishDate",
        attachment_url as "attachmentUrl",
        attachment_name as "attachmentName",
        is_published as "isPublished",
        announcement_type as "announcementType",
        created_at as "createdAt",
        created_by as "createdBy",
        updated_at as "updatedAt",
        updated_by as "updatedBy"
    `;

    if (data.items !== undefined) {
      await this.sql`DELETE FROM announcement_item WHERE announcement_id = ${id}::uuid`;
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        if (item.content && item.content.trim()) {
          await this.sql`
            INSERT INTO announcement_item (announcement_id, content, deadline, sort_order)
            VALUES (${id}, ${item.content.trim()}, ${item.deadline || null}, ${i})
          `;
        }
      }
    }

    return rows[0];
  }

  async remove(id: string) {
    const rows = await this.sql`DELETE FROM announcement WHERE id = ${id}::uuid RETURNING id`;
    if (rows.length === 0) {
      throw new NotFoundException('公告不存在');
    }
    return { success: true };
  }

  async adminFindAll() {
    const announcements = await this.sql`
      SELECT id, title, content, publisher,
        publish_date as "publishDate",
        attachment_url as "attachmentUrl",
        attachment_name as "attachmentName",
        is_published as "isPublished",
        announcement_type as "announcementType",
        created_at as "createdAt",
        created_by as "createdBy",
        updated_at as "updatedAt",
        updated_by as "updatedBy"
      FROM announcement ORDER BY publish_date DESC
    `;
    for (const ann of announcements) {
      if (ann.announcementType === 'task') {
        ann.items = await this.sql`
          SELECT id, content, deadline, sort_order as "sortOrder"
          FROM announcement_item WHERE announcement_id = ${ann.id} ORDER BY sort_order
        `;
      }
    }
    return announcements;
  }

  async getUserLedgers(userId: string) {
    return this.sql`
      SELECT id, name, ledger_type as "ledgerType" FROM ledger
      WHERE owner_user_id = ${userId} AND is_deleted = false
    `;
  }

  // 管理员：获取自己所有台账（含学期、类型）及其中的记录，用于发布台账公告时选择
  async getAdminLedgersWithRecords(userId: string) {
    const ledgers = await this.sql<Array<{
      id: string;
      name: string;
      ledgerType: string;
      semester: string;
    }>>`
      SELECT id, name, ledger_type as "ledgerType", semester
      FROM ledger
      WHERE owner_user_id = ${userId} AND is_deleted = false
      ORDER BY semester, ledger_type, created_at
    `;
    if (ledgers.length === 0) return [];
    const ledgerIds = ledgers.map((l) => l.id);
    const records = await this.sql<Array<{
      id: string;
      ledgerId: string;
      content: string;
      expectedDate: string | null;
      mainExecutor: string | null;
    }>>`
      SELECT id, ledger_id as "ledgerId", content, expected_date as "expectedDate", main_executor as "mainExecutor"
      FROM ledger_record
      WHERE ledger_id = ANY(${ledgerIds}::uuid[])
      ORDER BY ledger_id, seq_no
    `;
    return ledgers.map((l) => ({
      ...l,
      records: records
        .filter((r) => r.ledgerId === l.id)
        .map((r) => ({
          id: r.id,
          content: r.content,
          deadline: r.expectedDate ? new Date(r.expectedDate).toISOString().slice(0, 10) : undefined,
          mainExecutor: r.mainExecutor || undefined,
        })),
    }));
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
    const ledgerRows = await this.sql`
      SELECT id FROM ledger WHERE id = ${targetLedgerId}::uuid AND owner_user_id = ${userId} AND is_deleted = false
    `;
    if (ledgerRows.length === 0) {
      throw new BadRequestException('目标台账不存在或无权操作');
    }

    const annRows = await this.sql`
      SELECT id FROM announcement WHERE id = ${announcementId}::uuid AND is_published = true
    `;
    if (annRows.length === 0) {
      throw new NotFoundException('公告不存在');
    }

    const items = await this.sql`
      SELECT * FROM announcement_item WHERE announcement_id = ${announcementId}::uuid AND id = ANY(${itemIds}::uuid[])
    `;
    if (items.length === 0) {
      throw new BadRequestException('未选择有效的台账条目');
    }

    const maxSeqResult = await this.sql`
      SELECT COALESCE(MAX(seq_no), 0) as max_seq FROM ledger_record WHERE ledger_id = ${targetLedgerId}::uuid
    `;
    let nextSeq = maxSeqResult[0]?.max_seq || 0;

    const inserted: any[] = [];
    for (const item of items) {
      nextSeq += 1;
      const row = await this.sql`
        INSERT INTO ledger_record (ledger_id, seq_no, content, expected_date, main_executor, remark, progress_status, created_by)
        VALUES (
          ${targetLedgerId}::uuid,
          ${nextSeq},
          ${item.content},
          ${overrides.expectedDate || item.deadline || null},
          ${overrides.mainExecutor || null},
          ${overrides.remark || null},
          'pending',
          ${userId}
        )
        RETURNING *
      `;
      inserted.push(row[0]);
    }

    return { inserted: inserted.length, records: inserted };
  }
}
