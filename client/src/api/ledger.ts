import { logger } from '@client/src/utils/logger';
import type {
  LedgerItem,
  LedgerDetail,
  LedgerRecordItem,
  CreateLedgerRequest,
  CreateRecordsRequest,
  UpdateRecordRequest,
  ReminderItem,
} from '@shared/api.interface';
import { http } from './instance';
import {
  extractFilenameFromHeader,
  triggerBlobDownload,
} from '@client/src/utils/download';

export async function getLedgerList(
  type: 'weekly' | 'semester',
): Promise<LedgerItem[]> {
  try {
    const res = await http.get<LedgerItem[]>('/ledger/list', {
      params: { type },
    });
    return res.data;
  } catch (err: unknown) {
    logger.error(`ledger.getLedgerList failed: ${JSON.stringify(err)}`);
    throw err;
  }
}

export async function createLedger(
  data: CreateLedgerRequest,
): Promise<LedgerItem> {
  try {
    const res = await http.post<LedgerItem>('/ledger/create', data);
    return res.data;
  } catch (err: unknown) {
    logger.error(`ledger.createLedger failed: ${JSON.stringify(err)}`);
    throw err;
  }
}

export async function getLedgerDetail(id: string): Promise<LedgerDetail> {
  try {
    const res = await http.get<LedgerDetail>(`/ledger/${id}`);
    return res.data;
  } catch (err: unknown) {
    logger.error(`ledger.getLedgerDetail failed: ${JSON.stringify(err)}`);
    throw err;
  }
}

export async function deleteLedger(id: string): Promise<void> {
  try {
    await http.delete(`/ledger/${id}`);
  } catch (err: unknown) {
    logger.error(`ledger.deleteLedger failed: ${JSON.stringify(err)}`);
    throw err;
  }
}

export async function batchDeleteLedgers(ids: string[]): Promise<void> {
  try {
    await http.post('/ledger/batch-delete', { ids });
  } catch (err: unknown) {
    logger.error(`ledger.batchDeleteLedgers failed: ${JSON.stringify(err)}`);
    throw err;
  }
}

export async function getRecycleList(): Promise<LedgerItem[]> {
  try {
    const res = await http.get<LedgerItem[]>('/ledger/recycle/list');
    return res.data;
  } catch (err: unknown) {
    logger.error(`ledger.getRecycleList failed: ${JSON.stringify(err)}`);
    throw err;
  }
}

export async function restoreLedger(id: string): Promise<void> {
  try {
    await http.post(`/ledger/recycle/restore/${id}`);
  } catch (err: unknown) {
    logger.error(`ledger.restoreLedger failed: ${JSON.stringify(err)}`);
    throw err;
  }
}

export async function permanentDeleteLedger(id: string): Promise<void> {
  try {
    await http.delete(`/ledger/recycle/permanent/${id}`);
  } catch (err: unknown) {
    logger.error(`ledger.permanentDeleteLedger failed: ${JSON.stringify(err)}`);
    throw err;
  }
}

export async function addRecords(
  ledgerId: string,
  records: CreateRecordsRequest,
): Promise<LedgerRecordItem[]> {
  try {
    const res = await http.post<LedgerRecordItem[]>(
      `/ledger/${ledgerId}/records`,
      records,
    );
    return res.data;
  } catch (err: unknown) {
    logger.error(`ledger.addRecords failed: ${JSON.stringify(err)}`);
    throw err;
  }
}

export async function updateRecord(
  recordId: string,
  data: UpdateRecordRequest,
): Promise<LedgerRecordItem> {
  try {
    const res = await http.patch<LedgerRecordItem>(
      `/ledger/record/${recordId}`,
      data,
    );
    return res.data;
  } catch (err: unknown) {
    logger.error(`ledger.updateRecord failed: ${JSON.stringify(err)}`);
    throw err;
  }
}

export async function deleteRecord(recordId: string): Promise<void> {
  try {
    await http.delete(`/ledger/record/${recordId}`);
  } catch (err: unknown) {
    logger.error(`ledger.deleteRecord failed: ${JSON.stringify(err)}`);
    throw err;
  }
}

export async function getReminders(): Promise<ReminderItem[]> {
  try {
    const res = await http.get<ReminderItem[]>(
      '/ledger/reminders/pending',
    );
    return res.data;
  } catch (err: unknown) {
    logger.error(`ledger.getReminders failed: ${JSON.stringify(err)}`);
    throw err;
  }
}

export async function skipReminder(recordId: string): Promise<void> {
  try {
    await http.post(`/ledger/record/${recordId}/skip-reminder`);
  } catch (err: unknown) {
    logger.error(`ledger.skipReminder failed: ${JSON.stringify(err)}`);
    throw err;
  }
}

export async function exportLedger(ledgerId: string): Promise<void> {
  try {
    const res = await http.get(`/ledger/export/${ledgerId}`, {
      responseType: 'blob',
    });
    const filename = extractFilenameFromHeader(
      res.headers['content-disposition'] ?? null,
    );
    triggerBlobDownload(res.data as Blob, filename);
  } catch (err: unknown) {
    logger.error(`ledger.exportLedger failed: ${JSON.stringify(err)}`);
    throw err;
  }
}
