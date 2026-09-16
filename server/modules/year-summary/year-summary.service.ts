import { Injectable, Inject, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PG_CLIENT } from '@server/database/database.module';
import type { Sql } from 'postgres';

@Injectable()
export class YearSummaryService {
  constructor(@Inject(PG_CLIENT) private readonly sql: Sql) {}

  // 固定学年列表
  getAcademicYears() {
    return [
      { value: '2026-2027', label: '2026-2027学年' },
      { value: '2027-2028', label: '2027-2028学年' },
      { value: '2028-2029', label: '2028-2029学年' },
      { value: '2029-2030', label: '2029-2030学年' },
    ];
  }

  async listByYear(userId: string, academicYear: string) {
    const rows = await this.sql`
      SELECT id, academic_year as "academicYear", title, file_url as "fileUrl",
        file_name as "fileName", file_size as "fileSize",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM year_summary
      WHERE owner_user_id = ${userId} AND academic_year = ${academicYear}
      ORDER BY created_at DESC
    `;
    return rows;
  }

  async listAllForAdmin() {
    const rows = await this.sql`
      SELECT ys.id, ys.owner_user_id as "ownerUserId",
        u.username,
        ys.academic_year as "academicYear", ys.title, ys.file_url as "fileUrl",
        ys.file_name as "fileName", ys.file_size as "fileSize",
        ys.created_at as "createdAt", ys.updated_at as "updatedAt"
      FROM year_summary ys
      LEFT JOIN app_user u ON ys.owner_user_id = u.user_id
      ORDER BY ys.created_at DESC
    `;
    return rows;
  }

  async create(userId: string, data: {
    academicYear: string;
    title: string;
    fileUrl: string;
    fileName: string;
    fileSize?: number;
  }) {
    if (!data.academicYear || !data.title || !data.fileUrl || !data.fileName) {
      throw new BadRequestException('缺少必填字段');
    }
    const rows = await this.sql`
      INSERT INTO year_summary (owner_user_id, academic_year, title, file_url, file_name, file_size)
      VALUES (${userId}, ${data.academicYear}, ${data.title}, ${data.fileUrl}, ${data.fileName}, ${data.fileSize || 0})
      RETURNING id, academic_year as "academicYear", title, file_url as "fileUrl",
        file_name as "fileName", file_size as "fileSize",
        created_at as "createdAt", updated_at as "updatedAt"
    `;
    return rows[0];
  }

  async update(userId: string, id: string, data: { title?: string; fileUrl?: string; fileName?: string; fileSize?: number }) {
    const record = await this.sql`SELECT owner_user_id FROM year_summary WHERE id = ${id}::uuid`;
    if (record.length === 0) throw new NotFoundException('总结不存在');
    if (record[0].owner_user_id !== userId) throw new ForbiddenException('无权操作此总结');

    const rows = await this.sql`
      UPDATE year_summary SET
        title = COALESCE(${data.title || null}, title),
        file_url = COALESCE(${data.fileUrl || null}, file_url),
        file_name = COALESCE(${data.fileName || null}, file_name),
        file_size = COALESCE(${data.fileSize || null}, file_size),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}::uuid
      RETURNING id, academic_year as "academicYear", title, file_url as "fileUrl",
        file_name as "fileName", file_size as "fileSize",
        created_at as "createdAt", updated_at as "updatedAt"
    `;
    return rows[0];
  }

  async remove(userId: string, id: string) {
    const record = await this.sql`SELECT owner_user_id FROM year_summary WHERE id = ${id}::uuid`;
    if (record.length === 0) throw new NotFoundException('总结不存在');
    if (record[0].owner_user_id !== userId) throw new ForbiddenException('无权操作此总结');

    await this.sql`DELETE FROM year_summary WHERE id = ${id}::uuid`;
    return { success: true };
  }

  async getById(userId: string, id: string) {
    const rows = await this.sql`
      SELECT id, academic_year as "academicYear", title, file_url as "fileUrl",
        file_name as "fileName", file_size as "fileSize",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM year_summary WHERE id = ${id}::uuid
    `;
    if (rows.length === 0) throw new NotFoundException('总结不存在');
    if (rows[0].owner_user_id !== userId) throw new ForbiddenException('无权查看此总结');
    return rows[0];
  }
}
