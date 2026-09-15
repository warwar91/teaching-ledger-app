import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { logger } from '@client/src/utils/logger';
import logoUrl from '@client/src/assets/logo.png';
import campusBg from '@client/src/assets/campus-bg.jpg';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/src/components/ui/card';
import { Input } from '@client/src/components/ui/input';
import { Button } from '@client/src/components/ui/button';
import { Label } from '@client/src/components/ui/label';
import { useAuth } from '@client/src/contexts/AuthContext';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginPasswordVisible, setLoginPasswordVisible] = useState(false);
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  const extractErrorMsg = (err: unknown): string => {
    if (
      err &&
      typeof err === 'object' &&
      'response' in err &&
      err.response &&
      typeof err.response === 'object'
    ) {
      const resp = err.response as Record<string, unknown>;
      const data = resp.data as Record<string, unknown> | undefined;
      if (data) {
        // NestJS error format: { message: string | string[], error: string, statusCode: number }
        if (typeof data.message === 'string') return data.message;
        if (Array.isArray(data.message)) return data.message.join('；');
        if (typeof data.error === 'string') return data.error;
      }
      if (typeof resp.status === 'number') {
        switch (resp.status) {
          case 401:
            return '用户名或密码错误';
          case 409:
            return '用户名已存在';
          case 429:
            return '尝试次数过多，请15分钟后再试';
          case 500:
            return '服务器错误，请稍后重试';
          default:
            return `请求失败（HTTP ${resp.status}）`;
        }
      }
    }
    if (err instanceof Error) return err.message;
    return '请求失败，请稍后重试';
  };

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!loginUsername.trim()) {
      toast.error('请输入用户名');
      return;
    }
    if (!loginPassword) {
      toast.error('请输入密码');
      return;
    }
    setLoginSubmitting(true);
    try {
      await login({
        username: loginUsername.trim(),
        password: loginPassword,
      });
      toast.success('登录成功');
      navigate('/', { replace: true });
    } catch (err: unknown) {
      logger.error(`Login failed: ${JSON.stringify(err)}`);
      toast.error(extractErrorMsg(err));
    } finally {
      setLoginSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: `url(${campusBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* 半透明白色蒙版层 */}
      <div className="absolute inset-0 bg-white/60" />
      {/* 渐变叠加，增强可读性 */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-50/40 via-white/50 to-blue-100/40" />

      <Card className="w-full max-w-md shadow-2xl relative z-10 bg-white/90 backdrop-blur-sm">
        <CardHeader className="text-center space-y-3 pb-8">
          <div className="mx-auto flex items-center justify-center">
            <img
              src={logoUrl}
              alt="河南开封科技传媒学院 经济学院"
              style={{ width: '112px', height: '112px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
            />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              河南开封科技传媒学院 经济学院
            </p>
            <CardTitle className="text-xl font-semibold text-foreground">
              教学工作台账管理系统
            </CardTitle>
          </div>
          <CardDescription>
            登录账户以管理您的教学工作台账
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-username">用户名</Label>
              <Input
                id="login-username"
                type="text"
                placeholder="请输入用户名"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                autoComplete="username"
                disabled={loginSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">密码</Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={loginPasswordVisible ? 'text' : 'password'}
                  placeholder="请输入密码"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loginSubmitting}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    setLoginPasswordVisible((v) => !v)
                  }
                  tabIndex={-1}
                  aria-label={
                    loginPasswordVisible ? '隐藏密码' : '显示密码'
                  }
                >
                  {loginPasswordVisible ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loginSubmitting}
            >
              {loginSubmitting && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {loginSubmitting ? '登录中...' : '登录'}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            还没有账号？{' '}
            <Link to="/register" className="text-primary hover:underline">
              立即注册
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
