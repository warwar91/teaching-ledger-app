import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <div className="w-full max-w-md text-center">
        <h1 className="text-6xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">页面不存在</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          您访问的页面不存在或已被移除。
        </p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          返回首页
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
