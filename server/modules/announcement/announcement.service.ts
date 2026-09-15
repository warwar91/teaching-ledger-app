import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@server/database/database.module';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

@Injectable()
export class AnnouncementService {
  private readonly pg: any;

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {
    // Use the underlying postgres-js client for raw queries
    this.pg = (this.db as any).$client;
  }

  async findAll(page: number = 1, pageSize: number = 12) {
    const offset = (page - 1) * pageSize;
    const rows = await this.pg`
      SELECT id, title, publisher, publish_date
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
    return rows[0];
  }

  async create(data: {
    title: string;
    content: string;
    publisher?: string;
    attachmentUrl?: string;
    attachmentName?: string;
    createdBy?: string;
  }) {
    console.log('[AnnouncementService] create called with:', { title: data.title });
    try {
      const rows = await this.pg`
        INSERT INTO announcement (title, content, publisher, attachment_url, attachment_name, created_by)
        VALUES (
          ${data.title},
          ${data.content},
          ${data.publisher || null},
          ${data.attachmentUrl || null},
          ${data.attachmentName || null},
          ${data.createdBy || null}
        )
        RETURNING *
      `;
      console.log('[AnnouncementService] insert result:', rows);
      return rows[0];
    } catch (err) {
      console.error('[AnnouncementService] insert error:', err);
      throw err;
    }
  }

  async update(id: string, data: {
    title?: string;
    content?: string;
    publisher?: string;
    attachmentUrl?: string;
    attachmentName?: string;
    isPublished?: boolean;
    updatedBy?: string;
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
    console.log('[AnnouncementService] adminFindAll called');
    try {
      const rows = await this.pg`
        SELECT * FROM announcement ORDER BY publish_date DESC
      `;
      console.log('[AnnouncementService] adminFindAll result count:', rows.length);
      return rows;
    } catch (err) {
      console.error('[AnnouncementService] adminFindAll error:', err);
      throw err;
    }
  }
}
