import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Bell,
  CalendarDays,
  GraduationCap,
  Trash2,
  X,
  FileText,
} from 'lucide-react';
import { logger } from '@client/src/utils/logger';
import type { LedgerItem, ReminderItem } from '@shared/api.interface';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/src/components/ui/card';
import { Spinner } from '@client/src/components/ui/spinner';
import { Badge } from '@client/src/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { useAuth } from '@client/src/contexts/AuthContext';
import { ledger } from '@client/src/api';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [weeklyCount, setWeeklyCount] = useState(0);
  const [semesterCount, setSemesterCount] = useState(0);
  const [recycleCount, setRecycleCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [showReminder, setShowReminder] = useState(false);

  const reasonLabel = (reason: ReminderItem['reason']): string => {
    if (reason === 'both') return '待处理 · 即将到期';
    if (reason === 'due_soon') return '即将到期';
    return '待处理';
  };

  const reasonVariant = (reason: ReminderItem['reason']): string => {
    if (reason === 'both') return 'destructive';
    if (reason === 'due_soon') return 'outline';
    return 'secondary';
  };

  const reasonBadgeClass = (reason: ReminderItem['reason']): string => {
    if (reason === 'due_soon') return 'text-warning border-warning/50 bg-warning/10';
    return '';
  };

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const [weekly, semester, recycle, reminderList] = await Promise.all([
          ledger.getLedgerList('weekly'),
          ledger.getLedgerList('semester'),
          ledger.getRecycleList(),
          ledger.getReminders(),
        ]);
        setWeeklyCount(weekly.length);
        setSemesterCount(semester.length);
        setRecycleCount(recycle.length);
        setReminders(reminderList);
        if (reminderList.length > 0) {
          setShowReminder(true);
        }
      } catch (err: unknown) {
        logger.error(`HomePage load counts failed: ${JSON.stringify(err)}`);
        toast.error('加载数据失败，请刷新重试');
      } finally {
        setLoading(false);
      }
    };
    loadCounts();
  }, []);

  const cardItems = [
    {
      title: '周台账',
      description: '管理每周教学工作记录',
      count: weeklyCount,
      icon: CalendarDays,
      path: '/weekly',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      shadow: 'hover:shadow-blue-100 hover:border-blue-200',
    },
    {
      title: '学期台账',
      description: '管理学期教学工作记录',
      count: semesterCount,
      icon: GraduationCap,
      path: '/semester',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      shadow: 'hover:shadow-emerald-100 hover:border-emerald-200',
    },
    {
      title: '学年总结',
      description: '上传和管理各学年工作总结',
      count: 0,
      icon: FileText,
      path: '/year-summary',
      color: 'text-violet-600',
      bg: 'bg-violet-50',
      shadow: 'hover:shadow-violet-100 hover:border-violet-200',
    },
    {
      title: '回收站',
      description: '已删除的台账可恢复或永久删除',
      count: recycleCount,
      icon: Trash2,
      path: '/recycle',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      shadow: 'hover:shadow-amber-100 hover:border-amber-200',
    },
  ];

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-8">
      {/* Welcome */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          欢迎回来，{user?.username || '用户'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          高效管理您的工作台账
        </p>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <>
          <div
            className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
            data-ai-section-type="card-menu"
          >
            {cardItems.map((item) => (
              <Card
                key={item.title}
                onClick={() => navigate(item.path)}
                className={`cursor-pointer border-gray-200 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${item.shadow}`}
              >
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.bg}`}>
                    <item.icon className={`h-6 w-6 ${item.color}`} />
                  </div>
                  <div className="text-3xl font-bold text-gray-900">
                    {item.count}
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    {item.title}
                  </CardTitle>
                  <CardDescription className="mt-1 text-gray-500">
                    {item.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>

          {reminders.length > 0 && (
            <div className="mt-6">
              <button
                onClick={() => setShowReminder(true)}
                className="flex items-center gap-2 text-sm text-destructive hover:underline"
              >
                <Bell className="h-4 w-4" />
                您有 {reminders.length} 条待处理提醒
              </button>
            </div>
          )}
        </>
      )}

      {/* 提醒弹窗 */}
      <Dialog open={showReminder} onOpenChange={setShowReminder}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-destructive" />
              待办提醒
              <span className="ml-2 text-sm font-normal text-gray-500">
                共 {reminders.length} 条
              </span>
            </DialogTitle>
            <DialogDescription>
              以下记录需要您及时处理
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-2">
            {reminders.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border p-3 hover:bg-muted/30 cursor-pointer"
                onClick={() => {
                  setShowReminder(false);
                  navigate(`/ledger/${item.ledgerId}`);
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {item.content}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      所属台账：{item.ledgerName}
                    </div>
                    {item.expectedDate && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        预计完成：{item.expectedDate}
                        {item.daysLeft < 0
                          ? `（已逾期 ${Math.abs(item.daysLeft)} 天）`
                          : item.daysLeft === 0
                          ? '（今天到期）'
                          : `（还剩 ${item.daysLeft} 天）`}
                      </div>
                    )}
                  </div>
                  <Badge variant={reasonVariant(item.reason) as any} className={`shrink-0 ${reasonBadgeClass(item.reason)}`}>
                    {reasonLabel(item.reason)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HomePage;
