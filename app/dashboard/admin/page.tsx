import { Users, GraduationCap, School } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const stats = [
    { name: 'إدارة الطلاب', icon: Users, href: '/dashboard/admin/students' },
    { name: 'إدارة المعلمين', icon: GraduationCap, href: '/dashboard/admin/teachers' },
    { name: 'إدارة الفصول', icon: School, href: '/dashboard/admin/classes' },
  ];

  return (
    <div className="p-8 bg-stone-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-stone-900">لوحة تحكم المدير</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <Link 
            key={stat.name} 
            href={stat.href}
            className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 border border-stone-100 flex items-center space-x-4 space-x-reverse"
          >
            <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
              <stat.icon size={24} />
            </div>
            <h2 className="text-xl font-semibold text-stone-800">{stat.name}</h2>
          </Link>
        ))}
      </div>
    </div>
  );
}
