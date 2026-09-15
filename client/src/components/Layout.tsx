import { useState, useEffect } from 'react';
import {
  NavLink,
  Outlet,
  useNavigate,
} from 'react-router-dom';
import {
  CalendarDays,
  GraduationCap,
  HelpCircle,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Megaphone,
  Settings,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@client/src/utils/logger';
import logoUrl from '@client/src/assets/logo.png';

import { Button } from '@client/src/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@client/src/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@client/src/components/ui/dialog';
import { Input } from '@client/src/components/ui/input';
import { useAuth } from '@client/src/contexts/AuthContext';
import * as authApi from '@client/src/api/auth';

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pwdDialogOpen, setPwdDialogOpen] = useState(false);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdSubmitting, setPwdSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err: unknown) {
      logger.error(`Layout logout failed: ${JSON.stringify(err)}`);
    }
  };

  // 点击导航后关闭移动端侧边栏
  const handleNavClick = () => {
    setSidebarOpen(false);
  };

  const resetPwdForm = () => {
    setOldPwd('');
    setNewPwd('');
    setConfirmPwd('');
  };

  const handleChangePassword = async () => {
    if (!oldPwd || !newPwd || !confirmPwd) {
      toast.error('请填写完整所有字段');
      return;
    }
    if (newPwd.length < 8 || newPwd.length > 12) {
      toast.error('新密码长度需为 8~12 位');
      return;
    }
    if (newPwd !== confirmPwd) {
      toast.error('两次输入的新密码不一致');
      return;
    }
    if (oldPwd === newPwd) {
      toast.error('新密码不能与原密码相同');
      return;
    }
    setPwdSubmitting(true);
    try {
      await authApi.changePassword(oldPwd, newPwd);
      toast.success('密码修改成功，请重新登录');
      setPwdDialogOpen(false);
      resetPwdForm();
      await logout();
      navigate('/login', { replace: true });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '密码修改失败');
    } finally {
      setPwdSubmitting(false);
    }
  };

  if (loading || !isAuthenticated || !user) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  const navItems = [
    { path: '/', label: '首页', icon: LayoutDashboard, end: true },
    { path: '/announcements', label: '公告通知', icon: Megaphone, end: false },
    { path: '/weekly', label: '周台账', icon: CalendarDays, end: false },
    { path: '/semester', label: '学期台账', icon: GraduationCap, end: false },
    { path: '/recycle', label: '回收站', icon: Trash2, end: false },
    { path: '/help', label: '使用说明', icon: HelpCircle, end: false },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex h-16 sm:h-20 items-center gap-2.5 sm:gap-3 border-b border-gray-100 px-4 sm:px-5">
        <img
          src={logoUrl}
          alt="学院LOGO"
          className="h-9 w-9 sm:h-12 sm:w-12 rounded-full object-cover shadow-sm ring-2 ring-gray-100 shrink-0"
        />
        <div className="flex flex-col min-w-0">
          <span className="text-sm sm:text-base font-semibold text-gray-900 leading-tight truncate">
            工作台账
          </span>
          <span className="text-xs sm:text-sm text-gray-500 leading-tight">
            经济学院
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2 sm:p-3">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            onClick={handleNavClick}
            className={({ isActive }) =>
              `flex items-center gap-2.5 sm:gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <item.icon className="h-4 w-4 sm:h-[18px] sm:w-[18px] shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      {/* 桌面端侧边栏（md以上显示） */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white">
        {sidebarContent}
      </aside>

      {/* 移动端侧边栏遮罩 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 移动端侧边栏抽屉 */}
      <aside
        className={`fixed left-0 top-0 bottom-0 z-50 w-64 shrink-0 flex flex-col border-r border-gray-200 bg-white transition-transform duration-300 md:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
        >
          <X className="h-5 w-5" />
        </button>
        {sidebarContent}
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 sm:h-16 items-center justify-between border-b border-gray-200 bg-white px-3 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* 移动端汉堡菜单按钮 */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="text-sm sm:text-base font-semibold text-gray-900">
              工作台账管理系统
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {user.role === 'admin' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin')}
                className="gap-1.5 sm:gap-2 border-gray-200 hover:bg-gray-50 text-xs sm:text-sm px-2 sm:px-3"
              >
                <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">管理后台</span>
                <span className="sm:hidden">管理</span>
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 h-9 px-1.5 sm:px-2 hover:bg-gray-100"
                >
                  <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xs sm:text-sm font-medium">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-gray-700 hidden sm:inline">{user.username}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl p-2 shadow-xl border-gray-200">
                <div className="px-3 py-2.5 border-b border-gray-100 mb-1">
                  <div className="text-sm font-semibold text-gray-900">{user.username}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {user.role === 'admin' ? '系统管理员' : '普通用户'}
                  </div>
                </div>
                {user.role === 'admin' && (
                  <DropdownMenuItem
                    onClick={() => navigate('/admin')}
                    className="cursor-pointer rounded-lg py-2 px-3 text-sm"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    管理后台
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => navigate('/help')}
                  className="cursor-pointer rounded-lg py-2 px-3 text-sm"
                >
                  <HelpCircle className="h-4 w-4 mr-2" />
                  使用说明
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    resetPwdForm();
                    setPwdDialogOpen(true);
                  }}
                  className="cursor-pointer rounded-lg py-2 px-3 text-sm"
                >
                  <KeyRound className="h-4 w-4 mr-2" />
                  修改密码
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer rounded-lg py-2 px-3 text-sm text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto bg-gray-50">
          <Outlet />
        </main>
      </div>

      {/* 修改密码弹窗 */}
      <Dialog open={pwdDialogOpen} onOpenChange={setPwdDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-blue-600" />
              修改密码
            </DialogTitle>
            <DialogDescription>
              请输入原密码和新密码，修改成功后需重新登录
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">原密码</label>
              <Input
                type="password"
                value={oldPwd}
                onChange={(e) => setOldPwd(e.target.value)}
                placeholder="请输入当前密码"
                className="mt-1.5 border-gray-200"
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">新密码</label>
              <Input
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="8~12位，可含字母数字特殊字符"
                className="mt-1.5 border-gray-200"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">确认新密码</label>
              <Input
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="再次输入新密码"
                className="mt-1.5 border-gray-200"
                autoComplete="new-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPwdDialogOpen(false)}
              className="border-gray-200"
              disabled={pwdSubmitting}
            >
              取消
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={pwdSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {pwdSubmitting ? '提交中...' : '确认修改'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Layout;
