import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Megaphone, ChevronLeft, ChevronRight, CalendarDays, User, ClipboardList } from 'lucide-react';
import { announcementApi, AnnouncementListItem } from '@client/src/api/announcement';
import { Spinner } from '@client/src/components/ui/spinner';
import { useAuth } from '@client/src/contexts/AuthContext';

const AnnouncementListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [list, setList] = useState<AnnouncementListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadList = async (p: number) => {
    setLoading(true);
    try {
      const res = await announcementApi.getList(p, 12);
      setList(res.data.list);
      setTotalPages(res.data.totalPages);
      setTotal(res.data.total);
      setPage(p);
    } catch (err) {
      toast.error('加载公告失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList(1);
  }, []);

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
            <Megaphone className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">公告通知</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              共 {total} 条公告，按发布时间倒序排列
            </p>
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Megaphone className="h-10 w-10 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">暂无公告</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {list.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/announcements/${item.id}`)}
                className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 cursor-pointer transition-all hover:shadow-md hover:border-blue-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <h3 className="text-sm sm:text-base font-medium text-gray-900 leading-snug">
                      {item.title}
                    </h3>
                    {item.announcementType === 'task' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600 shrink-0">
                        <ClipboardList className="h-3 w-3" />
                        台账
                      </span>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-300 shrink-0 mt-0.5" />
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {new Date(item.publishDate).toLocaleDateString('zh-CN', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </span>
                  {item.publisher && (
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {item.publisher}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => loadList(page - 1)}
                disabled={page <= 1 || loading}
                className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 disabled:opacity-50 hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4" />
                上一页
              </button>
              <span className="text-sm text-gray-500">
                第 {page} / {totalPages} 页
              </span>
              <button
                onClick={() => loadList(page + 1)}
                disabled={page >= totalPages || loading}
                className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 disabled:opacity-50 hover:bg-gray-50"
              >
                下一页
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AnnouncementListPage;
