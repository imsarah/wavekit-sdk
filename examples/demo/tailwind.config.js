/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    // Scan the WaveKit React package so the ConnectModal's classes are generated.
    '../../packages/react/src/**/*.{ts,tsx}',
  ],
  theme: { extend: {} },
  plugins: [],
};
