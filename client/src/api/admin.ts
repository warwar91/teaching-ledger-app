import { logger } from '@client/src/utils/logger';
import type {
  AdminUserItem,
  LedgerItem,
  LedgerDetail,
} from '@shared/api.interface';
import { http } from './instance';
import {
  extractFilenameFromHeader,
  triggerBlobDownload,
} from '@client/src/utils/download';

export async function getUsers(): Promise<AdminUserItem[]> {
  try {
    const res = await http.get<AdminUserItem[]>('/admin/users');
    return res.data;
  } catch (err: unknown) {
    logger.error(`admin.getUsers failed: ${JSON.stringify(err)}`);
    throw err;
  }
}

export async function getUserLedgers(
  userId: string,
  type?: string,
): Promise<LedgerItem[]> {
  try {
    const res = await http.get<LedgerItem[]>(
      `/admin/users/${userId}/ledgers`,
      { params: type ? { type } : undefined },
    );
    return res.data;
  } catch (err: unknown) {
    logger.error(`admin.getUserLedgers failed: ${JSON.stringify(err)}`);
    throw err;
  }
}

export async function getLedgerDetail(id: string): Promise<LedgerDetail> {
  try {
    const res = await http.get<LedgerDetail>(
      `/admin/ledgers/${id}`,
    );
    return res.data;
  } catch (err: unknown) {
    logger.error(`admin.getLedgerDetail failed: ${JSON.stringify(err)}`);
    throw err;
  }
}

export async function clearUserData(
  userId: string,
): Promise<{ deletedLedgers: number }> {
  try {
    const res = await http.delete<{ deletedLedgers: number }>(
      `/admin/users/${userId}/data`,
    );
    return res.data;
  } catch (err: unknown) {
    logger.error(`admin.clearUserData failed: ${JSON.stringify(err)}`);
    throw err;
  }
}

export async function resetPassword(
  userId: string,
  newPassword: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await http.post(
      `/admin/users/${userId}/reset-password`,
      { newPassword },
    );
    return res.data;
  } catch (err: unknown) {
    logger.error(`admin.resetPassword failed: ${JSON.stringify(err)}`);
    throw err;
  }
}

export async function deleteUser(
  userId: string,
): Promise<{
  userId: string;
  username: string;
  deletedLedgers: number;
  deletedRecords: number;
  deletedSessions: number;
  deletedLoginAttempts: number;
}> {
  try {
    const res = await http.delete(
      `/admin/users/${userId}`,
      { data: { confirm: true } },
    );
    return res.data;
  } catch (err: unknown) {
    logger.error(`admin.deleteUser failed: ${JSON.stringify(err)}`);
    throw err;
  }
}

export async function exportLedger(ledgerId: string): Promise<void> {
  try {
    const res = await http.get(
      `/admin/export/${ledgerId}`,
      { responseType: 'blob' },
    );
    const filename = extractFilenameFromHeader(
      res.headers['content-disposition'] ?? null,
    );
    triggerBlobDownload(res.data as Blob, filename);
  } catch (err: unknown) {
    logger.error(`admin.exportLedger failed: ${JSON.stringify(err)}`);
    throw err;
  }
}
