'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { supabase } from '@/lib/supabase';
import { FileText, Clock, Link as LinkIcon, Users, User, CheckCircle, AlertCircle, ArrowRight, Upload } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AssignmentForm from '@/components/assignment-form';
import { Question } from '@/components/assignment-builder';

type Assignment = {
  id: string;
  title: string;
  description: string;
  due_date: string;
  file_url: string;
  subjects?: { name: string };
  sections?: { name: string; classes?: { name: string } };
  teachers?: { users?: { full_name: string } };
};

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
};

export default function AssignmentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const assignmentId = resolvedParams.id;
  
  const router = useRouter();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [mySubmission, setMySubmission] = useState<Submission | null>(null);
  const [myAnswers, setMyAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);

  // Submission Form State
  const [content, setContent] = useState('');
  const [fileUrl, setFileUrl] = useState('');
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
      setUserId(user.id);

      // Fetch user role
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      
      const role = userData?.role || 'student';
      setUserRole(role);

      if (role === 'student') {
        const { data: studentData } = await supabase
          .from('students')
          .select('id')
          .eq('id', user.id)
          .single();
        setStudentId(studentData?.id || null);
      }

      // Fetch assignment details
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select(`
          id,
          title,
          description,
          due_date,
          file_url,
          subjects (name),
          sections (name, classes (name)),
          teachers (users (full_name))
        `)
        .eq('id', assignmentId)
        .single();

      if (assignmentError) throw assignmentError;
      setAssignment((assignmentData as unknown) as Assignment);

      // Fetch questions
      const { data: qData } = await supabase
        .from('assignment_questions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('order');
      
      if (qData) {
        setQuestions(qData.map(q => ({
          id: q.id,
          text: q.question_text,
          type: q.question_type as any,
          options: q.options,
          points: q.points,
          isRequired: q.is_required
        })));
      }

      // Fetch submissions based on role
      if (role === 'student') {
        // Fetch only my submission
        const { data: subData, error: subError } = await supabase
          .from('assignment_submissions')
          .select('*')
          .eq('assignment_id', assignmentId)
          .eq('student_id', user.id)
          .maybeSingle();
        
        if (!subError && subData) {
          setMySubmission(subData as Submission);
          setContent(subData.content || '');
          setFileUrl(subData.file_url || '');

          // Fetch answers
          const { data: answersData } = await supabase
            .from('assignment_answers')
            .select('*')
            .eq('submission_id', subData.id);
          
          if (answersData) {
            const answersMap: Record<string, any> = {};
            answersData.forEach(a => {
              answersMap[a.question_id] = a.selected_options || a.answer_text;
            });
            setMyAnswers(answersMap);
          }
        }
      } else if (role === 'teacher' || role === 'admin' || role === 'management') {
        // Fetch all submissions for this assignment
        const { data: subsData, error: subsError } = await supabase
          .from('assignment_submissions')
          .select(`
            *,
            students (users (full_name))
          `)
          .eq('assignment_id', assignmentId)
          .order('submitted_at', { ascending: false });
        
        if (!subsError && subsData) {
          setSubmissions(subsData as unknown as Submission[]);
        }
      }

    } catch (error: any) {
      console.error('Error fetching data:', error);
      // It's possible the table doesn't exist yet, so we catch the error gracefully
      if (error.code === '42P01') {
        console.warn('assignment_submissions table might not exist yet.');
      } else {
        showNotification('error', 'حدث خطأ أثناء جلب البيانات: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  }, [assignmentId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmitAnswers = async (answers: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      // 1. Create or Update Submission
      const submissionPayload = {
        assignment_id: assignmentId,
        student_id: studentId,
        status: 'submitted',
        submitted_at: new Date().toISOString()
      };

      let submissionId: string;
      if (mySubmission) {
        const { error } = await supabase
          .from('assignment_submissions')
          .update(submissionPayload)
          .eq('id', mySubmission.id);
        if (error) throw error;
        submissionId = mySubmission.id;
      } else {
        const { data: newSub, error } = await supabase
          .from('assignment_submissions')
          .insert([submissionPayload])
          .select()
          .single();
        if (error) throw error;
        submissionId = newSub.id;
      }

      // 2. Save Answers
      // Delete old answers
      await supabase.from('assignment_answers').delete().eq('submission_id', submissionId);

      const answersPayload = Object.entries(answers).map(([qId, value]) => {
        const question = questions.find(q => q.id === qId);
        const isMultiple = question?.type === 'multiple_choice' || question?.type === 'checkbox';
        return {
          submission_id: submissionId,
          question_id: qId,
          answer_text: isMultiple ? null : value,
          selected_options: isMultiple ? value : null
        };
      });

      const { error: answersError } = await supabase.from('assignment_answers').insert(answersPayload);
      if (answersError) throw answersError;

      showNotification('success', 'تم تسليم الواجب بنجاح!');
      await fetchData();
    } catch (error: any) {
      console.error('Error submitting assignment:', error);
      showNotification('error', 'حدث خطأ أثناء التسليم: ' + error.message);
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

  if (!assignment) {
    return (
      <div className="text-center py-32">
        <h3 className="text-2xl font-black text-slate-900">الواجب غير موجود</h3>
        <Link href="/assignments" className="text-indigo-600 hover:underline mt-4 inline-block">العودة للواجبات</Link>
      </div>
    );
  }

  const dueDateObj = new Date(assignment.due_date);
  const isOverdue = dueDateObj < new Date();

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
        <Link href="/assignments" className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-100 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
          <ArrowRight className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{assignment.title}</h1>
          <p className="text-slate-500 font-medium mt-1">{assignment.subjects?.name} - {assignment.sections?.classes?.name} {assignment.sections?.name}</p>
        </div>
      </div>

      {/* Assignment Details Card */}
      <div className="glass-card rounded-4xl shadow-xl shadow-slate-200/50 border border-white/60 overflow-hidden">
        <div className="p-8">
          <div className="flex flex-wrap items-center gap-4 mb-8">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-black ${isOverdue ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'}`}>
              <Clock className="h-5 w-5" />
              <span>آخر موعد: {dueDateObj.toLocaleDateString('ar-EG', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-50 text-slate-600 border border-slate-100 text-sm font-bold">
              <User className="h-5 w-5 text-slate-400" />
              <span>أ. {assignment.teachers?.users?.full_name}</span>
            </div>
          </div>

          <div className="prose prose-slate max-w-none mb-8">
            <h3 className="text-xl font-bold text-slate-900 mb-4">وصف الواجب</h3>
            <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{assignment.description || 'لا يوجد وصف إضافي.'}</p>
          </div>

          {assignment.file_url && (
            <div className="mt-8 p-6 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                  <FileText className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">الملف المرفق</h4>
                  <p className="text-sm text-slate-500">انقر للتحميل أو العرض</p>
                </div>
              </div>
              <a 
                href={assignment.file_url} 
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

      {/* Student View: Submission Form */}
      {userRole === 'student' && (
        <div className="glass-card rounded-4xl shadow-xl shadow-slate-200/50 border border-white/60 overflow-hidden">
          <div className="p-8 border-b border-slate-100/50 bg-slate-50/50">
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
                <Upload className="h-6 w-6" />
              </div>
              تسليم الواجب
            </h2>
          </div>
          <div className="p-8">
            {mySubmission?.grade !== undefined && mySubmission?.grade !== null ? (
              <div className="mb-8 p-6 rounded-3xl bg-emerald-50 border border-emerald-100">
                <h3 className="text-lg font-bold text-emerald-800 mb-2">تم التقييم</h3>
                <p className="text-emerald-600 font-medium mb-4">لقد تم تقييم هذا الواجب من قبل المعلم.</p>
                <div className="flex items-center gap-4 mb-4">
                  <div className="px-4 py-2 bg-white rounded-xl shadow-sm border border-emerald-100 font-black text-emerald-700">
                    الدرجة: {mySubmission.grade}
                  </div>
                </div>
                {mySubmission.feedback && (
                  <div className="p-4 bg-white rounded-2xl border border-emerald-100">
                    <p className="text-sm font-bold text-emerald-800 mb-1">ملاحظات المعلم:</p>
                    <p className="text-slate-600">{mySubmission.feedback}</p>
                  </div>
                )}
              </div>
            ) : null}

            {questions.length > 0 ? (
              <AssignmentForm 
                questions={questions} 
                onSubmit={handleSubmitAnswers} 
                isSubmitting={isSubmitting}
                initialAnswers={myAnswers}
                readOnly={mySubmission?.grade !== undefined && mySubmission?.grade !== null}
              />
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); handleSubmitAnswers({}); }} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">نص الإجابة (اختياري إذا كان هناك ملف)</label>
                  <textarea
                    rows={6}
                    className="block w-full rounded-2xl border-0 py-4 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm transition-all resize-none"
                    placeholder="اكتب إجابتك هنا..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={mySubmission?.grade !== undefined && mySubmission?.grade !== null}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">رابط ملف الإجابة (اختياري)</label>
                  <input
                    type="url"
                    className="block w-full rounded-2xl border-0 py-4 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm transition-all"
                    placeholder="https://..."
                    value={fileUrl}
                    onChange={(e) => setFileUrl(e.target.value)}
                    disabled={mySubmission?.grade !== undefined && mySubmission?.grade !== null}
                  />
                  <p className="mt-2 text-xs text-slate-500">يمكنك رفع الملف على Google Drive أو أي خدمة سحابية ووضع الرابط هنا.</p>
                </div>

                {(!mySubmission || (mySubmission.grade === undefined || mySubmission.grade === null)) && (
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
                      {mySubmission ? 'تحديث التسليم' : 'تسليم الواجب'}
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      )}

      {/* Teacher View: Submissions List */}
      {(userRole === 'teacher' || userRole === 'admin' || userRole === 'management') && (
        <div className="glass-card rounded-4xl shadow-xl shadow-slate-200/50 border border-white/60 overflow-hidden">
          <div className="p-8 border-b border-slate-100/50 bg-slate-50/50 flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
                <Users className="h-6 w-6" />
              </div>
              تسليمات الطلاب
            </h2>
            <div className="px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-100 text-sm font-bold text-slate-600">
              الإجمالي: {submissions.length}
            </div>
          </div>
          
          <div className="p-0">
            {submissions.length === 0 ? (
              <div className="text-center py-16">
                <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-slate-300" />
                </div>
                <p className="text-slate-500 font-medium">لم يقم أي طالب بتسليم الواجب حتى الآن.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {submissions.map((sub) => (
                  <div key={sub.id} className="p-6 hover:bg-slate-50/50 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg">{sub.students?.users?.full_name || 'طالب غير معروف'}</h3>
                        <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {new Date(sub.submitted_at).toLocaleString('ar-EG')}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {sub.grade !== null && sub.grade !== undefined ? (
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-sm font-bold">
                            الدرجة: {sub.grade}
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg text-sm font-bold">
                            بانتظار التقييم
                          </span>
                        )}
                        <Link 
                          href={`/assignments/${assignmentId}/submissions/${sub.id}`}
                          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                        >
                          عرض وتقييم
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
