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
import { ledger } from '@client/src/api';
import { showConfirm } from '@client/src/utils/show-confirm';

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

  const title = ledgerType === 'weekly' ? '周台账' : '学期台账';
  const Icon = ledgerType === 'weekly' ? CalendarDays : GraduationCap;

  const fetchLedgers = useCallback(async () => {
    setLoading(true);
    try {
      const list = await ledger.getLedgerList(ledgerType);
      setLedgers(list);
    } catch (err: unknown) {
      logger.error(`LedgerListPage fetch failed: ${JSON.stringify(err)}`);
      toast.error('加载台账列表失败');
    } finally {
      setLoading(false);
    }
  }, [ledgerType]);

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
    <div className="mx-auto max-w-6xl p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">
              共 {ledgers.length} 个台账
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBatchDelete}
              disabled={batchDeleting}
              className="text-destructive border-destructive/30 hover:text-destructive"
            >
              {batchDeleting && <Spinner className="h-4 w-4" />}
              <Trash2 className="h-4 w-4" />
              批量删除 ({selectedIds.size})
            </Button>
          )}
          <Button size="sm" onClick={() => setCreateOpen(true)}>
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
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              新建台账
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          {/* Select all */}
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
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
                className="group cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
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
                      <CardTitle className="text-base font-semibold line-clamp-1">
                        {item.name}
                      </CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                      onClick={(e) => handleDelete(item.id, item.name, e)}
                      aria-label="删除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">记录条数</span>
                      <span className="font-medium">{item.recordCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">未完成</span>
                      <Badge
                        variant={item.pendingCount > 0 ? 'destructive' : 'secondary'}
                        className={
                          item.pendingCount > 0 ? '' : 'text-muted-foreground'
                        }
                      >
                        {item.pendingCount} 条
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-muted-foreground">
                        创建于 {new Date(item.createdAt).toLocaleDateString('zh-CN')}
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
