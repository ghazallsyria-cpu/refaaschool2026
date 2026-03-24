"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import {
  Clock, ChevronLeft, ChevronRight, Send,
  AlertCircle, CheckCircle2, Timer,
  BookOpen, X, Eye, EyeOff
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

type Question = {
  id: string;
  type: string;
  content: string;
  points: number;
  media_url?: string;
  media_type?: string;
  options: { id: string; content: string }[];
};

type Exam = {
  id: string;
  title: string;
  description: string;
  duration: number;
  exam_date: string;
  start_time: string;
  end_time: string;
  max_score: number;
  settings: {
    show_result_immediately: boolean;
    allow_backtracking: boolean;
    allow_review_answers: boolean;
    shuffle_questions: boolean;
    shuffle_options: boolean;
  };
};

export default function TakeQuiz() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPreview = searchParams.get("preview") === "1";

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [finalScore, setFinalScore] = useState<{ score: number; maxScore: number; hasEssay: boolean } | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showUnansweredWarning, setShowUnansweredWarning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchQuiz = useCallback(async () => {
    try {
      const { data: examData, error: examError } = await supabase
        .from("exams")
        .select("*")
        .eq("id", params.id)
        .single();

      if (examError) throw examError;

      // تحقق من التوقيت — المعاينة تتجاوز هذا التحقق
      if (!isPreview && examData.exam_date) {
        const now = new Date();
        const examDate = new Date(examData.exam_date);
        const [sh, sm] = (examData.start_time || "00:00").split(":").map(Number);
        const [eh, em] = (examData.end_time || "23:59").split(":").map(Number);
        const start = new Date(examDate); start.setHours(sh, sm, 0);
        const end = new Date(examDate); end.setHours(eh, em, 0);

        if (now < start) {
          showNotification("error", `الاختبار سيبدأ في ${examData.start_time} بتاريخ ${examData.exam_date}`);
          setTimeout(() => router.push("/exams"), 3000);
          setLoading(false);
          return;
        }
        if (now > end) {
          showNotification("error", "انتهى وقت هذا الاختبار.");
          setTimeout(() => router.push("/exams"), 3000);
          setLoading(false);
          return;
        }
      }

      // تأكد من وجود جميع الإعدادات
      const settings = {
        show_result_immediately: true,
        allow_backtracking: true,
        allow_review_answers: true,
        shuffle_questions: false,
        shuffle_options: false,
        ...examData.settings,
      };
      setExam({ ...examData, settings });

      let questionsData = (await supabase
        .from("questions")
        .select("*, options:question_options(*)")
        .eq("exam_id", params.id)
        .order("order_index")).data || [];

      // خلط الأسئلة إذا كان الإعداد مفعّلاً
      if (settings.shuffle_questions) {
        questionsData = [...questionsData].sort(() => Math.random() - 0.5);
      }

      setQuestions(questionsData);

      // ضبط المؤقت من مدة الاختبار
      if (examData.duration && !isPreview) {
        const durationSeconds = examData.duration * 60;
        if (examData.exam_date && examData.end_time) {
          const now = new Date();
          const examDate = new Date(examData.exam_date);
          const [eh, em] = (examData.end_time || "23:59").split(":").map(Number);
          const end = new Date(examDate); end.setHours(eh, em, 0);
          const secondsUntilEnd = Math.floor((end.getTime() - now.getTime()) / 1000);
          setTimeLeft(Math.min(durationSeconds, secondsUntilEnd > 0 ? secondsUntilEnd : durationSeconds));
        } else {
          setTimeLeft(durationSeconds);
        }
      }

      if (!isPreview) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: attempts } = await supabase
            .from("exam_attempts")
            .select("id, status, score")
            .eq("exam_id", params.id)
            .eq("student_id", user.id);

          if (attempts?.find(a => a.status === "completed" || a.status === "graded")) {
            showNotification("error", "لقد قمت بإتمام هذا الاختبار مسبقاً.");
            setTimeout(() => router.push("/exams"), 2000);
            return;
          }
          const ongoing = attempts?.find(a => a.status === "ongoing");
          if (ongoing) {
            setAttemptId(ongoing.id);
          } else {
            const { data: newAttempt } = await supabase
              .from("exam_attempts")
              .insert([{ exam_id: params.id, student_id: user.id, status: "ongoing" }])
              .select().single();
            if (newAttempt) setAttemptId(newAttempt.id);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching quiz:", err);
    } finally {
      setLoading(false);
    }
  }, [params.id, router, isPreview]);

  useEffect(() => { fetchQuiz(); }, [fetchQuiz]);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting || isPreview) {
      if (isPreview) router.push(`/exams/builder/${params.id}`);
      return;
    }
    setIsSubmitting(true);
    try {
      if (!attemptId) throw new Error("لم يتم إنشاء المحاولة بعد");
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/exams/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ attemptId, examId: params.id, answers }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "حدث خطأ أثناء الإرسال");
      setFinalScore({ score: result.score, maxScore: exam?.max_score || 100, hasEssay: result.hasEssay });
      setIsFinished(true);
    } catch (err: any) {
      showNotification("error", err.message || "حدث خطأ أثناء إرسال الاختبار");
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, answers, attemptId, params.id, isPreview, router, exam]);

  // المؤقت
  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0 && !isFinished) {
      timerRef.current = setInterval(() => setTimeLeft(p => p !== null ? p - 1 : null), 1000);
    } else if (timeLeft === 0 && !isFinished) {
      handleSubmit();
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timeLeft, isFinished, handleSubmit]);

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const isAnswered = (q: Question) => {
    const val = answers[q.id];
    if (q.type === "multi_select") return Array.isArray(val) && val.length > 0;
    return val !== undefined && val !== null && val !== "";
  };

  const canGoNext = () => isAnswered(questions[currentQuestionIdx]);
  const allowBack = exam?.settings?.allow_backtracking !== false;

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  // ===== شاشة التحميل =====
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent" />
    </div>
  );

  // ===== شاشة الانتهاء =====
  if (isFinished) {
    const showScore = exam?.settings?.show_result_immediately !== false;
    const canReview = exam?.settings?.allow_review_answers !== false;
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-6"
        >
          <div className="inline-flex p-4 rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-12 w-12" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">تم إرسال الاختبار بنجاح!</h2>

          {showScore && finalScore && (
            <div className={`p-4 rounded-2xl ${finalScore.hasEssay ? "bg-amber-50 border border-amber-100" : "bg-indigo-50 border border-indigo-100"}`}>
              {finalScore.hasEssay ? (
                <p className="text-amber-700 font-bold">يحتوي الاختبار على أسئلة مقالية — سيتم إعلامك بالدرجة بعد مراجعة المعلم.</p>
              ) : (
                <>
                  <p className="text-slate-500 text-sm font-bold mb-1">درجتك</p>
                  <p className="text-4xl font-black text-indigo-700">{finalScore.score} <span className="text-xl text-slate-400">/ {finalScore.maxScore}</span></p>
                  <p className="text-slate-500 text-sm mt-1">{Math.round((finalScore.score / finalScore.maxScore) * 100)}%</p>
                </>
              )}
            </div>
          )}

          {!showScore && (
            <p className="text-slate-500 font-medium">سيتم إعلامك بالدرجة لاحقاً من قِبَل المعلم.</p>
          )}

          <div className="flex gap-3">
            {canReview && (
              <button onClick={() => { setIsFinished(false); setCurrentQuestionIdx(0); }}
                className="flex-1 py-3 rounded-xl border-2 border-indigo-200 text-indigo-600 font-bold hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
              >
                <Eye className="h-4 w-4" /> مراجعة الإجابات
              </button>
            )}
            <button onClick={() => router.push("/exams")}
              className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all"
            >
              العودة للاختبارات
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIdx];
  const progress = ((currentQuestionIdx + 1) / questions.length) * 100;
  const answeredCount = questions.filter(q => isAnswered(q)).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative" dir="rtl">
      {/* Toast */}
      {notification && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 ${notification.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
          {notification.message}
          <button onClick={() => setNotification(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {isPreview && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-amber-700 font-bold text-sm">
          ⚠️ وضع المعاينة — لن يتم حفظ أي إجابات
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-xl"><BookOpen className="h-5 w-5 text-indigo-600" /></div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 truncate max-w-[200px] sm:max-w-xs">{exam?.title}</h1>
              <p className="text-xs text-slate-500">
                {currentQuestionIdx + 1} / {questions.length} — أجبت على {answeredCount}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Question navigator dots */}
            <div className="hidden sm:flex gap-1">
              {questions.map((q, i) => (
                <button key={q.id} onClick={() => allowBack || i < currentQuestionIdx ? setCurrentQuestionIdx(i) : null}
                  className={cn("h-2.5 w-2.5 rounded-full transition-all", 
                    i === currentQuestionIdx ? "bg-indigo-600 w-5" :
                    isAnswered(q) ? "bg-emerald-400" : "bg-slate-200"
                  )}
                />
              ))}
            </div>
            {timeLeft !== null && (
              <div className={cn("flex items-center gap-2 px-3 py-2 rounded-xl border font-mono font-bold text-sm",
                timeLeft < 120 ? "bg-red-50 text-red-600 border-red-200 animate-pulse" :
                timeLeft < 300 ? "bg-amber-50 text-amber-600 border-amber-200" :
                "bg-slate-50 text-slate-700 border-slate-200"
              )}>
                <Timer className="h-4 w-4" />
                <span>{formatTime(timeLeft)}</span>
              </div>
            )}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-100">
          <motion.div className="h-full bg-indigo-600" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div key={currentQuestion?.id}
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-8"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm uppercase tracking-wider">
                  <span>سؤال {currentQuestionIdx + 1}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                  <span>{currentQuestion?.points} نقطة</span>
                </div>
                {!isAnswered(currentQuestion) && (
                  <span className="text-xs text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg font-bold">
                    مطلوب ✱
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-relaxed">{currentQuestion?.content}</h2>
              {currentQuestion?.media_url && (
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-slate-100">
                  <Image src={currentQuestion.media_url} alt="Question" fill className="object-contain" referrerPolicy="no-referrer" />
                </div>
              )}
            </div>

            <div className="space-y-3">
              {(currentQuestion?.type === "multiple_choice" || currentQuestion?.type === "true_false") && (
                <div className="grid gap-3">
                  {currentQuestion.options.map(option => (
                    <button key={option.id} onClick={() => !isFinished && handleAnswerChange(currentQuestion.id, option.id)}
                      className={cn("flex items-center gap-4 p-4 rounded-2xl border-2 text-right transition-all",
                        isFinished ? "cursor-default" : "cursor-pointer",
                        answers[currentQuestion.id] === option.id
                          ? "bg-indigo-50 border-indigo-600 shadow-md shadow-indigo-100"
                          : "bg-white border-slate-100 hover:border-slate-300"
                      )}
                    >
                      <div className={cn("h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0",
                        answers[currentQuestion.id] === option.id ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-200"
                      )}>
                        {answers[currentQuestion.id] === option.id && <CheckCircle2 className="h-4 w-4" />}
                      </div>
                      <span className="text-lg font-medium text-slate-800">{option.content}</span>
                    </button>
                  ))}
                </div>
              )}

              {currentQuestion?.type === "multi_select" && (
                <div className="grid gap-3">
                  {currentQuestion.options.map(option => {
                    const isSel = (answers[currentQuestion.id] || []).includes(option.id);
                    return (
                      <button key={option.id}
                        onClick={() => {
                          if (isFinished) return;
                          const cur = answers[currentQuestion.id] || [];
                          handleAnswerChange(currentQuestion.id, isSel ? cur.filter((id: string) => id !== option.id) : [...cur, option.id]);
                        }}
                        className={cn("flex items-center gap-4 p-4 rounded-2xl border-2 text-right transition-all",
                          isFinished ? "cursor-default" : "cursor-pointer",
                          isSel ? "bg-indigo-50 border-indigo-600 shadow-md" : "bg-white border-slate-100 hover:border-slate-300"
                        )}
                      >
                        <div className={cn("h-6 w-6 rounded-lg border-2 flex items-center justify-center shrink-0",
                          isSel ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-200"
                        )}>
                          {isSel && <CheckCircle2 className="h-4 w-4" />}
                        </div>
                        <span className="text-lg font-medium text-slate-800">{option.content}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {currentQuestion?.type === "essay" && (
                <textarea value={answers[currentQuestion.id] || ""}
                  onChange={e => !isFinished && handleAnswerChange(currentQuestion.id, e.target.value)}
                  readOnly={isFinished}
                  placeholder="اكتب إجابتك هنا..."
                  className="w-full min-h-[200px] p-4 rounded-2xl border-2 border-slate-100 focus:border-indigo-600 outline-none text-lg leading-relaxed resize-none"
                />
              )}

              {currentQuestion?.type === "fill_in_blank" && (
                <input type="text" value={answers[currentQuestion.id] || ""}
                  onChange={e => !isFinished && handleAnswerChange(currentQuestion.id, e.target.value)}
                  readOnly={isFinished}
                  placeholder="أدخل الإجابة..."
                  className="w-full p-4 rounded-2xl border-2 border-slate-100 focus:border-indigo-600 outline-none text-lg font-bold text-center"
                />
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 p-4 sticky bottom-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <button
            disabled={currentQuestionIdx === 0 || !allowBack}
            onClick={() => setCurrentQuestionIdx(p => p - 1)}
            className={cn("flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all",
              (!allowBack || currentQuestionIdx === 0) ? "opacity-30 cursor-not-allowed text-slate-400" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <ChevronRight className="h-5 w-5" /><span>السابق</span>
          </button>

          {currentQuestionIdx < questions.length - 1 ? (
            <button
              onClick={() => {
                if (!canGoNext() && !isPreview) {
                  setShowUnansweredWarning(true);
                  setTimeout(() => setShowUnansweredWarning(false), 2000);
                  return;
                }
                setCurrentQuestionIdx(p => p + 1);
              }}
              className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
            >
              <span>التالي</span><ChevronLeft className="h-5 w-5" />
            </button>
          ) : (
            !isFinished && (
              <button
                onClick={() => {
                  if (isPreview) { router.push(`/exams/builder/${params.id}`); return; }
                  const unanswered = questions.filter(q => !isAnswered(q)).length;
                  if (unanswered > 0) {
                    if (!confirm(`لديك ${unanswered} سؤال بدون إجابة. هل تريد الإرسال؟`)) return;
                  } else {
                    if (!confirm("هل أنت متأكد من إرسال الاختبار؟ لا يمكن التعديل بعد الإرسال.")) return;
                  }
                  handleSubmit();
                }}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all disabled:opacity-50"
              >
                {isSubmitting ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="h-5 w-5" />}
                <span>{isPreview ? "إنهاء المعاينة" : "إرسال الاختبار"}</span>
              </button>
            )
          )}
        </div>

        {showUnansweredWarning && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-xl text-sm font-bold shadow-lg"
          >
            ⚠️ يرجى الإجابة على هذا السؤال أولاً
          </motion.div>
        )}
      </footer>
    </div>
  );
}
