import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FileText, Upload, Download, Trash2, Eye, FolderOpen, MoreVertical, Pencil } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
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
import * as yearSummaryApi from '@client/src/api/yearSummary';
import { http } from '@client/src/api/instance';
import { showConfirm } from '@client/src/utils/show-confirm';
import { logger } from '@client/src/utils/logger';

const YearSummaryPage: React.FC = () => {
  const [years, setYears] = useState<{ value: string; label: string }[]>([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [items, setItems] = useState<yearSummaryApi.YearSummaryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: '', file: null as File | null });
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<yearSummaryApi.YearSummaryItem | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);

  useEffect(() => {
    yearSummaryApi.getYears().then((y) => {
      setYears(y);
      if (y.length > 0) setSelectedYear(y[0].value);
    });
  }, []);

  const fetchItems = useCallback(async (year: string) => {
    if (!year) return;
    setLoading(true);
    try {
      const data = await yearSummaryApi.listByYear(year);
      setItems(data);
    } catch (err) {
      logger.error(`YearSummary list failed: ${JSON.stringify(err)}`);
      toast.error('加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedYear) fetchItems(selectedYear);
  }, [selectedYear, fetchItems]);

  const handleUpload = async () => {
    if (!form.title.trim()) {
      toast.error('请输入总结标题');
      return;
    }
    if (!form.file) {
      toast.error('请选择文件');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', form.file);
      const upRes = await http.post('/upload/attachment', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await yearSummaryApi.createSummary({
        academicYear: selectedYear,
        title: form.title.trim(),
        fileUrl: upRes.data.url,
        fileName: upRes.data.originalName,
        fileSize: form.file.size,
      });
      toast.success('上传成功');
      setUploadOpen(false);
      setForm({ title: '', file: null });
      fetchItems(selectedYear);
    } catch (err: any) {
      logger.error(`Upload failed: ${JSON.stringify(err)}`);
      toast.error(err?.response?.data?.message || '上传失败，请检查文件格式和大小（PDF/Word，≤2MB）');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!await showConfirm('确定删除这份总结吗？')) return;
    try {
      await yearSummaryApi.deleteSummary(id);
      toast.success('已删除');
      fetchItems(selectedYear);
    } catch (err) {
      toast.error('删除失败');
    }
  };

  const handlePreview = (url: string) => {
    setPreviewUrl(url);
    setPreviewOpen(true);
  };

  const openRename = (item: yearSummaryApi.YearSummaryItem) => {
    setRenameTarget(item);
    setRenameValue(item.title);
  };

  const handleRename = async () => {
    if (!renameTarget) return;
    if (!renameValue.trim()) {
      toast.error('请输入标题');
      return;
    }
    setRenaming(true);
    try {
      await yearSummaryApi.updateSummary(renameTarget.id, { title: renameValue.trim() });
      toast.success('重命名成功');
      setRenameTarget(null);
      fetchItems(selectedYear);
    } catch (err) {
      toast.error('重命名失败');
    } finally {
      setRenaming(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
    return (bytes / 1024 / 1024).toFixed(2) + 'MB';
  };

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">学年总结</h1>
          <p className="text-sm text-gray-500 mt-0.5">上传和管理各学年工作总结文件</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-48 border-gray-200">
              <SelectValue placeholder="选择学年" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {years.map((y) => (
                <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => setUploadOpen(true)}
            className="gap-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-700 shadow-sm"
          >
            <Upload className="h-4 w-4" />
            上传总结
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      ) : items.length === 0 ? (
        <Empty>
          <EmptyContent>
            <EmptyMedia variant="icon">
              <FolderOpen className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>暂无总结文件</EmptyTitle>
            <EmptyDescription>
              点击右上角"上传总结"按钮上传本学年工作总结（PDF/Word格式，≤2MB）
            </EmptyDescription>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="py-3 px-4 text-center text-sm font-medium text-gray-600">序号</th>
                <th className="py-3 px-4 text-center text-sm font-medium text-gray-600">标题</th>
                <th className="py-3 px-4 text-center text-sm font-medium text-gray-600">文件名</th>
                <th className="py-3 px-4 text-center text-sm font-medium text-gray-600">大小</th>
                <th className="py-3 px-4 text-center text-sm font-medium text-gray-600">上传时间</th>
                <th className="py-3 px-4 text-center text-sm font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="py-3 px-4 text-center text-sm text-gray-500">{idx + 1}</td>
                  <td className="py-3 px-4 text-center text-sm text-gray-900">{item.title}</td>
                  <td className="py-3 px-4 text-center text-sm text-gray-600 max-w-[200px] truncate">{item.fileName}</td>
                  <td className="py-3 px-4 text-center text-sm text-gray-500">{formatSize(item.fileSize)}</td>
                  <td className="py-3 px-4 text-center text-sm text-gray-500">
                    {new Date(item.createdAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreview(item.fileUrl)}
                        className="text-gray-600 hover:bg-gray-100"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(item.fileUrl, '_blank')}
                        className="text-gray-600 hover:bg-gray-100"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-600 hover:bg-gray-100"
                          aria-label="操作"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-white">
                        <DropdownMenuItem
                          onClick={() => openRename(item)}
                          className="cursor-pointer"
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          重命名
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(item.id)}
                          className="cursor-pointer text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>上传学年总结</DialogTitle>
            <DialogDescription>
              上传 {years.find(y => y.value === selectedYear)?.label || ''} 的工作总结文件
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-gray-700">标题 *</label>
              <Input
                className="mt-1.5"
                placeholder="请输入总结标题"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">文件 *</label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx"
                className="mt-1.5"
                onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })}
              />
              <p className="text-xs text-gray-400 mt-1">支持 PDF、Word 格式，单个文件不超过 2MB</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)} className="border-gray-200">
              取消
            </Button>
            <Button onClick={handleUpload} disabled={uploading} className="border-gray-300 bg-white hover:bg-gray-50 text-gray-900 shadow-sm">
              {uploading && <Spinner className="h-4 w-4 mr-1" />}
              上传
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-5xl h-[85vh]">
          <DialogHeader>
            <DialogTitle>文件预览</DialogTitle>
          </DialogHeader>
          {previewUrl.endsWith('.pdf') ? (
            <iframe src={previewUrl} className="w-full flex-1 rounded border border-gray-200" style={{ minHeight: '60vh' }} />
          ) : (
            <div className="flex flex-col items-center justify-center py-10">
              <FileText className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-sm text-gray-500 mb-4">Word 文档不支持在线预览，请下载后查看</p>
              <Button onClick={() => window.open(previewUrl, '_blank')} className="border-gray-300 bg-white hover:bg-gray-50 text-gray-700">
                <Download className="h-4 w-4 mr-2" />
                下载文件
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={!!renameTarget} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重命名总结</DialogTitle>
            <DialogDescription>请输入新的总结标题。</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="请输入新标题"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)} disabled={renaming}>
              取消
            </Button>
            <Button onClick={handleRename} disabled={renaming}>
              {renaming && <Spinner className="h-4 w-4" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default YearSummaryPage;
