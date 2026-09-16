import { http } from './instance';

export interface YearSummaryItem {
  id: string;
  academicYear: string;
  title: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicYear {
  value: string;
  label: string;
}

export const getYears = async (): Promise<AcademicYear[]> => {
  const res = await http.get('/year-summaries/years');
  return res.data;
};

export const listByYear = async (year: string): Promise<YearSummaryItem[]> => {
  const res = await http.get('/year-summaries', { params: { year } });
  return res.data;
};

export const createSummary = async (data: {
  academicYear: string;
  title: string;
  fileUrl: string;
  fileName: string;
  fileSize?: number;
}) => {
  const res = await http.post('/year-summaries', data);
  return res.data;
};

export const updateSummary = async (id: string, data: {
  title?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
}) => {
  const res = await http.patch(`/year-summaries/${id}`, data);
  return res.data;
};

export const deleteSummary = async (id: string) => {
  const res = await http.delete(`/year-summaries/${id}`);
  return res.data;
};

export const adminListAll = async (): Promise<(YearSummaryItem & { username: string })[]> => {
  const res = await http.get('/year-summaries/admin/all');
  return res.data;
};
