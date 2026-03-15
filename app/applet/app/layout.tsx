import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="ar" dir="rtl">
      <body className="antialiased bg-stone-50 text-stone-900">
        {children}
      </body>
    </html>
  );
}
