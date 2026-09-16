import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  CalendarDays,
  GraduationCap,
  Plus,
  Trash2,
} from 'lucide-react';
import { logger } from '@client/src/utils/logger';
import type {
  LedgerItem,
  LedgerType,
} from '@shared/api.interface';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@client/src/components/ui/card';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Spinner } from '@client/src/components/ui/spinner';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@client/src/components/ui/empty';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { Checkbox } from '@client/src/components/ui/checkbox';
import { Badge } from '@client/src/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { ledger } from '@client/src/api';
import { showConfirm } from '@client/src/utils/show-confirm';

const SEMESTERS = [
  { value: '2026-2027-1', label: '2026-2027第一学期' },
  { value: '2026-2027-2', label: '2026-2027第二学期' },
  { value: '2027-2028-1', label: '2027-2028第一学期' },
  { value: '2027-2028-2', label: '2027-2028第二学期' },
  { value: '2028-2029-1', label: '2028-2029第一学期' },
  { value: '2028-2029-2', label: '2028-2029第二学期' },
  { value: '2029-2030-1', label: '2029-2030第一学期' },
  { value: '2029-2030-2', label: '2029-2030第二学期' },
];

interface LedgerListPageProps {
  ledgerType: LedgerType;
}

const LedgerListPage: React.FC<LedgerListPageProps> = ({ ledgerType }) => {
  const navigate = useNavigate();
  const [ledgers, setLedgers] = useState<LedgerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [semester, setSemester] = useState('2026-2027-1');

  const title = ledgerType === 'weekly' ? '周台账' : '学期台账';
  const Icon = ledgerType === 'weekly' ? CalendarDays : GraduationCap;

  const fetchLedgers = useCallback(async () => {
    setLoading(true);
    try {
      const list = await ledger.getLedgerList(ledgerType, semester);
      setLedgers(list);
    } catch (err: unknown) {
      logger.error(`LedgerListPage fetch failed: ${JSON.stringify(err)}`);
      toast.error('加载台账列表失败');
    } finally {
      setLoading(false);
    }
  }, [ledgerType, semester]);

  useEffect(() => {
    fetchLedgers();
    setSelectedIds(new Set());
  }, [fetchLedgers]);

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error('请输入台账名称');
      return;
    }
    setCreating(true);
    try {
      const item = await ledger.createLedger({
        name: newName.trim(),
        ledgerType,
        semester,
      });
      toast.success('创建成功');
      setCreateOpen(false);
      setNewName('');
      navigate(`/ledger/${item.id}`);
    } catch (err: unknown) {
      logger.error(`LedgerListPage create failed: ${JSON.stringify(err)}`);
      toast.error('创建失败，请重试');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!await showConfirm(`确定将"${name}"移入回收站吗？`)) return;
    try {
      await ledger.deleteLedger(id);
      toast.success('已移入回收站');
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      fetchLedgers();
    } catch (err: unknown) {
      logger.error(`LedgerListPage delete failed: ${JSON.stringify(err)}`);
      toast.error('删除失败');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(ledgers.map((l) => l.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) {
      toast.error('请先选择要删除的台账');
      return;
    }
    if (
      !await showConfirm(`确定将选中的 ${selectedIds.size} 个台账移入回收站吗？`)
    ) {
      return;
    }
    setBatchDeleting(true);
    try {
      await ledger.batchDeleteLedgers(Array.from(selectedIds));
      toast.success('批量删除成功');
      setSelectedIds(new Set());
      fetchLedgers();
    } catch (err: unknown) {
      logger.error(`LedgerListPage batch delete failed: ${JSON.stringify(err)}`);
      toast.error('批量删除失败');
    } finally {
      setBatchDeleting(false);
    }
  };

  const allSelected =
    ledgers.length > 0 && selectedIds.size === ledgers.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < ledgers.length;

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
            <Icon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              共 {ledgers.length} 个台账
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Select value={semester} onValueChange={setSemester}>
            <SelectTrigger className="w-48 border-gray-200">
              <SelectValue placeholder="选择学期" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {SEMESTERS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedIds.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBatchDelete}
              disabled={batchDeleting}
              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              {batchDeleting && <Spinner className="h-4 w-4" />}
              <Trash2 className="h-4 w-4" />
              批量删除 ({selectedIds.size})
            </Button>
          )}
          <Button 
            size="sm" 
            onClick={() => setCreateOpen(true)}
            className="gap-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-700 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            新建台账
          </Button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      ) : ledgers.length === 0 ? (
        <Empty>
          <EmptyContent>
            <EmptyMedia variant="icon">
              <Icon className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>暂无{title}</EmptyTitle>
            <EmptyDescription>
              点击右上角"新建台账"创建您的第一个{title}
            </EmptyDescription>
            <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-700">
              <Plus className="h-4 w-4" />
              新建台账
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          {/* Select all */}
          <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
            <Checkbox
              checked={allSelected}
              onCheckedChange={(checked) =>
                handleSelectAll(checked === true)
              }
              aria-label="全选"
            />
            <span>
              全选（已选 {selectedIds.size}/{ledgers.length}）
            </span>
          </div>

          <div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            data-ai-section-type="card-list"
          >
            {ledgers.map((item) => (
              <Card
                key={item.id}
                className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-blue-100 hover:border-blue-200 border-gray-200"
                onClick={() => navigate(`/ledger/${item.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedIds.has(item.id)}
                        onCheckedChange={(checked) =>
                          handleSelect(item.id, checked === true)
                        }
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`选择 ${item.name}`}
                      />
                      <CardTitle className="text-base font-semibold line-clamp-1 text-gray-900">
                        {item.name}
                      </CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 h-8 w-8"
                      onClick={(e) => handleDelete(item.id, item.name, e)}
                      aria-label="删除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">记录条数</span>
                      <span className="font-medium text-gray-900">{item.recordCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">未完成</span>
                      {item.pendingCount > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                          {item.pendingCount} 条
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">0 条</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-1.5 border-t border-gray-100">
                      <span className="text-xs text-gray-400">
                        {new Date(item.createdAt).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建{title}</DialogTitle>
            <DialogDescription>
              请输入台账名称，创建后可在其中添加工作记录。
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder={`请输入${title}名称`}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              取消
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Spinner className="h-4 w-4" />}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LedgerListPage;
