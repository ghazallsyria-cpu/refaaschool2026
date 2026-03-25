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
              value: a.answer_text || a.selected_options,
              file: a.file_url
            };
          });

          setAnswers(answersMap);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [assignmentId, submissionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveGrade = async () => {
    if (grade === '') return;

    setIsSaving(true);

    try {
      const numericGrade = parseFloat(grade);

      await supabase
        .from('assignment_submissions')
        .update({
          grade: numericGrade,
          feedback,
          status: 'graded'
        })
        .eq('id', submissionId);

      setNotification({ type: 'success', message: 'تم الحفظ' });
    } catch (error: any) {
      setNotification({ type: 'error', message: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">

      <div className="p-6 bg-white border-b">
        <h1 className="font-black text-xl">تقييم إجابة الطالب</h1>
      </div>

      <div className="max-w-5xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* الإجابات */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow">
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

        {/* التقييم */}
        <div className="bg-white p-6 rounded-2xl shadow space-y-4">
          <input
            type="number"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="w-full p-3 bg-slate-100 rounded-xl text-center font-black text-xl"
            placeholder="الدرجة"
          />

          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="w-full p-3 bg-slate-100 rounded-xl"
            rows={5}
            placeholder="ملاحظات"
          />

          <button
            onClick={handleSaveGrade}
            disabled={isSaving}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black"
          >
            حفظ
          </button>
        </div>

      </div>

      {notification && (
        <div className="fixed bottom-4 right-4 bg-white shadow p-4 rounded-xl">
          {notification.message}
        </div>
      )}
    </div>
  );
}
