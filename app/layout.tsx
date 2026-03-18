import type { Metadata } from "next";
import "./globals.css";
import { AppLayout } from "@/components/app-layout";
import { NotificationProvider } from "@/context/notification-context";

export const metadata: Metadata = {
  title: "Digital School Platform",
  description: "Professional Digital School Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className="antialiased bg-stone-50 text-stone-900" suppressHydrationWarning>
        <NotificationProvider>
          <AppLayout>
            {children}
          </AppLayout>
        </NotificationProvider>
      </body>
    </html>
  );
}
