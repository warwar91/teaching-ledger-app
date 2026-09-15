import http from './instance';

export interface AnnouncementListItem {
  id: string;
  title: string;
  publisher: string | null;
  publishDate: string;
  announcementType: 'regular' | 'task';
}

export interface AnnouncementItem {
  id: string;
  content: string;
  deadline: string | null;
  sortOrder: number;
}

export interface AnnouncementDetail extends AnnouncementListItem {
  content: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  items?: AnnouncementItem[];
}

export interface AnnouncementListResponse {
  list: AnnouncementListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AnnouncementCreateData {
  title: string;
  content?: string;
  publisher?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  announcementType?: 'regular' | 'task';
  items?: Array<{ content: string; deadline?: string }>;
}

export interface AnnouncementUpdateData extends Partial<AnnouncementCreateData> {
  isPublished?: boolean;
}

export interface UserLedger {
  id: string;
  name: string;
  ledgerType: string;
}

export const announcementApi = {
  getList: (page: number = 1, pageSize: number = 12) =>
    http.get<AnnouncementListResponse>('/announcements', { params: { page, pageSize } }),
  getDetail: (id: string) =>
    http.get<AnnouncementDetail>(`/announcements/${id}`),
  adminGetAll: () =>
    http.get<AnnouncementDetail[]>('/announcements/admin/all'),
  create: (data: AnnouncementCreateData) =>
    http.post<AnnouncementDetail>('/announcements', data),
  update: (id: string, data: AnnouncementUpdateData) =>
    http.patch<AnnouncementDetail>(`/announcements/${id}`, data),
  remove: (id: string) =>
    http.delete(`/announcements/${id}`),
  getMyLedgers: () =>
    http.get<UserLedger[]>('/announcements/my-ledgers'),
  claimItems: (id: string, data: {
    itemIds: string[];
    targetLedgerId: string;
    expectedDate?: string;
    mainExecutor?: string;
    remark?: string;
  }) =>
    http.post(`/announcements/${id}/claim`, data),
  uploadAttachment: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return http.post<{ url: string; originalName: string }>('/upload/attachment', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
