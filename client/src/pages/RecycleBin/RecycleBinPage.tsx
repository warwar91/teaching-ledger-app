import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  RotateCcw,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { logger } from '@client/src/utils/logger';
import type { LedgerItem } from '@shared/api.interface';

import { Button } from '@client/src/components/ui/button';
import { Spinner } from '@client/src/components/ui/spinner';
import { Badge } from '@client/src/components/ui/badge';
import { Checkbox } from '@client/src/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@client/src/components/ui/empty';
import { Alert, AlertDescription } from '@client/src/components/ui/alert';
import { ledger } from '@client/src/api';
import { showConfirm } from '@client/src/utils/show-confirm';

const RecycleBinPage: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<LedgerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const list = await ledger.getRecycleList();
      setItems(list);
    } catch (err: unknown) {
      logger.error(`RecycleBinPage fetch failed: ${JSON.stringify(err)}`);
      toast.error('加载回收站失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(items.map((item) => item.id)));
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

  const handleRestore = async (id: string) => {
    setActionLoading(`restore-${id}`);
    try {
      await ledger.restoreLedger(id);
      toast.success('已恢复');
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      fetchItems();
    } catch (err: unknown) {
      logger.error(`RecycleBinPage restore failed: ${JSON.stringify(err)}`);
      toast.error('恢复失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePermanentDelete = async (id: string, name: string) => {
    if (!await showConfirm(`确定永久删除"${name}"吗？此操作不可恢复。`)) return;
    setActionLoading(`delete-${id}`);
    try {
      await ledger.permanentDeleteLedger(id);
      toast.success('已永久删除');
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      fetchItems();
    } catch (err: unknown) {
      logger.error(
        `RecycleBinPage permanent delete failed: ${JSON.stringify(err)}`,
      );
      toast.error('删除失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBatchRestore = async () => {
    if (selectedIds.size === 0) return;
    setActionLoading('batch-restore');
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map((id) => ledger.restoreLedger(id)));
      toast.success(`已恢复 ${ids.length} 个台账`);
      setSelectedIds(new Set());
      fetchItems();
    } catch (err: unknown) {
      logger.error(
        `RecycleBinPage batch restore failed: ${JSON.stringify(err)}`,
      );
      toast.error('批量恢复失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (
      !await showConfirm(`确定永久删除选中的 ${selectedIds.size} 个台账吗？此操作不可恢复。`)
    ) {
      return;
    }
    setActionLoading('batch-delete');
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map((id) => ledger.permanentDeleteLedger(id)));
      toast.success(`已永久删除 ${ids.length} 个台账`);
      setSelectedIds(new Set());
      fetchItems();
    } catch (err: unknown) {
      logger.error(
        `RecycleBinPage batch delete failed: ${JSON.stringify(err)}`,
      );
      toast.error('批量删除失败');
    } finally {
      setActionLoading(null);
    }
  };

  const allSelected = items.length > 0 && selectedIds.size === items.length;

  const isBatchLoading =
    actionLoading === 'batch-restore' || actionLoading === 'batch-delete';

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
            <Trash2 className="h-5 w-5 text-warning" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">回收站</h1>
            <p className="text-sm text-muted-foreground">
              共 {items.length} 个已删除台账
            </p>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBatchRestore}
              disabled={isBatchLoading}
              className="gap-2"
            >
              {isBatchLoading && <Spinner className="h-4 w-4" />}
              <RotateCcw className="h-4 w-4" />
              批量恢复 ({selectedIds.size})
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBatchDelete}
              disabled={isBatchLoading}
              className="gap-2"
            >
              {isBatchLoading && <Spinner className="h-4 w-4" />}
              <Trash2 className="h-4 w-4" />
              批量永久删除
            </Button>
          </div>
        )}
      </div>

      <Alert className="mb-4 border-warning/30 bg-warning/5">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <AlertDescription className="text-sm">
          回收站保留 14 天，到期自动清理。
        </AlertDescription>
      </Alert>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      ) : items.length === 0 ? (
        <Empty>
          <EmptyContent>
            <EmptyMedia variant="icon">
              <Trash2 className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>回收站为空</EmptyTitle>
            <EmptyDescription>
              已删除的台账会暂时保存在这里
            </EmptyDescription>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-200 hover:bg-transparent">
                <TableHead className="w-12 text-gray-600">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(checked) =>
                      handleSelectAll(checked === true)
                    }
                    aria-label="全选"
                  />
                </TableHead>
                <TableHead className="text-gray-600">台账名称</TableHead>
                <TableHead className="w-24 text-gray-600">类型</TableHead>
                <TableHead className="w-32 text-gray-600">记录数</TableHead>
                <TableHead className="w-40 text-gray-600">删除时间</TableHead>
                <TableHead className="w-44 text-right text-gray-600">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(item.id)}
                      onCheckedChange={(checked) =>
                        handleSelect(item.id, checked === true)
                      }
                      aria-label={`选择 ${item.name}`}
                    />
                  </TableCell>
                  <TableCell
                    className="cursor-pointer hover:text-primary"
                    onClick={() => navigate(`/ledger/${item.id}`)}
                  >
                    {item.name}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        item.ledgerType === 'weekly' ? 'default' : 'secondary'
                      }
                    >
                      {item.ledgerType === 'weekly' ? '周台账' : '学期台账'}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.recordCount}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.deletedAt
                      ? new Date(item.deletedAt).toLocaleString('zh-CN')
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(item.id)}
                        disabled={actionLoading === `restore-${item.id}`}
                        className="gap-1"
                      >
                        {actionLoading === `restore-${item.id}` ? (
                          <Spinner className="h-3 w-3" />
                        ) : (
                          <RotateCcw className="h-3 w-3" />
                        )}
                        恢复
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePermanentDelete(item.id, item.name)}
                        disabled={actionLoading === `delete-${item.id}`}
                        className="gap-1 text-destructive border-destructive/30 hover:text-destructive"
                      >
                        {actionLoading === `delete-${item.id}` ? (
                          <Spinner className="h-3 w-3" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                        永久删除
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default RecycleBinPage;
