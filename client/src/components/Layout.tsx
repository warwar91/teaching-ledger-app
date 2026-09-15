import { useEffect } from 'react';
import {
  NavLink,
  Outlet,
  useNavigate,
} from 'react-router-dom';
import {
  CalendarDays,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Settings,
  Trash2,
  User,
} from 'lucide-react';
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
import { useAuth } from '@client/src/contexts/AuthContext';

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading, logout } = useAuth();

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

  if (loading || !isAuthenticated || !user) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-muted">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  const navItems = [
    { path: '/', label: '首页', icon: LayoutDashboard, end: true },
    { path: '/weekly', label: '周台账', icon: CalendarDays, end: false },
    { path: '/semester', label: '学期台账', icon: GraduationCap, end: false },
    { path: '/recycle', label: '回收站', icon: Trash2, end: false },
    { path: '/help', label: '使用说明', icon: HelpCircle, end: false },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white">
        {/* Logo */}
        <div className="flex h-20 items-center gap-3 border-b border-gray-100 px-5">
          <img
            src={logoUrl}
            alt="学院LOGO"
            className="h-12 w-12 rounded-full object-cover shadow-sm ring-2 ring-gray-100"
          />
          <div className="flex flex-col">
            <span className="text-base font-semibold text-gray-900 leading-tight">
              教学工作台账
            </span>
            <span className="text-sm text-gray-500 leading-tight">
              经济学院
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
          <div className="text-base font-semibold text-gray-900">
            教学工作台账管理系统
          </div>

          <div className="flex items-center gap-3">
            {user.role === 'admin' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin')}
                className="gap-2 border-gray-200 hover:bg-gray-50"
              >
                <Settings className="h-4 w-4" />
                管理后台
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2.5 h-9 px-2 hover:bg-gray-100"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm font-medium">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-gray-700">{user.username}</span>
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
    </div>
  );
};

export default Layout;
