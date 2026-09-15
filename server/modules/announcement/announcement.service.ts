import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@server/database/database.module';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

@Injectable()
export class AnnouncementService {
  private readonly pg: any;

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {
    this.pg = (this.db as any).$client;
  }

  async findAll(page: number = 1, pageSize: number = 12) {
    const offset = (page - 1) * pageSize;
    const rows = await this.pg`
      SELECT id, title, publisher, publish_date, announcement_type
      FROM announcement
      WHERE is_published = true
      ORDER BY publish_date DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    const countResult = await this.pg`
      SELECT COUNT(*)::int as total FROM announcement WHERE is_published = true
    `;

    const total = Number(countResult[0]?.total || 0);
    return {
      list: rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string) {
    const rows = await this.pg`
      SELECT * FROM announcement WHERE id = ${id}::uuid LIMIT 1
    `;
    if (rows.length === 0) {
      throw new NotFoundException('公告不存在');
    }
    const announcement = rows[0];
    if (announcement.announcement_type === 'task') {
      const items = await this.pg`
        SELECT id, content, deadline, sort_order
        FROM announcement_item
        WHERE announcement_id = ${id}::uuid
        ORDER BY sort_order ASC
      `;
      announcement.items = items;
    }
    return announcement;
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
    // For task type, content can be empty; for regular, content required
    const content = type === 'task' ? '' : data.content;

    const rows = await this.pg`
      INSERT INTO announcement (title, content, publisher, attachment_url, attachment_name, created_by, announcement_type)
      VALUES (
        ${data.title},
        ${content},
        ${data.publisher || null},
        ${data.attachmentUrl || null},
        ${data.attachmentName || null},
        ${data.createdBy || null},
        ${type}
      )
      RETURNING *
    `;
    const newAnnouncement = rows[0];

    // Insert items for task type
    if (type === 'task' && data.items && data.items.length > 0) {
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        if (item.content && item.content.trim()) {
          await this.pg`
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
    const rows = await this.pg`
      UPDATE announcement SET
        title = COALESCE(${data.title || null}, title),
        content = COALESCE(${data.content || null}, content),
        publisher = COALESCE(${data.publisher || null}, publisher),
        attachment_url = COALESCE(${data.attachmentUrl || null}, attachment_url),
        attachment_name = COALESCE(${data.attachmentName || null}, attachment_name),
        is_published = COALESCE(${data.isPublished === undefined ? null : data.isPublished}, is_published),
        updated_by = COALESCE(${data.updatedBy || null}, updated_by),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}::uuid
      RETURNING *
    `;
    if (rows.length === 0) {
      throw new NotFoundException('公告不存在');
    }

    // Update items if provided
    if (data.items !== undefined) {
      // Delete existing items
      await this.pg`DELETE FROM announcement_item WHERE announcement_id = ${id}::uuid`;
      // Insert new items
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        if (item.content && item.content.trim()) {
          await this.pg`
            INSERT INTO announcement_item (announcement_id, content, deadline, sort_order)
            VALUES (${id}::uuid, ${item.content.trim()}, ${item.deadline || null}, ${i})
          `;
        }
      }
    }

    return rows[0];
  }

  async remove(id: string) {
    const rows = await this.pg`
      DELETE FROM announcement WHERE id = ${id}::uuid RETURNING id
    `;
    if (rows.length === 0) {
      throw new NotFoundException('公告不存在');
    }
    return { success: true };
  }

  async adminFindAll() {
    const announcements = await this.pg`
      SELECT * FROM announcement ORDER BY publish_date DESC
    `;
    // For task type, load items
    for (const ann of announcements) {
      if (ann.announcement_type === 'task') {
        ann.items = await this.pg`
          SELECT id, content, deadline, sort_order
          FROM announcement_item
          WHERE announcement_id = ${ann.id}::uuid
          ORDER BY sort_order ASC
        `;
      }
    }
    return announcements;
  }

  // Get user's ledgers for the "add to ledger" feature
  async getUserLedgers(userId: string) {
    return this.pg`
      SELECT id, name, ledger_type FROM ledger
      WHERE owner_user_id = ${userId} AND is_deleted = false
      ORDER BY ledger_type, created_at DESC
    `;
  }

  // Claim announcement items into user's ledger
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
    // Verify target ledger belongs to user
    const ledgerRows = await this.pg`
      SELECT * FROM ledger WHERE id = ${targetLedgerId}::uuid AND owner_user_id = ${userId} AND is_deleted = false LIMIT 1
    `;
    if (ledgerRows.length === 0) {
      throw new BadRequestException('目标台账不存在或无权操作');
    }

    // Verify announcement exists and is task type
    const annRows = await this.pg`
      SELECT * FROM announcement WHERE id = ${announcementId}::uuid AND is_published = true LIMIT 1
    `;
    if (annRows.length === 0) {
      throw new NotFoundException('公告不存在');
    }

    // Get the selected items
    const items = await this.pg`
      SELECT * FROM announcement_item WHERE announcement_id = ${announcementId}::uuid AND id = ANY(${itemIds}::uuid[])
    `;
    if (items.length === 0) {
      throw new BadRequestException('未选择有效的台账条目');
    }

    // Get max seq_no for this ledger
    const maxSeqResult = await this.pg`
      SELECT COALESCE(MAX(seq_no), 0) as max_seq FROM ledger_record WHERE ledger_id = ${targetLedgerId}::uuid
    `;
    let nextSeq = Number(maxSeqResult[0]?.max_seq || 0);

    const inserted: any[] = [];
    for (const item of items) {
      nextSeq += 1;
      const row = await this.pg`
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
