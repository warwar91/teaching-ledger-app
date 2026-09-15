import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, CalendarDays, User, Paperclip, ClipboardList,
  FolderPlus, CheckCircle2,
} from 'lucide-react';
import {
  announcementApi,
  AnnouncementDetail,
  AnnouncementItem,
  UserLedger,
} from '@client/src/api/announcement';
import { Spinner } from '@client/src/components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';

const AnnouncementDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<AnnouncementDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Claim feature
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [claimOpen, setClaimOpen] = useState(false);
  const [ledgers, setLedgers] = useState<UserLedger[]>([]);
  const [targetLedgerId, setTargetLedgerId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [mainExecutor, setMainExecutor] = useState('');
  const [remark, setRemark] = useState('');
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const res = await announcementApi.getDetail(id);
        setData(res.data);
      } catch (err) {
        toast.error('加载公告详情失败');
        navigate('/announcements');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  const toggleItem = (itemId: string) => {
    const newSet = new Set(selectedItems);
    if (newSet.has(itemId)) {
      newSet.delete(itemId);
    } else {
      newSet.add(itemId);
    }
    setSelectedItems(newSet);
  };

  const openClaimDialog = async () => {
    if (selectedItems.size === 0) {
      toast.error('请先勾选要添加的台账条目');
      return;
    }
    try {
      const res = await announcementApi.getMyLedgers();
      setLedgers(res.data);
      setClaimOpen(true);
    } catch (err) {
      toast.error('加载您的台账列表失败');
    }
  };

  const handleClaim = async () => {
    if (!targetLedgerId) {
      toast.error('请选择目标台账');
      return;
    }
    setClaiming(true);
    try {
      const res = await announcementApi.claimItems(id!, {
        itemIds: Array.from(selectedItems),
        targetLedgerId,
        expectedDate: expectedDate || undefined,
        mainExecutor: mainExecutor || undefined,
        remark: remark || undefined,
      });
      toast.success(`成功添加 ${(res.data as any).inserted} 条台账到您的台账中`);
      setClaimOpen(false);
      setSelectedItems(new Set());
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '添加失败，请重试');
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!data) return null;

  const isTask = data.announcementType === 'task';
  const items = data.items || [];

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-8">
      <button
        onClick={() => navigate('/announcements')}
        className="mb-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        返回公告列表
      </button>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Title */}
        <div className="border-b border-gray-100 px-5 sm:px-8 py-6">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-snug">
              {data.title}
            </h1>
            {isTask && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                <ClipboardList className="h-3 w-3" />
                台账公告
              </span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              {new Date(data.publishDate).toLocaleDateString('zh-CN', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </span>
            {data.publisher && (
              <span className="flex items-center gap-1.5">
                <User className="h-4 w-4" />
                发布人：{data.publisher}
              </span>
            )}
          </div>
        </div>

        {/* Content - regular type */}
        {!isTask && (
          <div className="px-5 sm:px-8 py-6">
            <div className="text-gray-800 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
              {data.content}
            </div>
          </div>
        )}

        {/* Task items */}
        {isTask && (
          <div className="px-5 sm:px-8 py-6">
            <p className="text-sm text-gray-500 mb-3">
              以下为本次发布的台账任务，请勾选需要的条目，然后点击"添加到我的台账"：
            </p>
            <div className="space-y-2">
              {items.map((item: AnnouncementItem, idx: number) => (
                <label
                  key={item.id}
                  className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                    selectedItems.has(item.id)
                      ? 'border-blue-400 bg-blue-50/40'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedItems.has(item.id)}
                    onChange={() => toggleItem(item.id)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 leading-relaxed">
                      <span className="font-medium text-gray-400 mr-2">{idx + 1}.</span>
                      {item.content}
                    </p>
                    {item.deadline && (
                      <p className="mt-1 text-xs text-orange-500 flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        截止日期：{new Date(item.deadline).toLocaleDateString('zh-CN')}
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </div>

            {selectedItems.size > 0 && (
              <div className="mt-4 flex items-center justify-between rounded-lg bg-blue-50 px-4 py-3">
                <span className="text-sm text-blue-700">
                  已选择 {selectedItems.size} 条条目
                </span>
                <Button
                  onClick={openClaimDialog}
                  className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  <FolderPlus className="h-4 w-4" />
                  添加到我的台账
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Attachment */}
        {data.attachmentUrl && (
          <div className="px-5 sm:px-8 pb-6">
            <div className="pt-4 border-t border-gray-100">
              <a
                href={data.attachmentUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <Paperclip className="h-4 w-4" />
                {data.attachmentName || '查看附件'}
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Claim Dialog */}
      <Dialog open={claimOpen} onOpenChange={setClaimOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>添加到我的台账</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">选择目标台账 *</label>
              <select
                value={targetLedgerId}
                onChange={(e) => setTargetLedgerId(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-100"
              >
                <option value="">请选择台账文件夹</option>
                {ledgers.map((l) => (
                  <option key={l.id} value={l.id}>
                    [{l.ledgerType === 'weekly' ? '周台账' : '学期台账'}] {l.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">预计完成时间（可选）</label>
              <Input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="mt-1.5 border-gray-200"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">主要执行人（可选）</label>
              <Input
                value={mainExecutor}
                onChange={(e) => setMainExecutor(e.target.value)}
                placeholder="例如：张三"
                className="mt-1.5 border-gray-200"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">备注（可选）</label>
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="可填写完成说明等"
                rows={2}
                className="mt-1.5 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-100 resize-y"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              将把选中的 {selectedItems.size} 条条目添加到目标台账，状态默认为"未处理"
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <Button
                variant="outline"
                onClick={() => setClaimOpen(false)}
                className="border-gray-200"
              >
                取消
              </Button>
              <Button
                onClick={handleClaim}
                disabled={claiming || !targetLedgerId}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {claiming ? '添加中...' : '确认添加'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AnnouncementDetailPage;
