'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Plus, Search, Filter, BookOpen, Users, 
  BarChart2, Clock, MoreVertical, Edit2, 
  Trash2, Eye, Play, FileText, CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'motion/react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

type Exam = {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  duration: number;
  subject: { name: string };
  section: { name: string } | null;
  _count?: {
    questions: number;
    attempts: number;
  };
  stats?: {
    avg_score: number;
    total_students: number;
  };
};

export default function ExamsDashboard() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchExams = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('exams')
        .select(`
          *,
          subject:subjects(name),
          section:sections(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // In a real app, we'd use a more complex query or multiple queries to get counts
      // For this demo, we'll simulate some stats
      const examsWithStats = data.map(exam => ({
        ...exam,
        _count: {
          questions: Math.floor(Math.random() * 20) + 5,
          attempts: Math.floor(Math.random() * 30)
        },
        stats: {
          avg_score: Math.floor(Math.random() * 40) + 60,
          total_students: Math.floor(Math.random() * 30)
        }
      }));

      setExams(examsWithStats);
    } catch (err) {
      console.error('Error fetching exams:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const filteredExams = exams.filter(exam => {
    const matchesSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || exam.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'draft': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'archived': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'published': return 'منشور';
      case 'draft': return 'مسودة';
      case 'archived': return 'مؤرشف';
      default: return status;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">إدارة الاختبارات</h1>
          <p className="text-slate-500">قم بإنشاء وإدارة الاختبارات التفاعلية لطلابك</p>
        </div>
        <Link 
          href="/exams/builder/new"
          className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200 font-medium"
        >
          <Plus className="h-5 w-5" />
          <span>إنشاء اختبار جديد</span>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الاختبارات', value: exams.length, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'اختبارات منشورة', value: exams.filter(e => e.status === 'published').length, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'إجمالي المحاولات', value: exams.reduce((acc, e) => acc + (e._count?.attempts || 0), 0), icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'متوسط النجاح', value: '84%', icon: BarChart2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4"
          >
            <div className={`p-3 rounded-xl ${stat.bg}`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm text-slate-500">{stat.label}</p>
              <p className="text-xl font-bold text-slate-900">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="البحث عن اختبار..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
          >
            <option value="all">جميع الحالات</option>
            <option value="published">منشور</option>
            <option value="draft">مسودة</option>
            <option value="archived">مؤرشف</option>
          </select>
          <button className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all text-slate-600">
            <Filter className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Exams List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 h-64 animate-pulse"></div>
          ))
        ) : filteredExams.length > 0 ? (
          filteredExams.map((exam) => (
            <motion.div
              key={exam.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden flex flex-col"
            >
              <div className="p-5 flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(exam.status)}`}>
                    {getStatusLabel(exam.status)}
                  </div>
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all">
                        <MoreVertical className="h-5 w-5" />
                      </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content className="bg-white rounded-xl shadow-xl border border-slate-200 p-1 min-w-[160px] z-50 animate-in fade-in zoom-in-95 duration-100">
                        <DropdownMenu.Item asChild>
                          <Link href={`/exams/builder/${exam.id}`} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg outline-none cursor-pointer">
                            <Edit2 className="h-4 w-4" />
                            <span>تعديل الاختبار</span>
                          </Link>
                        </DropdownMenu.Item>
                        <DropdownMenu.Item asChild>
                          <Link href={`/exams/take/${exam.id}`} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg outline-none cursor-pointer">
                            <Eye className="h-4 w-4" />
                            <span>معاينة</span>
                          </Link>
                        </DropdownMenu.Item>
                        <DropdownMenu.Item asChild>
                          <Link href={`/exams/results/${exam.id}`} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg outline-none cursor-pointer">
                            <BarChart2 className="h-4 w-4" />
                            <span>النتائج والتحليلات</span>
                          </Link>
                        </DropdownMenu.Item>
                        <DropdownMenu.Separator className="h-px bg-slate-100 my-1" />
                        <DropdownMenu.Item className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg outline-none cursor-pointer">
                          <Trash2 className="h-4 w-4" />
                          <span>حذف الاختبار</span>
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
                  {exam.title}
                </h3>
                <p className="text-sm text-slate-500 line-clamp-2 mb-4">
                  {exam.description || 'لا يوجد وصف لهذا الاختبار'}
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <BookOpen className="h-4 w-4 text-slate-400" />
                    <span>{exam.subject?.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span>{exam.duration ? `${exam.duration} دقيقة` : 'غير محدد'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <FileText className="h-4 w-4 text-slate-400" />
                    <span>{exam._count?.questions} سؤال</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span>{exam._count?.attempts} محاولة</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-indigo-600">{exam.stats?.avg_score}%</span>
                  <span className="text-xs text-slate-500">متوسط الدرجات</span>
                </div>
                <Link 
                  href={`/exams/results/${exam.id}`}
                  className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors flex items-center gap-1"
                >
                  <span>عرض التفاصيل</span>
                  <Play className="h-3 w-3 rotate-180" />
                </Link>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-300">
            <div className="inline-flex p-4 rounded-full bg-slate-50 mb-4">
              <FileText className="h-10 w-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">لا توجد اختبارات حالياً</h3>
            <p className="text-slate-500 mb-6">ابدأ بإنشاء أول اختبار لك الآن</p>
            <Link 
              href="/exams/builder/new"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition-all font-medium"
            >
              <Plus className="h-5 w-5" />
              <span>إنشاء اختبار جديد</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
