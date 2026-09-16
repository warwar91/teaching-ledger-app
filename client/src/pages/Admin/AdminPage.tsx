import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Eye,
  KeyRound,
  Settings,
  Shield,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { logger } from '@client/src/utils/logger';
import type {
  AdminUserItem,
  LedgerDetail,
  LedgerItem,
  LedgerRecordItem,
  ProgressStatus,
} from '@shared/api.interface';

import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Spinner } from '@client/src/components/ui/spinner';
import { Badge } from '@client/src/components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@client/src/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@client/src/components/ui/empty';
import { useAuth } from '@client/src/contexts/AuthContext';
import { admin } from '@client/src/api';

const statusLabel: Record<ProgressStatus, { label: string; variant: string }> = {
  pending: { label: '待处理', variant: 'destructive' },
  in_progress: { label: '进行中', variant: 'secondary' },
  completed: { label: '已完成', variant: 'default' },
};

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);

  // View ledgers dialog
  const [viewUser, setViewUser] = useState<AdminUserItem | null>(null);
  const [userLedgers, setUserLedgers] = useState<LedgerItem[]>([]);
  const [ledgersLoading, setLedgersLoading] = useState(false);

  // View ledger detail dialog (read-only)
  const [viewLedgerDetail, setViewLedgerDetail] = useState<LedgerDetail | null>(
    null,
  );
  const [detailLoading, setDetailLoading] = useState(false);

  // Clear data confirm
  const [clearUser, setClearUser] = useState<AdminUserItem | null>(null);
  const [clearing, setClearing] = useState(false);

  // Reset password dialog
  const [resetUser, setResetUser] = useState<AdminUserItem | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetting, setResetting] = useState(false);

  // Delete user dialog
  const [deleteUserTarget, setDeleteUserTarget] = useState<AdminUserItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Redirect non-admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const list = await admin.getUsers();
      setUsers(list);
    } catch (err: unknown) {
      logger.error(`AdminPage fetch users failed: ${JSON.stringify(err)}`);
      toast.error('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [user?.role, fetchUsers]);

  const handleViewLedgers = async (u: AdminUserItem) => {
    setViewUser(u);
    setLedgersLoading(true);
    try {
      const list = await admin.getUserLedgers(u.userId);
      setUserLedgers(list);
    } catch (err: unknown) {
      logger.error(`AdminPage view ledgers failed: ${JSON.stringify(err)}`);
      toast.error('加载用户台账失败');
    } finally {
      setLedgersLoading(false);
    }
  };

  const handleViewDetail = async (ledgerId: string) => {
    setDetailLoading(true);
    try {
      const detail = await admin.getLedgerDetail(ledgerId);
      setViewLedgerDetail(detail);
    } catch (err: unknown) {
      logger.error(`AdminPage view detail failed: ${JSON.stringify(err)}`);
      toast.error('加载台账详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleClearData = async () => {
    if (!clearUser) return;
    setClearing(true);
    try {
      await admin.clearUserData(clearUser.userId);
      toast.success(`已清除 ${clearUser.username} 的所有台账数据`);
      setClearUser(null);
      fetchUsers();
    } catch (err: unknown) {
      logger.error(`AdminPage clear data failed: ${JSON.stringify(err)}`);
      toast.error('清除失败');
    } finally {
      setClearing(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetUser) return;
    if (resetPassword !== resetConfirm) {
      toast.error('两次输入的密码不一致');
      return;
    }
    setResetting(true);
    try {
      await admin.resetPassword(resetUser.userId, resetPassword);
      toast.success('密码已重置，该用户将被强制下线，需使用新密码重新登录');
      setResetUser(null);
      setResetPassword('');
      setResetConfirm('');
    } catch (err: unknown) {
      logger.error(`AdminPage reset password failed: ${JSON.stringify(err)}`);
      toast.error('重置密码失败');
    } finally {
      setResetting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserTarget) return;
    setDeleting(true);
    try {
      const result = await admin.deleteUser(deleteUserTarget.userId);
      toast.success(
        `已删除用户 ${result.username}（${result.deletedLedgers}个台账，${result.deletedRecords}条记录）`,
      );
      setDeleteUserTarget(null);
      fetchUsers();
    } catch (err: unknown) {
      logger.error(`AdminPage delete user failed: ${JSON.stringify(err)}`);
      toast.error('删除用户失败');
    } finally {
      setDeleting(false);
    }
  };

  if (user && user.role !== 'admin') {
    return null;
  }

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
            <Settings className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">管理后台</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              管理所有用户及台账数据
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="bg-gray-100 p-1">
          <TabsTrigger value="users" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Users className="h-4 w-4" />
            用户列表
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner className="h-8 w-8" />
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b border-gray-200 hover:bg-transparent">
                    <TableHead className="font-semibold text-center text-gray-600">用户名</TableHead>
                    <TableHead className="w-24 text-center text-gray-600">角色</TableHead>
                    <TableHead className="w-40 text-center text-gray-600">注册时间</TableHead>
                    <TableHead className="w-28 text-center text-gray-600">周台账数</TableHead>
                    <TableHead className="w-28 text-center text-gray-600">学期台账数</TableHead>
                    <TableHead className="w-60 text-center text-gray-600">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.userId} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <TableCell className="font-medium text-center text-gray-900">{u.username}</TableCell>
                      <TableCell className="text-center">
                        {u.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                            <Shield className="h-3 w-3" />
                            管理员
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                            普通用户
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-gray-500">
                        {new Date(u.createdAt).toLocaleDateString('zh-CN')}
                      </TableCell>
                      <TableCell className="text-center">{u.weeklyCount}</TableCell>
                      <TableCell className="text-center">{u.semesterCount}</TableCell>
                      <TableCell className="text-center">
                        <div className="inline-flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewLedgers(u)}
                            className="gap-1"
                          >
                            <Eye className="h-3 w-3" />
                            查看台账
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setResetUser(u);
                              setResetPassword('');
                              setResetConfirm('');
                            }}
                            className="gap-1 text-blue-600 border-blue-400/30 hover:text-blue-700"
                            disabled={u.role === 'admin'}
                          >
                            <KeyRound className="h-3 w-3" />
                            重置密码
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteUserTarget(u)}
                            className="gap-1 text-destructive border-destructive/30 hover:text-destructive"
                            disabled={u.role === 'admin'}
                          >
                            <Trash2 className="h-3 w-3" />
                            删除用户
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* View User Ledgers Dialog */}
      <Dialog
        open={!!viewUser}
        onOpenChange={(open) => {
          if (!open) {
            setViewUser(null);
            setUserLedgers([]);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {viewUser?.username} 的台账
            </DialogTitle>
            <DialogDescription>
              共 {userLedgers.length} 个台账
            </DialogDescription>
          </DialogHeader>

          {ledgersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-6 w-6" />
            </div>
          ) : userLedgers.length === 0 ? (
            <Empty>
              <EmptyContent>
                <EmptyMedia variant="icon">
                  <Users className="h-6 w-6" />
                </EmptyMedia>
                <EmptyTitle>暂无台账</EmptyTitle>
                <EmptyDescription>该用户尚未创建任何台账</EmptyDescription>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-gray-200 hover:bg-transparent">
                    <TableHead className="text-center text-gray-600">台账名称</TableHead>
                    <TableHead className="w-20 text-center text-gray-600">类型</TableHead>
                    <TableHead className="w-20 text-center text-gray-600">记录数</TableHead>
                    <TableHead className="w-28 text-center text-gray-600">创建时间</TableHead>
                    <TableHead className="w-20 text-center text-gray-600">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userLedgers.map((ledger) => (
                    <TableRow key={ledger.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <TableCell className="font-medium">
                        {ledger.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {ledger.ledgerType === 'weekly' ? '周' : '学期'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {ledger.recordCount}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(ledger.createdAt).toLocaleDateString('zh-CN')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetail(ledger.id)}
                          className="gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          详情
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setViewUser(null);
                setUserLedgers([]);
              }}
            >
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Ledger Detail Dialog (read-only) */}
      <Dialog
        open={!!viewLedgerDetail}
        onOpenChange={(open) => {
          if (!open) setViewLedgerDetail(null);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{viewLedgerDetail?.name}</DialogTitle>
            <DialogDescription>
              {viewLedgerDetail?.ledgerType === 'weekly' ? '周台账' : '学期台账'}
              {' · '}
              共 {viewLedgerDetail?.records.length ?? 0} 条记录
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-6 w-6" />
            </div>
          ) : viewLedgerDetail && viewLedgerDetail.records.length === 0 ? (
            <Empty>
              <EmptyContent>
                <EmptyTitle>暂无记录</EmptyTitle>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-gray-200 hover:bg-transparent">
                    <TableHead className="w-12 text-center text-gray-600">#</TableHead>
                    <TableHead className="text-center text-gray-600">内容</TableHead>
                    <TableHead className="w-28 text-center text-gray-600">预计完成时间</TableHead>
                    <TableHead className="w-24 text-center text-gray-600">执行人</TableHead>
                    <TableHead className="w-20 text-center text-gray-600">状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewLedgerDetail?.records.map(
                    (record: LedgerRecordItem) => (
                      <TableRow key={record.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <TableCell className="text-center text-muted-foreground">
                          {record.seqNo}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate" title={record.content}>
                            {record.content}
                          </div>
                        </TableCell>
                        <TableCell>{record.expectedDate || '-'}</TableCell>
                        <TableCell>{record.mainExecutor || '-'}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              statusLabel[record.progressStatus]
                                .variant as 'default' | 'secondary' | 'destructive'
                            }
                            className="text-xs"
                          >
                            {statusLabel[record.progressStatus].label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ),
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewLedgerDetail(null)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Data Confirm Dialog */}
      <Dialog
        open={!!clearUser}
        onOpenChange={(open) => {
          if (!open) setClearUser(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              清除用户数据
            </DialogTitle>
            <DialogDescription>
              确定要清除用户 <strong>{clearUser?.username}</strong>{' '}
              的所有台账数据吗？此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setClearUser(null)}
              disabled={clearing}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearData}
              disabled={clearing}
            >
              {clearing && <Spinner className="h-4 w-4" />}
              确认清除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog
        open={!!resetUser}
        onOpenChange={(open) => {
          if (!open) {
            setResetUser(null);
            setResetPassword('');
            setResetConfirm('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-blue-600" />
              重置用户密码
            </DialogTitle>
            <DialogDescription>
              正在重置用户 <strong>{resetUser?.username}</strong> 的密码。
              重置后该用户将被强制下线，需使用新密码重新登录。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                新密码
              </label>
              <Input
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="请输入新密码"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                确认新密码
              </label>
              <Input
                type="password"
                value={resetConfirm}
                onChange={(e) => setResetConfirm(e.target.value)}
                placeholder="请再次输入新密码"
              />
            </div>
            <div className="rounded-md bg-blue-50 p-3 text-xs text-blue-700">
              <p className="font-medium">密码强度要求：</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                <li>长度 8 ~ 128 位</li>
                <li>必须包含大写字母、小写字母和数字</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResetUser(null);
                setResetPassword('');
                setResetConfirm('');
              }}
              disabled={resetting}
            >
              取消
            </Button>
            <Button onClick={handleResetPassword} disabled={resetting}>
              {resetting && <Spinner className="h-4 w-4" />}
              确认重置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog
        open={!!deleteUserTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteUserTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              删除用户账户
            </DialogTitle>
            <DialogDescription>
              此操作将永久删除用户{' '}
              <strong className="text-destructive">
                {deleteUserTarget?.username}
              </strong>{' '}
              的所有数据，包括：
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-4">
            <ul className="list-disc space-y-1 pl-5 text-sm text-destructive">
              <li>所有周台账与学期台账（含回收站数据）</li>
              <li>所有台账记录条目及图片</li>
              <li>所有登录会话和登录失败计数</li>
              <li>用户账户本身</li>
            </ul>
            <p className="text-sm font-medium text-destructive">
              此操作不可恢复！
            </p>
            <p className="text-xs text-destructive/80">
              该用户当前有 {deleteUserTarget?.weeklyCount ?? 0} 个周台账、
              {deleteUserTarget?.semesterCount ?? 0} 个学期台账。
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteUserTarget(null)}
              disabled={deleting}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={deleting}
            >
              {deleting && <Spinner className="h-4 w-4" />}
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPage;
