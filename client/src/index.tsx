import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './app';
import './index.css';

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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TestApp />
  </React.StrictMode>,
);
