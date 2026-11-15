import type { Metadata, Viewport } from 'next';
import { Inter, Bricolage_Grotesque } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display', weight: ['600', '700'] });

export const metadata: Metadata = {
  title: 'Homegrown — fresh food from your neighbors',
  description: 'Buy backyard produce, home-baked goods, seedlings and farm boxes from people near you in NYC.',
};

export const viewport: Viewport = { themeColor: '#1F6F43', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
