import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@server/database/database.module';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, desc } from 'drizzle-orm';
import { announcement } from '@server/schema';

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
      })
      .from(announcement)
      .where(eq(announcement.isPublished, true))
      .orderBy(desc(announcement.publishDate))
      .limit(pageSize)
      .offset(offset);

    const countResult = await this.db
      .select({ count: announcement.id })
      .from(announcement)
      .where(eq(announcement.isPublished, true));

    const total = countResult.length;
    return {
      list: rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string) {
    const rows = await this.db
      .select()
      .from(announcement)
      .where(eq(announcement.id, id))
      .limit(1);
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
    const rows = await this.db
      .insert(announcement)
      .values({
        title: data.title,
        content: data.content,
        publisher: data.publisher,
        attachmentUrl: data.attachmentUrl,
        attachmentName: data.attachmentName,
        createdBy: data.createdBy,
      })
      .returning();
    return rows[0];
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
    const rows = await this.db
      .update(announcement)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(announcement.id, id))
      .returning();
    if (rows.length === 0) {
      throw new NotFoundException('公告不存在');
    }
    return rows[0];
  }

  async remove(id: string) {
    const rows = await this.db
      .delete(announcement)
      .where(eq(announcement.id, id))
      .returning({ id: announcement.id });
    if (rows.length === 0) {
      throw new NotFoundException('公告不存在');
    }
    return { success: true };
  }

  async adminFindAll() {
    return this.db
      .select()
      .from(announcement)
      .orderBy(desc(announcement.publishDate));
  }
}
