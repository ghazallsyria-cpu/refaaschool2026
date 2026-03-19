'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { supabase } from '@/lib/supabase';
import { FileText, Clock, Link as LinkIcon, User, CheckCircle, AlertCircle, ArrowRight, MessageSquare, Award } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Submission = {
  id: string;
  assignment_id: string;
  student_id: string;
  content: string;
  file_url: string;
  status: string;
  grade: number;
  feedback: string;
  submitted_at: string;
  students?: { users?: { full_name: string } };
  assignments?: { title: string; due_date: string; subjects?: { name: string } };
};

export default function SubmissionGradingPage({ params }: { params: Promise<{ id: string, submissionId: string }> }) {
  const resolvedParams = use(params);
  const assignmentId = resolvedParams.id;
  const submissionId = resolvedParams.submissionId;
  
  const router = useRouter();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Grading Form State
  const [grade, setGrade] = useState<number | ''>('');
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Fetch user role
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      
      const role = userData?.role || 'student';
      setUserRole(role);

      if (role === 'student' || role === 'parent') {
        router.push('/assignments');
        return;
      }

      // Fetch submission details
      const { data: subData, error: subError } = await supabase
        .from('assignment_submissions')
        .select(`
          *,
          students (users (full_name)),
          assignments (title, due_date, subjects (name))
        `)
        .eq('id', submissionId)
        .single();

      if (subError) throw subError;
      
      const sub = subData as unknown as Submission;
      setSubmission(sub);
      if (sub.grade !== null && sub.grade !== undefined) {
        setGrade(sub.grade);
      }
      if (sub.feedback) {
        setFeedback(sub.feedback);
      }

    } catch (error: any) {
      console.error('Error fetching data:', error);
      showNotification('error', 'حدث خطأ أثناء جلب البيانات: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [submissionId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (grade === '' || grade < 0 || grade > 100) {
      showNotification('error', 'يرجى إدخال درجة صحيحة (0-100)');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('assignment_submissions')
        .update({
          grade: Number(grade),
          feedback,
          status: 'graded'
        })
        .eq('id', submissionId);

      if (error) throw error;

      showNotification('success', 'تم حفظ التقييم بنجاح!');
      await fetchData(); // Refresh data
    } catch (error: any) {
      console.error('Error grading submission:', error);
      showNotification('error', 'حدث خطأ أثناء التقييم: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-32 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
        <p className="text-slate-500 font-bold animate-pulse">جاري تحميل التفاصيل...</p>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="text-center py-32">
        <h3 className="text-2xl font-black text-slate-900">التسليم غير موجود</h3>
        <Link href={`/assignments/${assignmentId}`} className="text-indigo-600 hover:underline mt-4 inline-block">العودة للواجب</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-24">
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-8 left-1/2 transform -translate-x-1/2 z-50 px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 transition-all animate-in fade-in slide-in-from-top-4 duration-500 ${
          notification.type === 'success' ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-red-500 text-white shadow-red-100'
        }`}>
          <div className="h-10 w-10 rounded-2xl bg-white/20 flex items-center justify-center">
            {notification.type === 'success' ? <CheckCircle className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
          </div>
          <div className="font-black tracking-tight">{notification.message}</div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/assignments/${assignmentId}`} className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-100 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
          <ArrowRight className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">تقييم تسليم الطالب</h1>
          <p className="text-slate-500 font-medium mt-1">{submission.assignments?.title} - {submission.assignments?.subjects?.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Submission Details */}
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-card rounded-4xl shadow-xl shadow-slate-200/50 border border-white/60 overflow-hidden">
            <div className="p-8 border-b border-slate-100/50 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
                  <User className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">{submission.students?.users?.full_name}</h2>
                  <p className="text-sm text-slate-500 font-medium flex items-center gap-2 mt-1">
                    <Clock className="h-4 w-4" />
                    تم التسليم: {new Date(submission.submitted_at).toLocaleString('ar-EG')}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-8">
              <h3 className="text-lg font-bold text-slate-900 mb-4">نص الإجابة</h3>
              <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 min-h-[150px]">
                {submission.content ? (
                  <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{submission.content}</p>
                ) : (
                  <p className="text-slate-400 italic text-center py-8">لم يقم الطالب بكتابة نص إجابة.</p>
                )}
              </div>

              {submission.file_url && (
                <div className="mt-8 p-6 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                      <FileText className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-indigo-900">الملف المرفق</h4>
                      <p className="text-sm text-indigo-600/70">رابط الإجابة المرفق من الطالب</p>
                    </div>
                  </div>
                  <a 
                    href={submission.file_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="h-12 px-6 rounded-2xl bg-indigo-600 text-sm font-black text-white shadow-sm hover:bg-indigo-700 transition-all flex items-center gap-2 active:scale-95"
                  >
                    <LinkIcon className="h-5 w-5" />
                    <span>فتح الملف</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Grading Form */}
        <div className="space-y-8">
          <div className="glass-card rounded-4xl shadow-xl shadow-slate-200/50 border border-white/60 overflow-hidden sticky top-8">
            <div className="p-6 border-b border-slate-100/50 bg-slate-50/50">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Award className="h-5 w-5 text-indigo-600" />
                التقييم والدرجة
              </h2>
            </div>
            <div className="p-6">
              <form onSubmit={handleGradeSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">الدرجة (من 100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="block w-full rounded-2xl border-0 py-4 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 sm:text-lg font-black transition-all text-center"
                    placeholder="0 - 100"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value ? Number(e.target.value) : '')}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-slate-400" />
                    ملاحظات للمعلم (اختياري)
                  </label>
                  <textarea
                    rows={4}
                    className="block w-full rounded-2xl border-0 py-4 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm transition-all resize-none"
                    placeholder="اكتب ملاحظاتك للطالب هنا..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex justify-center items-center gap-2 rounded-2xl bg-indigo-600 px-8 py-4 text-sm font-black text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <CheckCircle className="h-5 w-5" />
                    )}
                    حفظ التقييم
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
