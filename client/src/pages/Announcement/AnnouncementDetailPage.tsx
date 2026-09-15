import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, CalendarDays, User, Paperclip } from 'lucide-react';
import { announcementApi, AnnouncementDetail } from '@client/src/api/announcement';
import { Spinner } from '@client/src/components/ui/spinner';

const AnnouncementDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<AnnouncementDetail | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!data) return null;

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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-snug">
            {data.title}
          </h1>
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

        {/* Content */}
        <div className="px-5 sm:px-8 py-6">
          <div className="text-gray-800 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
            {data.content}
          </div>

          {/* Attachment */}
          {data.attachmentUrl && (
            <div className="mt-6 pt-4 border-t border-gray-100">
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
          )}
        </div>
      </div>
    </div>
  );
};

export default AnnouncementDetailPage;
