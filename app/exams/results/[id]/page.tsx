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
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
      } else {
        setStats({
          avg_score: 0,
          max_score: 0,
          min_score: 0,
          pass_rate: 0,
          total_attempts: 0
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

  const exportToExcel = () => {
    const data = attempts.map(a => ({
      'الطالب': a.student.full_name,
      'البريد الإلكتروني': a.student.email,
      'تاريخ التقديم': new Date(a.completed_at).toLocaleDateString(),
      'الدرجة (%)': a.score,
      'الحالة': a.score >= 50 ? 'ناجح' : 'راسب'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'النتائج');
    XLSX.writeFile(wb, `${exam?.title || 'نتائج_الاختبار'}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text(`نتائج الاختبار: ${exam?.title || ''}`, 14, 15);
    
    autoTable(doc, {
      head: [['الطالب', 'تاريخ التقديم', 'الدرجة (%)', 'الحالة']],
      body: attempts.map(a => [
        a.student.full_name,
        new Date(a.completed_at).toLocaleDateString(),
        a.score.toString(),
        a.score >= 50 ? 'ناجح' : 'راسب'
      ]),
      startY: 20,
    });
    
    doc.save(`${exam?.title || 'نتائج_الاختبار'}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-10 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => router.back()}
            className="h-14 w-14 flex items-center justify-center glass-card rounded-2xl text-slate-500 hover:text-indigo-600 hover:shadow-xl transition-all active:scale-95 border border-white/60"
          >
            <ArrowRight className="h-6 w-6" />
          </button>
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">{exam?.title}</h1>
            <div className="flex items-center gap-3 text-slate-500 font-bold">
              <span className="px-3 py-1 rounded-xl bg-indigo-50 text-indigo-600 text-xs uppercase tracking-widest border border-indigo-100">
                {exam?.subject?.name}
              </span>
              <span className="text-slate-300">•</span>
              <p className="text-lg">نتائج وتحليلات الاختبار</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3 self-start md:self-end">
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-3 px-6 py-4 rounded-2xl glass-card border border-white/60 hover:bg-white/80 text-slate-600 font-black transition-all shadow-xl shadow-slate-200/50 active:scale-95"
          >
            <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
            <span>تصدير Excel</span>
          </button>
          <button 
            onClick={exportToPDF}
            className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 font-black transition-all shadow-xl shadow-indigo-200 active:scale-95"
          >
            <Download className="h-5 w-5" />
            <span>تقرير PDF</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
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
            className="glass-card p-8 rounded-4xl border border-white/60 shadow-2xl shadow-slate-200/50 relative overflow-hidden group"
          >
            <div className="absolute -right-4 -top-4 h-24 w-24 bg-slate-50 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500 -z-10" />
            <div className="flex items-start justify-between mb-6">
              <div className={`h-14 w-14 rounded-2xl ${stat.bg} flex items-center justify-center shadow-inner`}>
                <stat.icon className={`h-7 w-7 ${stat.color}`} />
              </div>
              {stat.trendUp !== null && (
                <div className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black ${stat.trendUp ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                  {stat.trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  <span>{stat.trend}</span>
                </div>
              )}
            </div>
            <p className="text-sm font-black text-slate-500 mb-1 uppercase tracking-widest">{stat.label}</p>
            <p className="text-4xl font-black text-slate-900 tracking-tighter">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Main Chart */}
        <div className="lg:col-span-2 glass-card p-8 rounded-4xl border border-white/60 shadow-2xl shadow-slate-200/50 space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">أداء الأسئلة</h3>
              <p className="text-slate-500 font-bold">تحليل دقة الإجابات لكل سؤال</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest">
                <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-sm shadow-indigo-200" />
                <span>نسبة الإجابات الصحيحة</span>
              </div>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={questionAnalytics} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
                  dy={15}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc', radius: 12 }}
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '16px' }}
                />
                <Bar dataKey="correct" radius={[12, 12, 0, 0]} barSize={48}>
                  {questionAnalytics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.correct < 50 ? '#ef4444' : '#4f46e5'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-red-50/50 p-6 rounded-3xl border border-red-100 flex items-start gap-4 animate-pulse">
            <div className="h-12 w-12 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-lg font-black text-red-900 tracking-tight">تنبيه: السؤال رقم 4 يحتاج مراجعة</p>
              <p className="text-sm text-red-700 font-bold leading-relaxed">نسبة الإجابة الصحيحة منخفضة جداً (30%). قد يكون السؤال غير واضح أو صعب جداً أو يحتاج لإعادة صياغة.</p>
            </div>
          </div>
        </div>

        {/* Score Distribution */}
        <div className="glass-card p-8 rounded-4xl border border-white/60 shadow-2xl shadow-slate-200/50 space-y-8">
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">توزيع الدرجات</h3>
            <p className="text-slate-500 font-bold">نظرة عامة على مستويات الطلاب</p>
          </div>
          <div className="h-[280px] w-full relative">
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
                  innerRadius={75}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {[0, 1, 2, 3, 4].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-4xl font-black text-slate-900 tracking-tighter">{stats?.pass_rate}%</span>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">نسبة النجاح</span>
            </div>
          </div>
          <div className="space-y-4">
            {[
              { label: 'ممتاز (90-100)', value: '40%', color: 'bg-indigo-600' },
              { label: 'جيد جداً (80-89)', value: '30%', color: 'bg-emerald-500' },
              { label: 'جيد (70-79)', value: '20%', color: 'bg-amber-500' },
              { label: 'ضعيف (أقل من 50)', value: '3%', color: 'bg-red-500' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${item.color} shadow-sm`} />
                  <span className="text-sm font-bold text-slate-600">{item.label}</span>
                </div>
                <span className="text-sm font-black text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Student Results Table */}
      <div className="glass-card rounded-4xl border border-white/60 shadow-2xl shadow-slate-200/50 overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">نتائج الطلاب التفصيلية</h3>
            <p className="text-slate-500 font-bold">قائمة كاملة بمحاولات الطلاب ودرجاتهم</p>
          </div>
          <div className="relative group max-w-xs w-full">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            <input 
              type="text" 
              placeholder="البحث عن طالب..."
              className="w-full pr-12 pl-4 py-4 rounded-2xl border-0 bg-slate-50 ring-1 ring-inset ring-slate-100 text-sm font-bold focus:ring-2 focus:ring-indigo-600 outline-none transition-all"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-xs font-black uppercase tracking-widest">
                <th className="px-8 py-6">الطالب</th>
                <th className="px-8 py-6">تاريخ التقديم</th>
                <th className="px-8 py-6">الوقت المستغرق</th>
                <th className="px-8 py-6">الدرجة</th>
                <th className="px-8 py-6">الحالة</th>
                <th className="px-8 py-6 text-left">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attempts.map((attempt) => (
                <tr key={attempt.id} className="hover:bg-slate-50/50 transition-all group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-lg shadow-inner">
                        {attempt.student.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-base font-black text-slate-900 tracking-tight">{attempt.student.full_name}</p>
                        <p className="text-xs text-slate-500 font-bold">{attempt.student.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-sm font-bold text-slate-600">
                    {new Date(attempt.completed_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </td>
                  <td className="px-8 py-6 text-sm font-bold text-slate-600">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-400" />
                      <span>14 دقيقة</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-2 w-24 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${attempt.score >= 50 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]'}`}
                          style={{ width: `${attempt.score}%` }}
                        />
                      </div>
                      <span className={`text-base font-black tracking-tighter ${attempt.score >= 50 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {attempt.score}%
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`inline-flex px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest border ${
                      attempt.score >= 50 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                        : 'bg-red-50 text-red-700 border-red-100'
                    }`}>
                      {attempt.score >= 50 ? 'ناجح' : 'راسب'}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-left">
                    <button className="h-10 w-10 flex items-center justify-center rounded-xl bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 hover:shadow-md transition-all active:scale-95">
                      <ChevronRight className="h-5 w-5 rotate-180" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-6 bg-slate-50/50 border-t border-slate-100 text-center">
          <button className="px-8 py-3 rounded-2xl text-sm font-black text-indigo-600 hover:bg-white hover:shadow-lg transition-all active:scale-95">
            عرض المزيد من النتائج
          </button>
        </div>
      </div>
    </div>
  );
}
