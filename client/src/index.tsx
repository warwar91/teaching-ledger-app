import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './app';
import './index.css';

// 错误边界组件
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React错误边界捕获到错误:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', fontFamily: 'sans-serif', color: 'red' }}>
          <h1>应用发生错误</h1>
          <pre style={{ background: '#f5f5f5', padding: '20px', overflow: 'auto' }}>
            {this.state.error?.message}
            {'\n'}
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// 简单测试：先渲染一个测试元素
const TestApp = () => {
  const [count, setCount] = React.useState(0);
  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>React测试页面</h1>
      <p>如果你能看到这个页面，说明React正常工作。</p>
      <button onClick={() => setCount(c => c + 1)} style={{ padding: '10px 20px', fontSize: '16px' }}>
        点击次数: {count}
      </button>
      <hr />
      <h2>以下是实际应用：</h2>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </div>
  );
};

// 全局错误捕获
window.addEventListener('error', (event) => {
  console.error('全局错误:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('未处理的Promise拒绝:', event.reason);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <TestApp />
    </ErrorBoundary>
  </React.StrictMode>,
);
