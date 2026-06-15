/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', 'Pretendard', 'system-ui', 'sans-serif'],
      },
      colors: {
        panel: '#151922',
        panel2: '#1c2230',
        line: '#2b3445',
        ink: '#e8edf6',
        muted: '#8d9aae',
        acid: '#8ee66b',
        amber: '#ffca61',
        cyan: '#66d9ef',
        danger: '#ff6b81',
      },
    },
  },
  plugins: [],
};
