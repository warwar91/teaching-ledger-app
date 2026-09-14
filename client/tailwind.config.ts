import type { Config } from 'tailwindcss';

/**
 * Tailwind CSS v4 配置
 * 主题变量（颜色、字体、圆角、阴影等）在 client/src/tailwind-theme.css 的 @theme 中定义
 * 此文件仅指定内容扫描路径
 */
export default {
  content: [
    './src/**/*.{ts,tsx,css}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
