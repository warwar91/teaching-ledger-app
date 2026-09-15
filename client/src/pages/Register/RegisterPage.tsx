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

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regPasswordVisible, setRegPasswordVisible] = useState(false);
  const [regSubmitting, setRegSubmitting] = useState(false);

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
          case 400:
            return '输入信息有误，请检查后重试';
          case 401:
            return '用户名或密码错误';
          case 409:
            return '该用户名已被注册，请更换用户名';
          case 429:
            return '操作过于频繁，请稍后再试';
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

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!regUsername.trim()) {
      toast.error('请输入用户名');
      return;
    }
    if (!regPassword) {
      toast.error('请输入密码');
      return;
    }
    if (regPassword.length < 6) {
      toast.error('密码至少6位');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      toast.error('两次输入的密码不一致');
      return;
    }
    setRegSubmitting(true);
    try {
      await register({
        username: regUsername.trim(),
        password: regPassword,
      });
      toast.success('注册成功');
      navigate('/', { replace: true });
    } catch (err: unknown) {
      logger.error(`Register failed: ${JSON.stringify(err)}`);
      toast.error(extractErrorMsg(err));
    } finally {
      setRegSubmitting(false);
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
            注册新账户以管理您的教学工作台账
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reg-username">用户名</Label>
              <Input
                id="reg-username"
                type="text"
                placeholder="请输入用户名"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                autoComplete="username"
                disabled={regSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-password">密码</Label>
              <div className="relative">
                <Input
                  id="reg-password"
                  type={regPasswordVisible ? 'text' : 'password'}
                  placeholder="请输入密码（至少6位）"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={regSubmitting}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    setRegPasswordVisible((v) => !v)
                  }
                  tabIndex={-1}
                  aria-label={
                    regPasswordVisible ? '隐藏密码' : '显示密码'
                  }
                >
                  {regPasswordVisible ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-confirm-password">确认密码</Label>
              <Input
                id="reg-confirm-password"
                type="password"
                placeholder="请再次输入密码"
                value={regConfirmPassword}
                onChange={(e) => setRegConfirmPassword(e.target.value)}
                autoComplete="new-password"
                disabled={regSubmitting}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={regSubmitting}
            >
              {regSubmitting && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {regSubmitting ? '注册中...' : '注册'}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            已有账号？{' '}
            <Link to="/login" className="text-primary hover:underline">
              立即登录
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterPage;
