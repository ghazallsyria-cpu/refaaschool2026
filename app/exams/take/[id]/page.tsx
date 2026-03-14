'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { 
  Clock, ChevronLeft, ChevronRight, Send, 
  AlertCircle, CheckCircle2, Timer, 
  ArrowRight, Info, BookOpen
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

      // Create initial attempt
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        // In a real app, we'd check for existing ongoing attempts
        const { data: attempt, error: attemptError } = await supabase
          .from('exam_attempts')
          .insert([{
            exam_id: params.id,
            student_id: user.user.id,
            status: 'ongoing'
          }])
          .select()
          .single();
        
        if (attemptError) console.error('Error creating attempt:', attemptError);
        else setAttemptId(attempt.id);
      }

    } catch (err) {
      console.error('Error fetching quiz:', err);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchQuiz();
  }, [fetchQuiz]);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // 1. Calculate Score (Simplified for demo)
      // In a real app, this should happen server-side or via a secure function
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
        } else if (q.type === 'multi_select') {
          const correctOpts = q.options.filter((o: any) => o.is_correct).map((o: any) => o.id);
          const studentOpts = studentAnswer || [];
          isCorrect = correctOpts.length === studentOpts.length && correctOpts.every((id: any) => studentOpts.includes(id));
          pointsEarned = isCorrect ? q.points : 0;
        }

        totalScore += pointsEarned;

        studentAnswersPayload.push({
          attempt_id: attemptId,
          question_id: q.id,
          selected_option_id: (q.type === 'multiple_choice' || q.type === 'true_false') ? studentAnswer : null,
          text_answer: q.type === 'essay' || q.type === 'fill_in_blank' ? studentAnswer : null,
          is_correct: isCorrect,
          points_earned: pointsEarned
        });
      }

      // 2. Update Attempt
      if (attemptId) {
        await supabase
          .from('exam_attempts')
          .update({
            completed_at: new Date().toISOString(),
            score: totalScore,
            status: 'completed'
          })
          .eq('id', attemptId);

        // 3. Save Answers
        await supabase.from('student_answers').insert(studentAnswersPayload);
      }

      setIsFinished(true);
    } catch (err) {
      console.error('Error submitting quiz:', err);
      alert('حدث خطأ أثناء إرسال الاختبار');
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, questions, answers, attemptId]);

  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0 && !isFinished) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (timeLeft === 0 && !isFinished) {
      handleSubmit();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft, isFinished, handleSubmit]);

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-6"
        >
          <div className="inline-flex p-4 rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-12 w-12" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">تم إرسال الاختبار بنجاح!</h2>
          <p className="text-slate-600">شكراً لك على إتمام الاختبار. سيتم مراجعة إجاباتك وإبلاغك بالنتيجة قريباً.</p>
          <button 
            onClick={() => router.push('/exams')}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all"
          >
            العودة للرئيسية
          </button>
        </motion.div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIdx];
  const progress = ((currentQuestionIdx + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-xl">
              <BookOpen className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 truncate max-w-[200px] sm:max-w-md">
                {exam?.title}
              </h1>
              <p className="text-xs text-slate-500">سؤال {currentQuestionIdx + 1} من {questions.length}</p>
            </div>
          </div>

          {timeLeft !== null && (
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl border font-mono font-bold transition-all",
              timeLeft < 60 ? "bg-red-50 text-red-600 border-red-200 animate-pulse" : "bg-slate-50 text-slate-700 border-slate-200"
            )}>
              <Timer className="h-4 w-4" />
              <span>{formatTime(timeLeft)}</span>
            </div>
          )}
        </div>
        
        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-100">
          <motion.div 
            className="h-full bg-indigo-600"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion?.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-8"
          >
            {/* Question Content */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm uppercase tracking-wider">
                <span>سؤال {currentQuestionIdx + 1}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span>{currentQuestion?.points} نقاط</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-relaxed">
                {currentQuestion?.content}
              </h2>
              {currentQuestion?.media_url && (
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-slate-100">
                  <Image 
                    src={currentQuestion.media_url} 
                    alt="Question media" 
                    fill 
                    className="object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </div>

            {/* Answer Options */}
            <div className="space-y-3">
              {(currentQuestion?.type === 'multiple_choice' || currentQuestion?.type === 'true_false') && (
                <div className="grid gap-3">
                  {currentQuestion.options.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleAnswerChange(currentQuestion.id, option.id)}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-2xl border-2 text-right transition-all group",
                        answers[currentQuestion.id] === option.id
                          ? "bg-indigo-50 border-indigo-600 text-indigo-900 shadow-md shadow-indigo-100"
                          : "bg-white border-slate-100 hover:border-slate-300 text-slate-700"
                      )}
                    >
                      <div className={cn(
                        "h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                        answers[currentQuestion.id] === option.id
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "border-slate-200 group-hover:border-indigo-300"
                      )}>
                        {answers[currentQuestion.id] === option.id && <CheckCircle2 className="h-4 w-4" />}
                      </div>
                      <span className="text-lg font-medium">{option.content}</span>
                    </button>
                  ))}
                </div>
              )}

              {currentQuestion?.type === 'multi_select' && (
                <div className="grid gap-3">
                  {currentQuestion.options.map((option) => {
                    const isSelected = (answers[currentQuestion.id] || []).includes(option.id);
                    return (
                      <button
                        key={option.id}
                        onClick={() => {
                          const current = answers[currentQuestion.id] || [];
                          const next = isSelected 
                            ? current.filter((id: string) => id !== option.id)
                            : [...current, option.id];
                          handleAnswerChange(currentQuestion.id, next);
                        }}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-2xl border-2 text-right transition-all group",
                          isSelected
                            ? "bg-indigo-50 border-indigo-600 text-indigo-900 shadow-md shadow-indigo-100"
                            : "bg-white border-slate-100 hover:border-slate-300 text-slate-700"
                        )}
                      >
                        <div className={cn(
                          "h-6 w-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all",
                          isSelected
                            ? "bg-indigo-600 border-indigo-600 text-white"
                            : "border-slate-200 group-hover:border-indigo-300"
                        )}>
                          {isSelected && <CheckCircle2 className="h-4 w-4" />}
                        </div>
                        <span className="text-lg font-medium">{option.content}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {currentQuestion?.type === 'essay' && (
                <textarea
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  placeholder="اكتب إجابتك هنا بالتفصيل..."
                  className="w-full min-h-[200px] p-4 rounded-2xl border-2 border-slate-100 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-lg leading-relaxed"
                />
              )}

              {currentQuestion?.type === 'fill_in_blank' && (
                <input
                  type="text"
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  placeholder="أدخل الكلمة المفقودة..."
                  className="w-full p-4 rounded-2xl border-2 border-slate-100 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-lg font-bold text-center"
                />
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer Navigation */}
      <footer className="bg-white border-t border-slate-200 p-4 sticky bottom-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <button
            disabled={currentQuestionIdx === 0}
            onClick={() => setCurrentQuestionIdx(prev => prev - 1)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          >
            <ChevronRight className="h-5 w-5" />
            <span>السابق</span>
          </button>

          {currentQuestionIdx === questions.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <Send className="h-5 w-5" />
              )}
              <span>إرسال الاختبار</span>
            </button>
          ) : (
            <button
              onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
              className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
            >
              <span>التالي</span>
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
