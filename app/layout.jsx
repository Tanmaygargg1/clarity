import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AnalysisProvider } from '@/context/AnalysisContext';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata = {
  title: 'Clarity — Portfolio Analysis',
  description: 'Six layers of real financial analysis. No feel-good metrics. Just what your portfolio actually is.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body
        style={{
          backgroundColor: '#0D0F12',
          color: '#E5E7EB',
          fontFamily: 'var(--font-inter), ui-sans-serif, system-ui, sans-serif',
          minHeight: '100vh',
          margin: 0,
          padding: 0,
        }}
      >
        <AnalysisProvider>{children}</AnalysisProvider>
      </body>
    </html>
  );
}
