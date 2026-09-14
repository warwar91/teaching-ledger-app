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
import { Image } from '@client/src/components/ui/image';

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
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        {/* Logo */}
        <div className="flex h-14 items-center gap-3 border-b border-sidebar-border px-4">
          <Image
            src={logoUrl}
            alt="学院LOGO"
            className="h-9 w-9 rounded-full object-cover shadow-sm"
          />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-sidebar-foreground leading-tight">
              教学工作台账
            </span>
            <span className="text-[10px] text-sidebar-foreground/60 leading-tight">
              经济学院
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
          <div className="text-lg font-semibold text-foreground">
            教学工作台账管理系统
          </div>

          <div className="flex items-center gap-3">
            {user.role === 'admin' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin')}
                className="gap-2"
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
                  className="gap-2 data-[state=open]:bg-muted"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{user.username}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <div className="px-2 py-1.5">
                  <div className="text-sm font-medium">{user.username}</div>
                  <div className="text-xs text-muted-foreground">
                    {user.role === 'admin' ? '管理员' : '普通用户'}
                  </div>
                </div>
                <DropdownMenuSeparator />
                {user.role === 'admin' && (
                  <DropdownMenuItem
                    onClick={() => navigate('/admin')}
                    className="cursor-pointer"
                  >
                    <Settings className="h-4 w-4" />
                    管理后台
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => navigate('/help')}
                  className="cursor-pointer"
                >
                  <HelpCircle className="h-4 w-4" />
                  使用说明
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
