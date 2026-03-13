import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; // Global styles
import { AppLayout } from '@/components/app-layout';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'مدرسة الرفعة النموذجية - نظام الإدارة',
  description: 'نظام إدارة مدرسة الرفعة النموذجية',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${inter.className} h-screen overflow-hidden bg-slate-50`} suppressHydrationWarning>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
