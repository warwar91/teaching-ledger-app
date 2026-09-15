import http from './instance';

export interface AnnouncementListItem {
  id: string;
  title: string;
  publisher: string | null;
  publishDate: string;
}

export interface AnnouncementDetail extends AnnouncementListItem {
  content: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
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
  content: string;
  publisher?: string;
  attachmentUrl?: string;
  attachmentName?: string;
}

export interface AnnouncementUpdateData extends Partial<AnnouncementCreateData> {
  isPublished?: boolean;
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
  uploadAttachment: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return http.post<{ url: string; originalName: string }>('/upload/attachment', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
