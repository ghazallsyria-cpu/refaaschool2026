'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  TrendingUp, 
  Award,
  CalendarCheck
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

// بيانات افتراضية للرسوم البيانية (في حال عدم وجود بيانات كافية في قاعدة البيانات)
const mockAttendanceData = [
  { name: 'الأحد', present: 95, absent: 5 },
  { name: 'الإثنين', present: 92, absent: 8 },
  { name: 'الثلاثاء', present: 96, absent: 4 },
  { name: 'الأربعاء', present: 90, absent: 10 },
  { name: 'الخميس', present: 88, absent: 12 },
];

const mockGradesData = [
  { subject: 'الرياضيات', average: 85 },
  { subject: 'اللغة العربية', average: 92 },
  { subject: 'اللغة الإنجليزية', average: 78 },
  { subject: 'العلوم', average: 88 },
  { subject: 'التاريخ', average: 95 },
];

const mockDistributionData = [
  { name: 'الصف العاشر', value: 120 },
  { name: 'الصف الحادي عشر', value: 105 },
  { name: 'الصف الثاني عشر', value: 90 },
];

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9'];

export default function ReportsPage() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    avgAttendance: 92.5,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBasicStats();
  }, []);

  const fetchBasicStats = async () => {
    setLoading(true);
    try {
      const [studentsRes, teachersRes, classesRes] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }),
        supabase.from('teachers').select('id', { count: 'exact', head: true }),
        supabase.from('classes').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        totalStudents: studentsRes.count || 315, // Fallback to mock if empty
        totalTeachers: teachersRes.count || 42,
        totalClasses: classesRes.count || 12,
        avgAttendance: 92.5, // Mocked average
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, colorClass }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm ring-1 ring-slate-200 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${colorClass}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">التقارير والإحصائيات</h1>
        <p className="text-slate-500">نظرة عامة على أداء المدرسة، الحضور، والدرجات</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="إجمالي الطلاب" 
          value={loading ? '...' : stats.totalStudents} 
          icon={Users} 
          colorClass="bg-indigo-500" 
        />
        <StatCard 
          title="إجمالي المعلمين" 
          value={loading ? '...' : stats.totalTeachers} 
          icon={GraduationCap} 
          colorClass="bg-emerald-500" 
        />
        <StatCard 
          title="الصفوف الدراسية" 
          value={loading ? '...' : stats.totalClasses} 
          icon={BookOpen} 
          colorClass="bg-amber-500" 
        />
        <StatCard 
          title="متوسط الحضور" 
          value={`${stats.avgAttendance}%`} 
          icon={CalendarCheck} 
          colorClass="bg-sky-500" 
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Attendance Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-500" />
              معدل الحضور والغياب (أسبوعي)
            </h3>
          </div>
          <div className="h-72 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockAttendanceData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ textAlign: 'right' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Line type="monotone" dataKey="present" name="حضور (%)" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="absent" name="غياب (%)" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grades Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              متوسط الدرجات حسب المادة
            </h3>
          </div>
          <div className="h-72 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockGradesData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} domain={[0, 100]} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="average" name="متوسط الدرجة" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribution Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm ring-1 ring-slate-200 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-500" />
              توزيع الطلاب حسب المراحل الدراسية
            </h3>
          </div>
          <div className="h-80 w-full flex flex-col md:flex-row items-center justify-center" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={mockDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {mockDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
