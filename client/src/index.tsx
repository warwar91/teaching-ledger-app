import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// 最简单的测试：直接渲染一个div
const SimpleTest = () => {
  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', background: 'lightblue' }}>
      <h1>React最简单测试</h1>
      <p>如果你能看到这个页面，说明React正常工作。</p>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<SimpleTest />);
