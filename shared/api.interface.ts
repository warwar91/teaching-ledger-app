/* 前后端共享的类型写在这里 */

export type LedgerType = 'weekly' | 'semester';
export type ProgressStatus = 'pending' | 'in_progress' | 'completed';
export type UserRole = 'admin' | 'user';

export interface LedgerItem {
  id: string;
  name: string;
  ledgerType: LedgerType;
  ownerUserId: string;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  recordCount: number;
  pendingCount: number;
}

export interface LedgerRecordItem {
  id: string;
  ledgerId: string;
  seqNo: number;
  content: string;
  imageUrls: string[];
  expectedDate: string | null;
  mainExecutor: string | null;
  progressStatus: ProgressStatus;
  skipReminder: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LedgerDetail {
  id: string;
  name: string;
  ledgerType: LedgerType;
  records: LedgerRecordItem[];
  createdAt: string;
}

export interface CreateLedgerRequest {
  name: string;
  ledgerType: LedgerType;
}

export interface CreateRecordsRequest {
  records: Array<{
    content: string;
    imageUrls?: string[];
    expectedDate?: string | null;
    mainExecutor?: string | null;
  }>;
}

export interface UpdateRecordRequest {
  content?: string;
  imageUrls?: string[];
  expectedDate?: string | null;
  mainExecutor?: string | null;
  progressStatus?: ProgressStatus;
  skipReminder?: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  userId: string;
  username: string;
  role: UserRole;
}

export interface UserInfo {
  userId: string;
  username: string;
  role: UserRole;
}

export interface ReminderItem {
  id: string;
  ledgerId: string;
  ledgerName: string;
  content: string;
  expectedDate: string | null;
  progressStatus: ProgressStatus;
  daysLeft: number;
  reason: 'pending' | 'due_soon' | 'both';
}

export interface AdminUserItem {
  userId: string;
  username: string;
  role: UserRole;
  createdAt: string;
  weeklyCount: number;
  semesterCount: number;
}
