'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowRight, User, Calendar, Clock, CheckCircle, AlertCircle, Save, MessageSquare, Star } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import AssignmentForm from '@/components/assignment-form';
import { Question } from '@/components/assignment-builder';

type Assignment = {
  id: string;
  title: string;
  points?: number;
};

type Submission = {
  id: string;
  student_id: string;
  status: string;
  submitted_at: string;
  grade?: number;
  feedback?: string;
  students?: {
    users?: {
      full_name: string;
    };
  };
};

export default function GradingPage({ params }: { params: Promise<{ id: string, submissionId: string }> }) {
  const { id: assignmentId, submissionId } = use(params);
  const router = useRouter();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [grade, setGrade] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: assignmentData } = await supabase
        .from('assignments')
        .select('id, title')
        .eq('id', assignmentId)
        .single();

      if (assignmentData) setAssignment(assignmentData);

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

      const { data: subData } = await supabase
        .from('assignment_submissions')
        .select('*, students(users(full_name))')
        .eq('id', submissionId)
        .single();

      if (subData) {
        setSubmission(subData as any);
        setGrade(subData.grade?.toString() || '');
        setFeedback(subData.feedback || '');

        const { data: answersData } = await supabase
          .from('assignment_answers')
          .select('*')
          .eq('submission_id', submissionId);

        if (answersData) {
          const answersMap: Record<string, any> = {};

          answersData.forEach(a => {
            answersMap[a.question_id] = {
              text: a.answer_text,
              options: a.selected_options,
              file: a.file_url
            };
          });

          setAnswers(answersMap);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [assignmentId, submissionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveGrade = async () => {
    if (grade === '') {
      setNotification({ type: 'error', message: 'يرجى إدخال الدرجة' });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const numericGrade = parseFloat(grade);
      if (isNaN(numericGrade)) {
        setNotification({ type: 'error', message: 'يرجى إدخال درجة صحيحة' });
        return;
      }

      const { error } = await supabase
        .from('assignment_submissions')
        .update({
          grade: numericGrade,
          feedback,
          status: 'graded',
          graded_at: new Date().toISOString(),
          graded_by: user?.id
        })
        .eq('id', submissionId);

      if (error) throw error;

      setNotification({ type: 'success', message: 'تم حفظ التقييم بنجاح' });

      setTimeout(() => setNotification(null), 3000);

      fetchData();
    } catch (error: any) {
      setNotification({ type: 'error', message: 'خطأ في الحفظ: ' + error.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans" dir="rtl">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/assignments/${assignmentId}`} className="p-2 hover:bg-slate-100 rounded-2xl transition-all text-slate-500">
              <ArrowRight className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">تقييم إجابة الطالب</h1>
              <p className="text-xs font-bold text-slate-400">{assignment?.title}</p>
            </div>
          </div>

          <button
            onClick={handleSaveGrade}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-black text-white"
          >
            <Save className="h-4 w-4" />
            حفظ التقييم
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-3xl bg-white shadow">
            <h2 className="font-black mb-4">
              {submission?.students?.users?.full_name}
            </h2>

            <AssignmentForm
              questions={questions}
              onSubmit={() => {}}
              initialAnswers={answers}
              readOnly={true}
            />
          </div>
        </div>

        <div className="p-6 bg-white rounded-3xl shadow">
          <input
            type="number"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="w-full text-center text-2xl font-black p-4 bg-slate-100 rounded-xl mb-4"
          />

          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="w-full p-4 bg-slate-100 rounded-xl mb-4"
            rows={6}
          />

          <button
            onClick={handleSaveGrade}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black"
          >
            حفظ
          </button>
        </div>
      </div>

      {notification && (
        <div className="fixed bottom-6 right-6 p-4 bg-white shadow rounded-xl">
          {notification.message}
        </div>
      )}
    </div>
  );
}
