'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  BarChart2, Users, Clock, CheckCircle, 
  XCircle, AlertCircle, ArrowRight, Download,
  Search, Filter, MoreHorizontal, ChevronRight,
  TrendingUp, TrendingDown, HelpCircle, FileSpreadsheet,
  FileText
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';

type Attempt = {
  id: string;
  student: { full_name: string, email: string };
  started_at: string;
  completed_at: string;
  score: number;
  status: string;
};

type ExamStats = {
  avg_score: number;
  max_score: number;
  min_score: number;
  pass_rate: number;
  total_attempts: number;
};

export default function ExamResults() {
  const params = useParams();
  const router = useRouter();
  const [exam, setExam] = useState<any>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ExamStats | null>(null);
  const [questionAnalytics, setQuestionAnalytics] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: examData } = await supabase
        .from('exams')
        .select('*, subject:subjects(name)')
        .eq('id', params.id)
        .single();
      setExam(examData);

      const { data: attemptsData } = await supabase
        .from('exam_attempts')
        .select(`
          *,
          student:students(id, users(full_name, email))
        `)
        .eq('exam_id', params.id)
        .order('completed_at', { ascending: false });

      const formattedAttempts = (attemptsData || []).map(a => ({
        ...a,
        student: {
          full_name: (a.student as any)?.users?.full_name || 'طالب غير معروف',
          email: (a.student as any)?.users?.email || ''
        }
      }));
      setAttempts(formattedAttempts);

      // Generate mock stats for demo
      if (formattedAttempts.length > 0) {
        const scores = formattedAttempts.map(a => a.score);
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        setStats({
          avg_score: Math.round(avg),
          max_score: Math.max(...scores),
          min_score: Math.min(...scores),
          pass_rate: Math.round((scores.filter(s => s >= 50).length / scores.length) * 100),
          total_attempts: scores.length
        });
      }

      // Mock question analytics
      setQuestionAnalytics([
        { name: 'سؤال 1', correct: 85, type: 'multiple_choice' },
        { name: 'سؤال 2', correct: 42, type: 'multiple_choice' },
        { name: 'سؤال 3', correct: 78, type: 'true_false' },
        { name: 'سؤال 4', correct: 30, type: 'multi_select' },
        { name: 'سؤال 5', correct: 92, type: 'essay' },
      ]);

    } catch (err) {
      console.error('Error fetching results:', err);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
          >
            <ArrowRight className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{exam?.title}</h1>
            <p className="text-slate-500">نتائج وتحليلات الاختبار • {exam?.subject?.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium transition-all">
            <FileSpreadsheet className="h-5 w-5" />
            <span>تصدير Excel</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-medium transition-all shadow-sm shadow-indigo-100">
            <Download className="h-5 w-5" />
            <span>تقرير PDF</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'متوسط الدرجات', value: `${stats?.avg_score}%`, icon: BarChart2, color: 'text-indigo-600', bg: 'bg-indigo-50', trend: '+5%', trendUp: true },
          { label: 'نسبة النجاح', value: `${stats?.pass_rate}%`, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: '+2%', trendUp: true },
          { label: 'أعلى درجة', value: `${stats?.max_score}%`, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50', trend: 'ثابت', trendUp: null },
          { label: 'إجمالي المحاولات', value: stats?.total_attempts, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50', trend: '+12', trendUp: true },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-2xl ${stat.bg}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              {stat.trendUp !== null && (
                <div className={`flex items-center gap-1 text-xs font-bold ${stat.trendUp ? 'text-emerald-600' : 'text-red-600'}`}>
                  {stat.trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  <span>{stat.trend}</span>
                </div>
              )}
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
            <p className="text-2xl font-black text-slate-900">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">أداء الأسئلة</h3>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-3 h-3 rounded-full bg-indigo-500" />
              <span>نسبة الإجابات الصحيحة</span>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={questionAnalytics} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="correct" radius={[8, 8, 0, 0]} barSize={40}>
                  {questionAnalytics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.correct < 50 ? '#ef4444' : '#4f46e5'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-red-50 p-4 rounded-2xl flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-900">تنبيه: السؤال رقم 4 يحتاج مراجعة</p>
              <p className="text-xs text-red-700">نسبة الإجابة الصحيحة منخفضة جداً (30%). قد يكون السؤال غير واضح أو صعب جداً.</p>
            </div>
          </div>
        </div>

        {/* Score Distribution */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-900">توزيع الدرجات</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'ممتاز', value: 40 },
                    { name: 'جيد جداً', value: 30 },
                    { name: 'جيد', value: 20 },
                    { name: 'مقبول', value: 7 },
                    { name: 'ضعيف', value: 3 },
                  ]}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {[0, 1, 2, 3, 4].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            {[
              { label: 'ممتاز (90-100)', value: '40%', color: 'bg-indigo-600' },
              { label: 'جيد جداً (80-89)', value: '30%', color: 'bg-emerald-500' },
              { label: 'جيد (70-79)', value: '20%', color: 'bg-amber-500' },
              { label: 'ضعيف (أقل من 50)', value: '3%', color: 'bg-red-500' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${item.color}`} />
                  <span className="text-xs text-slate-600">{item.label}</span>
                </div>
                <span className="text-xs font-bold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Student Results Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-slate-900">نتائج الطلاب التفصيلية</h3>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="البحث عن طالب..."
              className="pr-10 pl-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none w-full sm:w-64"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">الطالب</th>
                <th className="px-6 py-4">تاريخ التقديم</th>
                <th className="px-6 py-4">الوقت المستغرق</th>
                <th className="px-6 py-4">الدرجة</th>
                <th className="px-6 py-4">الحالة</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attempts.map((attempt) => (
                <tr key={attempt.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                        {attempt.student.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{attempt.student.full_name}</p>
                        <p className="text-xs text-slate-500">{attempt.student.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {new Date(attempt.completed_at).toLocaleDateString('ar-SA')}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-slate-400" />
                      <span>14 دقيقة</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${attempt.score >= 50 ? 'bg-emerald-500' : 'bg-red-500'}`}
                          style={{ width: `${attempt.score}%` }}
                        />
                      </div>
                      <span className={`text-sm font-bold ${attempt.score >= 50 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {attempt.score}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${
                      attempt.score >= 50 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                        : 'bg-red-50 text-red-700 border-red-100'
                    }`}>
                      {attempt.score >= 50 ? 'ناجح' : 'راسب'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-left">
                    <button className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-indigo-600 transition-all">
                      <ChevronRight className="h-5 w-5 rotate-180" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
          <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
            عرض المزيد من النتائج
          </button>
        </div>
      </div>
    </div>
  );
}
