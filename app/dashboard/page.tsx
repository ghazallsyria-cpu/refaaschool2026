import { Users, GraduationCap, BookOpen, CalendarDays, Plus, Bell } from 'lucide-react';

export default function AdminDashboard() {
  const stats = [
    { name: 'إجمالي الطلاب', value: '1,250', icon: Users, color: 'text-indigo-600' },
    { name: 'إجمالي المعلمين', value: '85', icon: GraduationCap, color: 'text-emerald-600' },
    { name: 'إجمالي الفصول', value: '42', icon: BookOpen, color: 'text-amber-600' },
    { name: 'حضور اليوم', value: '92%', icon: CalendarDays, color: 'text-sky-600' },
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">لوحة تحكم المدير العام</h1>
          <p className="text-slate-500">مرحباً بك، إليك نظرة عامة على أداء المنصة اليوم.</p>
        </div>
        <div className="flex gap-3">
          <button className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">
            <Bell className="h-4 w-4" />
            التنبيهات
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
            <Plus className="h-4 w-4" />
            إجراء سريع
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.name}</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl bg-slate-50 ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Placeholder for future charts/tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">آخر النشاطات</h2>
          <p className="text-slate-500">جاري تحميل البيانات...</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">تنبيهات هامة</h2>
          <p className="text-slate-500">لا توجد تنبيهات حالياً.</p>
        </div>
      </div>
    </div>
  );
}
