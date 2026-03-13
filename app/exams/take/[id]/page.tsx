'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import {
  ChevronLeft, ChevronRight, Send,
  CheckCircle2, Timer, BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

type Question = {
  id: string;
  type: string;
  content: string;
  points: number;
  media_url?: string;
  media_type?: string;
  options: { id: string, content: string }[];
};

type Exam = {
  id: string;
  title: string;
  description: string;
  duration: number;
  settings: any;
};

export default function TakeQuiz() {

  const params = useParams();
  const router = useRouter();

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const [attemptId, setAttemptId] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchQuiz = useCallback(async () => {

    try {

      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('id', params.id)
        .single();

      if (examError) throw examError;

      setExam(examData);

      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select(`
          *,
          options:question_options(*)
        `)
        .eq('exam_id', params.id)
        .order('order_index');

      if (questionsError) throw questionsError;

      setQuestions(questionsData || []);

      if (examData.duration) {
        setTimeLeft(examData.duration * 60);
      }

      const { data: user } = await supabase.auth.getUser();

      if (user.user) {

        const { data: attempt } = await supabase
          .from('exam_attempts')
          .insert([{
            exam_id: params.id,
            student_id: user.user.id,
            status: 'ongoing'
          }])
          .select()
          .single();

        if (attempt) setAttemptId(attempt.id);
      }

    } catch (err) {
      console.error(err);
    }

    setLoading(false);

  }, [params.id]);

  useEffect(() => {
    fetchQuiz();
  }, [fetchQuiz]);

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = useCallback(async () => {

    if (isSubmitting) return;

    setIsSubmitting(true);

    try {

      let totalScore = 0;
      const studentAnswersPayload = [];

      for (const q of questions) {

        const studentAnswer = answers[q.id];

        let isCorrect = false;
        let pointsEarned = 0;

        if (q.type === 'multiple_choice' || q.type === 'true_false') {

          const correctOpt = q.options.find((o: any) => o.is_correct);

          isCorrect = studentAnswer === correctOpt?.id;

          pointsEarned = isCorrect ? q.points : 0;

        }

        if (q.type === 'multi_select') {

          const correctOpts = q.options.filter((o: any) => o.is_correct).map(o => o.id);

          const studentOpts = studentAnswer || [];

          isCorrect =
            correctOpts.length === studentOpts.length &&
            correctOpts.every(id => studentOpts.includes(id));

          pointsEarned = isCorrect ? q.points : 0;

        }

        totalScore += pointsEarned;

        studentAnswersPayload.push({
          attempt_id: attemptId,
          question_id: q.id,
          selected_option_id:
            (q.type === 'multiple_choice' || q.type === 'true_false')
              ? studentAnswer
              : null,
          text_answer:
            (q.type === 'essay' || q.type === 'fill_in_blank')
              ? studentAnswer
              : null,
          is_correct: isCorrect,
          points_earned: pointsEarned
        });

      }

      if (attemptId) {

        await supabase
          .from('exam_attempts')
          .update({
            completed_at: new Date().toISOString(),
            score: totalScore,
            status: 'completed'
          })
          .eq('id', attemptId);

        await supabase
          .from('student_answers')
          .insert(studentAnswersPayload);

      }

      setIsFinished(true);

    } catch (err) {
      console.error(err);
    }

    setIsSubmitting(false);

  }, [isSubmitting, questions, answers, attemptId]);

  useEffect(() => {

    if (timeLeft !== null && timeLeft > 0 && !isFinished) {

      timerRef.current = setInterval(() => {
        setTimeLeft(prev => prev !== null ? prev - 1 : null);
      }, 1000);

    }

    else if (timeLeft === 0 && !isFinished) {
      handleSubmit();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };

  }, [timeLeft, isFinished, handleSubmit]);

  const formatTime = (seconds: number) => {

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${mins}:${secs.toString().padStart(2, '0')}`;

  };

  if (loading) {

    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-600"></div>
      </div>
    );

  }

  if (isFinished) {

    return (

      <div className="min-h-screen flex items-center justify-center bg-slate-50">

        <div className="bg-white p-8 rounded-3xl shadow-xl text-center space-y-6 max-w-md w-full">

          <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />

          <h2 className="text-2xl font-bold">
            تم إرسال الاختبار بنجاح
          </h2>

          <button
            onClick={() => router.push('/exams')}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl"
          >
            العودة
          </button>

        </div>

      </div>

    );

  }

  const currentQuestion = questions[currentQuestionIdx];

  const progress =
    ((currentQuestionIdx + 1) / questions.length) * 100;

  return (

    <div className="min-h-screen bg-slate-50 flex flex-col">

      <header className="bg-white border-b px-4 py-4 sticky top-0">

        <div className="max-w-4xl mx-auto flex justify-between">

          <div className="flex items-center gap-3">

            <BookOpen className="h-5 w-5 text-indigo-600" />

            <h1 className="font-bold">
              {exam?.title}
            </h1>

          </div>

          {timeLeft !== null && (

            <div className="flex items-center gap-2 font-mono">

              <Timer className="h-4 w-4" />

              {formatTime(timeLeft)}

            </div>

          )}

        </div>

        <div className="h-1 bg-slate-100">

          <div
            className="h-full bg-indigo-600"
            style={{ width: `${progress}%` }}
          />

        </div>

      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full p-6">

        <AnimatePresence mode="wait">

          <motion.div
            key={currentQuestion?.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >

            <h2 className="text-xl font-bold mb-6">
              {currentQuestion?.content}
            </h2>

            <div className="space-y-3">

              {currentQuestion?.options?.map(option => (

                <button
                  key={option.id}
                  onClick={() => handleAnswerChange(currentQuestion.id, option.id)}
                  className={cn(
                    "block w-full text-right p-4 border rounded-xl",
                    answers[currentQuestion.id] === option.id
                      ? "border-indigo-600 bg-indigo-50"
                      : "border-slate-200"
                  )}
                >
                  {option.content}
                </button>

              ))}

            </div>

          </motion.div>

        </AnimatePresence>

      </main>

      <footer className="bg-white border-t p-4">

        <div className="max-w-4xl mx-auto flex justify-between">

          <button
            disabled={currentQuestionIdx === 0}
            onClick={() => setCurrentQuestionIdx(prev => prev - 1)}
          >
            <ChevronRight />
          </button>

          {currentQuestionIdx === questions.length - 1 ? (

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-green-600 text-white px-6 py-2 rounded-lg"
            >
              إرسال
            </button>

          ) : (

            <button
              onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
            >
              <ChevronLeft />
            </button>

          )}

        </div>

      </footer>

    </div>

  );

}
