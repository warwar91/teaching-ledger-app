import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Bell,
  Download,
  Minus,
  Plus,
} from 'lucide-react';
import { logger } from '@client/src/utils/logger';
import type {
  LedgerDetail,
  LedgerRecordItem,
  ProgressStatus,
  ReminderItem,
} from '@shared/api.interface';

import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import { Badge } from '@client/src/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@client/src/components/ui/dropdown-menu';
import { Spinner } from '@client/src/components/ui/spinner';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@client/src/components/ui/empty';
import { ledger } from '@client/src/api';
import { showConfirm } from '@client/src/utils/show-confirm';
import { Image } from '@client/src/components/ui/image';
import { http } from '@client/src/api/instance';


interface NewRecordRow {
  key: number;
  content: string;
  expectedDate: string;
  mainExecutor: string;
  imageUrls: string[];
  imageUploading: boolean;
}

const MAX_IMAGE_SIZE = 600 * 1024; // 600KB
const MAX_IMAGES_PER_RECORD = 2;

const statusBadge: Record<ProgressStatus, { label: string; variant: string }> = {
  pending: { label: '待处理', variant: 'destructive' },
  in_progress: { label: '进行中', variant: 'secondary' },
  completed: { label: '已完成', variant: 'default' },
};

const REMINDER_SHOWN_KEY = 'ledger_reminder_shown';

const LedgerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<LedgerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [reminderOpen, setReminderOpen] = useState(false);

  // New record rows
  const [newRows, setNewRows] = useState<NewRecordRow[]>([]);
  const keyCounter = useRef(0);

  const generateEmptyRow = (): NewRecordRow => {
    keyCounter.current += 1;
    return {
      key: keyCounter.current,
      content: '',
      expectedDate: '',
      mainExecutor: '',
      imageUrls: [],
      imageUploading: false,
    };
  };

  const initEmptyRows = useCallback(() => {
    const rows: NewRecordRow[] = [];
    for (let i = 0; i < 5; i += 1) rows.push(generateEmptyRow());
    setNewRows(rows);
  }, []);

  useEffect(() => {
    initEmptyRows();
  }, [initEmptyRows]);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await ledger.getLedgerDetail(id);
      setDetail(data);
    } catch (err: unknown) {
      logger.error(`LedgerDetailPage fetch failed: ${JSON.stringify(err)}`);
      toast.error('加载台账详情失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // Load reminders on first visit
  useEffect(() => {
    const checkReminders = async () => {
      try {
        const list = await ledger.getReminders();
        if (list.length > 0) {
          setReminders(list);
          // Show every time we enter the page
          setReminderOpen(true);
        }
      } catch (err: unknown) {
        logger.error(
          `LedgerDetailPage reminders failed: ${JSON.stringify(err)}`,
        );
      }
    };
    checkReminders();
  }, []);

  const updateRow = (key: number, field: keyof NewRecordRow, value: string) => {
    setNewRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, [field]: value } : row)),
    );
  };

  const handleImageUpload = async (
    key: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check image type
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      e.target.value = '';
      return;
    }

    // Check image size (600KB limit)
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error(`图片大小超过限制，单张图片最大600KB（当前${Math.round(file.size / 1024)}KB）`);
      e.target.value = '';
      return;
    }

    // Check max images per record
    const currentRow = newRows.find((r) => r.key === key);
    if (currentRow && currentRow.imageUrls.length >= MAX_IMAGES_PER_RECORD) {
      toast.error(`每条记录最多上传${MAX_IMAGES_PER_RECORD}张图片`);
      e.target.value = '';
      return;
    }

    setNewRows((prev) =>
      prev.map((row) =>
        row.key === key ? { ...row, imageUploading: true } : row,
      ),
    );
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await http.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = res.data as { url: string };
      setNewRows((prev) =>
        prev.map((row) =>
          row.key === key
            ? { ...row, imageUrls: [...row.imageUrls, data.url], imageUploading: false }
            : row,
        ),
      );
      toast.success('图片上传成功');
    } catch (err) {
      logger.error(`图片上传失败: ${String(err)}`);
      toast.error('图片上传失败，请检查图片大小是否超过600KB');
      setNewRows((prev) =>
        prev.map((row) =>
          row.key === key ? { ...row, imageUploading: false } : row,
        ),
      );
    } finally {
      e.target.value = '';
    }
  };

  const handleRemoveImage = (key: number, imageIndex: number) => {
    setNewRows((prev) =>
      prev.map((row) =>
        row.key === key
          ? { ...row, imageUrls: row.imageUrls.filter((_, i) => i !== imageIndex) }
          : row,
      ),
    );
  };

  const addRow = () => {
    setNewRows((prev) => [...prev, generateEmptyRow()]);
  };

  const removeRow = (key: number) => {
    setNewRows((prev) => {
      if (prev.length <= 1) return [generateEmptyRow()];
      return prev.filter((r) => r.key !== key);
    });
  };

  const handleSubmitRecords = async () => {
    if (!id) return;
    const validRows = newRows.filter((r) => r.content.trim());
    if (validRows.length === 0) {
      toast.error('请至少填写一条记录的内容');
      return;
    }
    setSubmitting(true);
    try {
      await ledger.addRecords(id, {
        records: validRows.map((r) => ({
          content: r.content.trim(),
          expectedDate: r.expectedDate || null,
          mainExecutor: r.mainExecutor.trim() || null,
          imageUrls: r.imageUrls,
        })),
      });
      toast.success(`成功添加 ${validRows.length} 条记录`);
      initEmptyRows();
      fetchDetail();
    } catch (err: unknown) {
      logger.error(`LedgerDetailPage submit failed: ${JSON.stringify(err)}`);
      toast.error('提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (
    recordId: string,
    status: ProgressStatus,
  ) => {
    try {
      await ledger.updateRecord(recordId, { progressStatus: status });
      toast.success('状态已更新');
      fetchDetail();
    } catch (err: unknown) {
      logger.error(
        `LedgerDetailPage update status failed: ${JSON.stringify(err)}`,
      );
      toast.error('更新失败');
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!await showConfirm('确定删除这条记录吗？')) return;
    try {
      await ledger.deleteRecord(recordId);
      toast.success('已删除');
      fetchDetail();
    } catch (err: unknown) {
      logger.error(
        `LedgerDetailPage delete record failed: ${JSON.stringify(err)}`,
      );
      toast.error('删除失败');
    }
  };

  const handleExport = async () => {
    if (!id) return;
    setExporting(true);
    try {
      await ledger.exportLedger(id);
      toast.success('导出成功');
    } catch (err: unknown) {
      logger.error(`LedgerDetailPage export failed: ${JSON.stringify(err)}`);
      toast.error('导出失败');
    } finally {
      setExporting(false);
    }
  };

  const handleSkipReminder = async (recordId: string) => {
    try {
      await ledger.skipReminder(recordId);
      setReminders((prev) => prev.filter((r) => r.id !== recordId));
      toast.success('已关闭提醒');
    } catch (err: unknown) {
      logger.error(
        `LedgerDetailPage skip reminder failed: ${JSON.stringify(err)}`,
      );
      toast.error('操作失败');
    }
  };

  const backPath =
    detail?.ledgerType === 'weekly' ? '/weekly' : '/semester';

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(backPath)}
            aria-label="返回"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {loading ? '加载中...' : detail?.name}
            </h1>
            {!loading && detail && (
              <p className="text-sm text-muted-foreground">
                共 {detail.records.length} 条记录
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {reminders.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReminderOpen(true)}
              className="gap-2"
            >
              <Bell className="h-4 w-4" />
              提醒
              <Badge variant="destructive" className="ml-1">
                {reminders.length}
              </Badge>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting || loading}
            className="gap-2"
          >
            {exporting ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            导出
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <>
          {/* Records Table */}
          <div className="mb-8 rounded-lg border border-border bg-card shadow-sm">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">
                工作记录
              </h2>
            </div>
            {detail && detail.records.length === 0 ? (
              <Empty>
                <EmptyContent>
                  <EmptyMedia variant="icon">
                    <Bell className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyTitle>暂无记录</EmptyTitle>
                  <EmptyDescription>
                    在下方录入区域添加您的第一条工作记录
                  </EmptyDescription>
                </EmptyContent>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14 text-center">序号</TableHead>
                    <TableHead>内容</TableHead>
                    <TableHead className="w-32">预计完成时间</TableHead>
                    <TableHead className="w-28">主要执行人</TableHead>
                    <TableHead className="w-24">进度状态</TableHead>
                    <TableHead className="w-32 text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail?.records.map((record: LedgerRecordItem) => (
                    <TableRow key={record.id}>
                      <TableCell className="text-center text-muted-foreground">
                        {record.seqNo}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={record.content}>
                          {record.content}
                        </div>
                        {record.imageUrls && record.imageUrls.length > 0 && (
                          <div className="mt-1 flex gap-1">
                            {record.imageUrls.slice(0, 3).map((url, idx) => (
                              <a
                                key={idx}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-primary hover:underline"
                              >
                                图片{idx + 1}
                              </a>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{record.expectedDate || '-'}</TableCell>
                      <TableCell>{record.mainExecutor || '-'}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            statusBadge[record.progressStatus]
                              .variant as 'default' | 'secondary' | 'destructive'
                          }
                        >
                          {statusBadge[record.progressStatus].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              操作
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                handleUpdateStatus(record.id, 'pending')
                              }
                              className="cursor-pointer"
                            >
                              标记为待处理
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleUpdateStatus(record.id, 'in_progress')
                              }
                              className="cursor-pointer"
                            >
                              标记为进行中
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleUpdateStatus(record.id, 'completed')
                              }
                              className="cursor-pointer"
                            >
                              标记为已完成
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteRecord(record.id)}
                              className="cursor-pointer text-destructive focus:text-destructive"
                            >
                              删除记录
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* New records entry area */}
          <div className="rounded-lg border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">
                录入记录
              </h2>
              <span className="text-xs text-muted-foreground">
                填写后点击"提交记录"保存（空行将被忽略）
              </span>
            </div>

            <div className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14 text-center">#</TableHead>
                    <TableHead>内容 *</TableHead>
                    <TableHead className="w-40">预计完成时间</TableHead>
                    <TableHead className="w-36">主要执行人</TableHead>
                    <TableHead className="w-48">图片（最多2张）</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {newRows.map((row, idx) => (
                    <TableRow key={row.key}>
                      <TableCell className="text-center text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="请输入工作内容"
                          value={row.content}
                          onChange={(e) =>
                            updateRow(row.key, 'content', e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={row.expectedDate}
                          onChange={(e) =>
                            updateRow(row.key, 'expectedDate', e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="执行人"
                          value={row.mainExecutor}
                          onChange={(e) =>
                            updateRow(row.key, 'mainExecutor', e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/jpg"
                              onChange={(e) => handleImageUpload(row.key, e)}
                              className="hidden"
                              id={`img-upload-${row.key}`}
                              disabled={row.imageUrls.length >= MAX_IMAGES_PER_RECORD}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => document.getElementById(`img-upload-${row.key}`)?.click()}
                              disabled={row.imageUploading || row.imageUrls.length >= MAX_IMAGES_PER_RECORD}
                              className="shrink-0"
                            >
                              {row.imageUploading ? (
                                <Spinner className="h-3 w-3 mr-1" />
                              ) : (
                                <Plus className="h-3 w-3 mr-1" />
                              )}
                              {row.imageUrls.length >= MAX_IMAGES_PER_RECORD
                                ? `已达上限(${row.imageUrls.length}/${MAX_IMAGES_PER_RECORD})`
                                : `上传图片(${row.imageUrls.length}/${MAX_IMAGES_PER_RECORD})`}
                            </Button>
                          </div>
                          {row.imageUrls.length > 0 && (
                            <div className="flex gap-1.5">
                              {row.imageUrls.map((url, idx) => (
                                <div
                                  key={idx}
                                  className="relative w-10 h-10 rounded border shrink-0 overflow-hidden group"
                                >
                                  <Image
                                    src={url}
                                    alt={`图片${idx + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveImage(row.key, idx)}
                                    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    aria-label="删除图片"
                                  >
                                    <span className="text-white text-xs">删除</span>
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          <span className="text-xs text-muted-foreground">
                            单张≤600KB，JPG/PNG
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRow(row.key)}
                          aria-label="删除行"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addRow}
                  className="gap-1"
                >
                  <Plus className="h-4 w-4" />
                  增加一行
                </Button>
                <Button onClick={handleSubmitRecords} disabled={submitting}>
                  {submitting && <Spinner className="h-4 w-4" />}
                  提交记录
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Reminder Dialog */}
      <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-warning" />
              智能提醒
            </DialogTitle>
            <DialogDescription>
              您有 {reminders.length} 条待处理或即将到期的记录
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-96 space-y-2 overflow-y-auto">
            {reminders.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between rounded-md border border-border p-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        item.reason === 'both' || item.reason === 'pending'
                          ? 'destructive'
                          : 'outline'
                      }
                      className={
                        item.reason === 'due_soon'
                          ? 'text-warning border-warning/50 bg-warning/10'
                          : ''
                      }
                    >
                      {item.reason === 'both'
                        ? '待处理·即将到期'
                        : item.reason === 'pending'
                        ? '待处理'
                        : '即将到期'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {item.ledgerName}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-foreground line-clamp-2">
                    {item.content}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    预计完成：{item.expectedDate || '未设置'}
                    {item.daysLeft !== undefined &&
                      item.expectedDate &&
                      `（还剩 ${item.daysLeft} 天）`}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSkipReminder(item.id)}
                  className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                >
                  不再提示
                </Button>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReminderOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LedgerDetailPage;
