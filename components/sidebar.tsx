'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  School,
  BookOpen,
  CalendarCheck,
  FileText,
  CalendarDays,
  PenTool,
  BarChart3,
  MessageSquare,
  Bell,
  FolderOpen,
  Settings,
  Database,
  X
} from 'lucide-react';

const navigation = [
  { name: 'لوحة التحكم', href: '/', icon: LayoutDashboard },
  { name: 'الطلاب', href: '/students', icon: Users },
  { name: 'المعلمين', href: '/teachers', icon: GraduationCap },
  { name: 'تعيينات المعلمين', href: '/admin/teacher-assignments', icon: BookOpen },
  { name: 'أولياء الأمور', href: '/parents', icon: Users },
  { name: 'الفصول', href: '/classes', icon: School },
  { name: 'المواد الدراسية', href: '/subjects', icon: BookOpen },
  { name: 'الحضور والغياب', href: '/attendance', icon: CalendarCheck },
  { name: 'الاختبارات والدرجات', href: '/exams', icon: FileText },
  { name: 'الجدول الدراسي', href: '/schedule', icon: CalendarDays },
  { name: 'الواجبات', href: '/assignments', icon: PenTool },
  { name: 'التقارير', href: '/reports', icon: BarChart3 },
  { name: 'الرسائل', href: '/messages', icon: MessageSquare },
  { name: 'الإعلانات', href: '/announcements', icon: Bell },
  { name: 'المستندات', href: '/documents', icon: FolderOpen },
  { name: 'استيراد البيانات', href: '/seed', icon: Database },
  { name: 'الإعدادات', href: '/settings', icon: Settings },
];

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col bg-slate-900 text-slate-300">
      <div className="flex h-16 shrink-0 items-center justify-between px-6 bg-slate-950">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600">
            <School className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">مدرسة الرفعة</span>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="lg:hidden p-2 -mr-2 text-slate-400 hover:text-white rounded-md"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto">
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                  'group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors'
                )}
              >
                <item.icon
                  className={cn(
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-white',
                    'mr-3 h-5 w-5 shrink-0 ml-3'
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
