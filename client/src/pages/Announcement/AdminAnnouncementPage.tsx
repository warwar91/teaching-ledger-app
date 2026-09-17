import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Megaphone, Plus, Pencil, Trash2, X, Paperclip,
  CalendarDays, User, Eye, EyeOff, ClipboardList, FolderOpen, Import,
} from 'lucide-react';
import {
  announcementApi,
  AnnouncementDetail,
  AnnouncementItem,
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
import { Checkbox } from '@client/src/components/ui/checkbox';

const AdminAnnouncementPage: React.FC = () => {
  const [list, setList] = useState<AnnouncementDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<AnnouncementDetail | null>(null);

  // Form state
  const [announcementType, setAnnouncementType] = useState<'regular' | 'task'>('regular');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [publisher, setPublisher] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  // Task items
  const [items, setItems] = useState<Array<{ content: string; deadline: string }>>([
    { content: '', deadline: '' },
  ]);
  // Picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerLedgers, setPickerLedgers] = useState<Array<{
    id: string;
    name: string;
    ledgerType: string;
    semester: string;
    records: Array<{ id: string; content: string; deadline?: string; mainExecutor?: string }>;
  }>>([]);
  const [pickerSelected, setPickerSelected] = useState<Set<string>>(new Set());
  const [pickerSemesterFilter, setPickerSemesterFilter] = useState<string>('all');

  const loadList = async () => {
    setLoading(true);
    try {
      const res = await announcementApi.adminGetAll();
      setList(res.data);
    } catch (err) {
      toast.error('加载公告列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setAnnouncementType('regular');
    setTitle('');
    setContent('');
    setPublisher('');
    setAttachmentUrl('');
    setAttachmentName('');
    setItems([{ content: '', deadline: '' }]);
    setEditOpen(true);
  };

  const openEdit = (item: AnnouncementDetail) => {
    setEditing(item);
    setAnnouncementType(item.announcementType || 'regular');
    setTitle(item.title);
    setContent(item.content);
    setPublisher(item.publisher || '');
    setAttachmentUrl(item.attachmentUrl || '');
    setAttachmentName(item.attachmentName || '');
    if (item.items && item.items.length > 0) {
      setItems(item.items.map((it: AnnouncementItem) => ({
        content: it.content,
        deadline: it.deadline || '',
      })));
    } else {
      setItems([{ content: '', deadline: '' }]);
    }
    setEditOpen(true);
  };

  const addItem = () => {
    setItems([...items, { content: '', deadline: '' }]);
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: 'content' | 'deadline', value: string) => {
    const newItems = [...items];
    newItems[idx][field] = value;
    setItems(newItems);
  };

  const openPicker = async () => {
    setPickerOpen(true);
    setPickerLoading(true);
    setPickerSelected(new Set());
    setPickerSemesterFilter('all');
    try {
      const res = await announcementApi.getAdminLedgersWithRecords();
      setPickerLedgers(res.data || []);
    } catch (err) {
      toast.error('加载台账失败');
      setPickerOpen(false);
    } finally {
      setPickerLoading(false);
    }
  };

  const toggleRecord = (recordId: string) => {
    setPickerSelected((prev) => {
      const next = new Set(prev);
      if (next.has(recordId)) next.delete(recordId);
      else next.add(recordId);
      return next;
    });
  };

  const confirmPicker = () => {
    const picked: Array<{ content: string; deadline: string }> = [];
    for (const lg of pickerLedgers) {
      for (const r of lg.records) {
        if (pickerSelected.has(r.id)) {
          picked.push({ content: r.content, deadline: r.deadline || '' });
        }
      }
    }
    if (picked.length === 0) {
      toast.error('请至少选择一条台账记录');
      return;
    }
    // 去掉空占位行（如果全是空的）
    const existing = items.filter((it) => it.content.trim());
    setItems([...existing, ...picked]);
    toast.success(`已添加 ${picked.length} 条台账记录`);
    setPickerOpen(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('文件大小不能超过2MB');
      return;
    }
    setUploading(true);
    try {
      const res = await announcementApi.uploadAttachment(file);
      setAttachmentUrl(res.data.url);
      setAttachmentName(res.data.originalName);
      toast.success('附件上传成功');
    } catch (err) {
      toast.error('附件上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('请输入公告标题');
      return;
    }
    if (announcementType === 'regular' && !content.trim()) {
      toast.error('请输入公告内容');
      return;
    }
    if (announcementType === 'task') {
      const validItems = items.filter((it) => it.content.trim());
      if (validItems.length === 0) {
        toast.error('请至少填写一条台账条目内容');
        return;
      }
    }
    setSaving(true);
    try {
      const payload: any = {
        title: title.trim(),
        publisher: publisher.trim(),
        attachmentUrl: attachmentUrl || undefined,
        attachmentName: attachmentName || undefined,
        announcementType,
      };
      if (announcementType === 'regular') {
        payload.content = content.trim();
      } else {
        payload.items = items
          .filter((it) => it.content.trim())
          .map((it) => ({
            content: it.content.trim(),
            deadline: it.deadline || undefined,
          }));
      }

      if (editing) {
        await announcementApi.update(editing.id, payload);
        toast.success('公告已更新');
      } else {
        await announcementApi.create(payload);
        toast.success('公告已发布');
      }
      setEditOpen(false);
      loadList();
    } catch (err) {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条公告吗？删除后不可恢复。')) return;
    try {
      await announcementApi.remove(id);
      toast.success('公告已删除');
      loadList();
    } catch (err) {
      toast.error('删除失败');
    }
  };

  const handleTogglePublish = async (item: AnnouncementDetail) => {
    try {
      await announcementApi.update(item.id, { isPublished: !item.isPublished });
      toast.success(item.isPublished ? '公告已下线' : '公告已发布');
      loadList();
    } catch (err) {
      toast.error('操作失败');
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">公告管理</h1>
          <p className="mt-1 text-sm text-gray-500">管理学院公告的发布、编辑和删除</p>
        </div>
        <Button
          onClick={openCreate}
          className="gap-2 bg-gray-900 hover:bg-gray-800 text-white"
        >
          <Plus className="h-4 w-4" />
          发布公告
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Megaphone className="h-10 w-10 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">暂无公告，点击右上角"发布公告"创建第一条</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {list.map((item) => (
              <div key={item.id} className="p-4 sm:p-5 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-medium text-gray-900 truncate">
                        {item.title}
                      </h3>
                      {item.announcementType === 'task' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                          <ClipboardList className="h-3 w-3" />
                          台账公告
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                          <Megaphone className="h-3 w-3" />
                          普通公告
                        </span>
                      )}
                      {!item.isPublished && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                          <EyeOff className="h-3 w-3" />
                          未发布
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {new Date(item.publishDate).toLocaleDateString('zh-CN')}
                      </span>
                      {item.publisher && (
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {item.publisher}
                        </span>
                      )}
                      {item.attachmentName && (
                        <span className="flex items-center gap-1 text-blue-600">
                          <Paperclip className="h-3.5 w-3.5" />
                          有附件
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleTogglePublish(item)}
                      title={item.isPublished ? '下线' : '发布'}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                    >
                      {item.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => openEdit(item)}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? '编辑公告' : '发布新公告'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Type selector */}
            <div>
              <label className="text-sm font-medium text-gray-700">公告类型</label>
              <div className="mt-2 flex gap-3">
                <button
                  onClick={() => setAnnouncementType('regular')}
                  className={`flex-1 rounded-lg border px-4 py-3 text-left transition-colors ${
                    announcementType === 'regular'
                      ? 'border-blue-400 bg-blue-50/50'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Megaphone className={`h-4 w-4 ${announcementType === 'regular' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className={`text-sm font-medium ${announcementType === 'regular' ? 'text-blue-700' : 'text-gray-700'}`}>普通公告</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">通知类信息，仅发布标题和正文</p>
                </button>
                <button
                  onClick={() => setAnnouncementType('task')}
                  className={`flex-1 rounded-lg border px-4 py-3 text-left transition-colors ${
                    announcementType === 'task'
                      ? 'border-blue-400 bg-blue-50/50'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ClipboardList className={`h-4 w-4 ${announcementType === 'task' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className={`text-sm font-medium ${announcementType === 'task' ? 'text-blue-700' : 'text-gray-700'}`}>台账公告</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">任务型，用户可将条目加入自己的台账</p>
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">公告标题</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="请输入公告标题"
                className="mt-1.5 border-gray-200"
              />
            </div>

            {/* Regular type: content textarea */}
            {announcementType === 'regular' && (
              <div>
                <label className="text-sm font-medium text-gray-700">公告内容</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="请输入公告内容，支持换行"
                  rows={8}
                  className="mt-1.5 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-100 resize-y"
                />
              </div>
            )}

            {/* Task type: dynamic items */}
            {announcementType === 'task' && (
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">台账条目</label>
                    <p className="text-xs text-gray-500 mt-0.5">用户可逐条选择并添加到自己的周台账或学期台账</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={openPicker}
                    className="gap-1.5 border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    <Import className="h-4 w-4" />
                    从已有台账选择
                  </Button>
                </div>
                <div className="mt-2 space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <div className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-2">
                        <Input
                          value={item.content}
                          onChange={(e) => updateItem(idx, 'content', e.target.value)}
                          placeholder={`第 ${idx + 1} 条工作内容`}
                          className="border-0 px-0 shadow-none focus-visible:ring-0"
                        />
                      </div>
                      <Input
                        type="date"
                        value={item.deadline}
                        onChange={(e) => updateItem(idx, 'deadline', e.target.value)}
                        className="w-36 border-gray-200 text-sm"
                      />
                      <button
                        onClick={() => removeItem(idx)}
                        className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 shrink-0"
                        disabled={items.length <= 1}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addItem}
                    className="w-full rounded-lg border border-dashed border-gray-300 py-2.5 text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/30 transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    添加一条
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700">落款（发布人）</label>
              <Input
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                placeholder="例如：经济学院办公室"
                className="mt-1.5 border-gray-200"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">附件（可选，≤2MB）</label>
              <div className="mt-1.5">
                {attachmentUrl ? (
                  <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                    <span className="flex items-center gap-2 text-sm text-blue-600">
                      <Paperclip className="h-4 w-4" />
                      {attachmentName}
                    </span>
                    <button
                      onClick={() => { setAttachmentUrl(''); setAttachmentName(''); }}
                      className="p-1 rounded hover:bg-gray-200 text-gray-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 px-4 py-6 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors">
                    {uploading ? (
                      <Spinner className="h-5 w-5" />
                    ) : (
                      <>
                        <Paperclip className="h-5 w-5 text-gray-400" />
                        <span className="text-sm text-gray-500">点击上传附件（图片/PDF/Word）</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                      onChange={handleUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setEditOpen(false)}
                className="border-gray-200"
              >
                取消
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || uploading}
                className="bg-gray-900 hover:bg-gray-800 text-white"
              >
                {saving ? '保存中...' : editing ? '保存修改' : '发布公告'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Picker Dialog: choose records from existing ledgers */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>从已有台账选择</DialogTitle>
          </DialogHeader>
          {pickerLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : pickerLedgers.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">
              您还没有任何台账记录，请先到周台账或学期台账中录入记录
            </div>
          ) : (
            <>
              {/* Semester filter */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-600">学期筛选：</span>
                <button
                  onClick={() => setPickerSemesterFilter('all')}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    pickerSemesterFilter === 'all'
                      ? 'border-blue-400 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  全部
                </button>
                {Array.from(new Set(pickerLedgers.map((l) => l.semester))).map((sem) => (
                  <button
                    key={sem}
                    onClick={() => setPickerSemesterFilter(sem)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      pickerSemesterFilter === sem
                        ? 'border-blue-400 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {sem.replace('-1', '第一学期').replace('-2', '第二学期')}
                  </button>
                ))}
              </div>

              <div className="space-y-4 mt-4">
                {pickerLedgers
                  .filter((l) => pickerSemesterFilter === 'all' || l.semester === pickerSemesterFilter)
                  .filter((l) => l.records.length > 0)
                  .map((lg) => (
                    <div key={lg.id} className="rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/60 px-3 py-2">
                        <FolderOpen className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-800">{lg.name}</span>
                        <span className="text-xs text-gray-400">
                          （{lg.ledgerType === 'weekly' ? '周台账' : '学期台账'} · {lg.semester.replace('-1', '第一学期').replace('-2', '第二学期')}）
                        </span>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {lg.records.map((r) => (
                          <label
                            key={r.id}
                            className="flex items-start gap-2.5 px-3 py-2 cursor-pointer hover:bg-gray-50"
                          >
                            <Checkbox
                              checked={pickerSelected.has(r.id)}
                              onCheckedChange={() => toggleRecord(r.id)}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-gray-800 break-words">{r.content}</div>
                              <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-gray-400">
                                {r.deadline && <span>截止：{r.deadline}</span>}
                                {r.mainExecutor && <span>执行人：{r.mainExecutor}</span>}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-4">
                <span className="text-sm text-gray-600">已选 {pickerSelected.size} 条</span>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setPickerOpen(false)} className="border-gray-200">
                    取消
                  </Button>
                  <Button onClick={confirmPicker} className="bg-gray-900 hover:bg-gray-800 text-white">
                    添加到公告
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAnnouncementPage;
