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

// No mock data

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9'];

export default function ReportsPage() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    avgAttendance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [distributionData, setDistributionData] = useState<any[]>([]);
  const [gradesData, setGradesData] = useState<any[]>([]);

  useEffect(() => {
    fetchBasicStats();
  }, []);

  const fetchBasicStats = async () => {
    setLoading(true);
    try {
      const [
        studentsRes, 
        teachersRes, 
        classesRes, 
        attendanceRes,
        classDistributionRes
      ] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }),
        supabase.from('teachers').select('id', { count: 'exact', head: true }),
        supabase.from('classes').select('id', { count: 'exact', head: true }),
        supabase.from('attendance').select('status, date').gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
        supabase.from('classes').select('level, sections(students(id))')
      ]);

      // Calculate average attendance
      let avgAttendance = 0;
      if (attendanceRes.data && attendanceRes.data.length > 0) {
        const presentCount = attendanceRes.data.filter(a => a.status === 'present').length;
        avgAttendance = Math.round((presentCount / attendanceRes.data.length) * 100);
      }

      setStats({
        totalStudents: studentsRes.count || 0,
        totalTeachers: teachersRes.count || 0,
        totalClasses: classesRes.count || 0,
        avgAttendance: avgAttendance,
      });

      // Process attendance chart data (last 7 days)
      const last7Days = Array.from({length: 7}, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
      }).reverse();

      const chartData = last7Days.map(date => {
        const dayData = attendanceRes.data?.filter(a => a.date === date) || [];
        const present = dayData.filter(a => a.status === 'present').length;
        const absent = dayData.filter(a => a.status === 'absent').length;
        const dayName = new Date(date).toLocaleDateString('ar-SA', { weekday: 'short' });
        return { name: dayName, present, absent };
      }).filter(d => d.present > 0 || d.absent > 0);

      setAttendanceData(chartData);

      // Process distribution data
      if (classDistributionRes.data) {
        const levelCounts: Record<number, number> = {};
        classDistributionRes.data.forEach(cls => {
          const studentCount = cls.sections?.reduce((acc: number, sec: any) => acc + (sec.students?.length || 0), 0) || 0;
          levelCounts[cls.level] = (levelCounts[cls.level] || 0) + studentCount;
        });

        const distData = Object.entries(levelCounts).map(([level, count]) => ({
          name: `الصف ${level}`,
          value: count,
        })).filter(d => d.value > 0);
        
        setDistributionData(distData);
      }

      // We don't have a grades table yet, so we'll leave it empty for now
      setGradesData([]);

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
              {attendanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={attendanceData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ textAlign: 'right' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Line type="monotone" dataKey="present" name="حضور" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="absent" name="غياب" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">لا توجد بيانات كافية</div>
              )}
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
              {gradesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gradesData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">لا توجد بيانات كافية</div>
              )}
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
            {distributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">لا توجد بيانات كافية</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
