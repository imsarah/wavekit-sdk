import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'WaveKit Demo',
  description: 'Unified wallet adapter for the XRP Ledger (XRPL).',
};

// Apply the saved (or system) theme before paint, so there's no light/dark flash.
const THEME_SCRIPT =
  "try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}
