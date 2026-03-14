'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Plus, Save, Eye, Settings, Trash2, 
  Copy, GripVertical, Image as ImageIcon, 
  Video, FileText, ChevronDown, Check,
  X, HelpCircle, AlertCircle, ArrowRight,
  MoreVertical, Type, List, CheckSquare,
  AlignLeft, Hash, Link as LinkIcon
} from 'lucide-react';
import { motion, Reorder, AnimatePresence } from 'motion/react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import * as Switch from '@radix-ui/react-switch';

type QuestionType = 'multiple_choice' | 'true_false' | 'multi_select' | 'essay' | 'fill_in_blank' | 'matching' | 'ordering';

type Option = {
  id: string;
  content: string;
  is_correct: boolean;
};

type Question = {
  id: string;
  type: QuestionType;
  content: string;
  points: number;
  explanation?: string;
  options: Option[];
  media_url?: string;
  media_type?: 'image' | 'video' | 'pdf';
};

type ExamData = {
  id?: string;
  title: string;
  description: string;
  subject_id: string;
  section_id?: string;
  duration: number;
  max_attempts: number;
  status: 'draft' | 'published';
  settings: {
    shuffle_questions: boolean;
    shuffle_options: boolean;
    show_result_immediately: boolean;
    allow_backtracking: boolean;
  };
};

export default function QuizBuilder() {
  const params = useParams();
  const router = useRouter();
  const isNew = params.id === 'new';
  
  const [exam, setExam] = useState<ExamData>({
    title: '',
    description: '',
    subject_id: '',
    duration: 30,
    max_attempts: 1,
    status: 'draft',
    settings: {
      shuffle_questions: false,
      shuffle_options: false,
      show_result_immediately: true,
      allow_backtracking: true
    }
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [subjects, setSubjects] = useState<{id: string, name: string}[]>([]);
  const [sections, setSections] = useState<{id: string, name: string}[]>([]);
  const [activeTab, setActiveTab] = useState('questions');

  const addQuestion = useCallback((type: QuestionType) => {
    const newQuestion: Question = {
      id: crypto.randomUUID(),
      type,
      content: '',
      points: 1,
      options: type === 'multiple_choice' || type === 'multi_select' 
        ? [
            { id: crypto.randomUUID(), content: 'الخيار الأول', is_correct: true },
            { id: crypto.randomUUID(), content: 'الخيار الثاني', is_correct: false }
          ]
        : type === 'true_false'
        ? [
            { id: crypto.randomUUID(), content: 'صح', is_correct: true },
            { id: crypto.randomUUID(), content: 'خطأ', is_correct: false }
          ]
        : []
    };
    setQuestions(prev => [...prev, newQuestion]);
  }, []);

  const fetchInitialData = useCallback(async () => {
    try {
      const [subjectsRes, sectionsRes] = await Promise.all([
        supabase.from('subjects').select('id, name'),
        supabase.from('sections').select('id, name')
      ]);
      if (subjectsRes.data) setSubjects(subjectsRes.data);
      if (sectionsRes.data) setSections(sectionsRes.data);

      if (!isNew) {
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
      } else {
        // Default first question
        addQuestion('multiple_choice');
      }
    } catch (err) {
      console.error('Error fetching builder data:', err);
    } finally {
      setLoading(false);
    }
  }, [isNew, params.id, addQuestion]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const deleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const duplicateQuestion = (id: string) => {
    const question = questions.find(q => q.id === id);
    if (question) {
      const duplicated = {
        ...question,
        id: crypto.randomUUID(),
        options: question.options.map(o => ({ ...o, id: crypto.randomUUID() }))
      };
      const index = questions.findIndex(q => q.id === id);
      const newQuestions = [...questions];
      newQuestions.splice(index + 1, 0, duplicated);
      setQuestions(newQuestions);
    }
  };

  const addOption = (questionId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          options: [...q.options, { id: crypto.randomUUID(), content: '', is_correct: false }]
        };
      }
      return q;
    }));
  };

  const updateOption = (questionId: string, optionId: string, updates: Partial<Option>) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        const newOptions = q.options.map(o => {
          if (o.id === optionId) {
            // If setting to correct and it's MCQ or T/F, uncheck others
            if (updates.is_correct && (q.type === 'multiple_choice' || q.type === 'true_false')) {
              return { ...o, ...updates };
            }
            return { ...o, ...updates };
          }
          if (updates.is_correct && (q.type === 'multiple_choice' || q.type === 'true_false')) {
            return { ...o, is_correct: false };
          }
          return o;
        });
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const deleteOption = (questionId: string, optionId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return { ...q, options: q.options.filter(o => o.id !== optionId) };
      }
      return q;
    }));
  };

  const handleSave = async () => {
    if (!exam.title || !exam.subject_id) {
      alert('يرجى إدخال عنوان الاختبار والمادة');
      return;
    }

    setSaving(true);
    try {
      // 1. Save Exam
      let examId = exam.id;
      const examPayload = {
        ...exam,
        teacher_id: (await supabase.auth.getUser()).data.user?.id // In real app, get from teacher table
      };

      if (isNew) {
        // Need to find teacher_id first
        const { data: teacher, error: teacherError } = await supabase.from('teachers').select('id').eq('id', examPayload.teacher_id).single();
        if (teacherError || !teacher) {
          throw new Error('لم يتم العثور على سجل المعلم. يرجى التأكد من تسجيل الدخول كمعلم.');
        }
        const { data: newExam, error } = await supabase
          .from('exams')
          .insert([{ ...exam, teacher_id: teacher.id }])
          .select()
          .single();
        if (error) throw error;
        examId = newExam.id;
      } else {
        const { error } = await supabase
          .from('exams')
          .update(exam)
          .eq('id', examId);
        if (error) throw error;
      }

      // 2. Save Questions (Delete old ones and insert new ones for simplicity in this demo)
      // In production, you'd want to sync them properly
      await supabase.from('questions').delete().eq('exam_id', examId);

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const { data: newQ, error: qError } = await supabase
          .from('questions')
          .insert([{
            exam_id: examId,
            type: q.type,
            content: q.content,
            points: q.points,
            explanation: q.explanation,
            order_index: i,
            media_url: q.media_url,
            media_type: q.media_type
          }])
          .select()
          .single();

        if (qError) throw qError;

        if (q.options.length > 0) {
          const optionsPayload = q.options.map((o, idx) => ({
            question_id: newQ.id,
            content: o.content,
            is_correct: o.is_correct,
            order_index: idx
          }));
          await supabase.from('question_options').insert(optionsPayload);
        }
      }

      router.push('/exams');
    } catch (err: any) {
      console.error('Error saving quiz:', err);
      // If err is an object, try to stringify it, otherwise use message
      const errorMessage = (err && typeof err === 'object') ? JSON.stringify(err, Object.getOwnPropertyNames(err)) : String(err);
      console.error('Full error details:', errorMessage);
      alert(`حدث خطأ أثناء حفظ الاختبار: ${err.message || errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-slate-900 truncate max-w-[200px]">
                {exam.title || 'اختبار جديد'}
              </h1>
              <p className="text-xs text-slate-500">جاري الحفظ تلقائياً...</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => router.push(`/exams/take/${params.id}`)}
              className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
            >
              <Eye className="h-4 w-4" />
              <span>معاينة</span>
            </button>
            <Dialog.Root>
              <Dialog.Trigger asChild>
                <button className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-all">
                  <Settings className="h-5 w-5" />
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between mb-6">
                    <Dialog.Title className="text-xl font-bold text-slate-900">إعدادات الاختبار</Dialog.Title>
                    <Dialog.Close className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                      <X className="h-5 w-5" />
                    </Dialog.Close>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-slate-900 border-b pb-2">الإعدادات العامة</h4>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-700">ترتيب الأسئلة عشوائياً</p>
                          <p className="text-xs text-slate-500">تغيير ترتيب الأسئلة لكل طالب</p>
                        </div>
                        <Switch.Root 
                          checked={exam.settings.shuffle_questions}
                          onCheckedChange={(val) => setExam({...exam, settings: {...exam.settings, shuffle_questions: val}})}
                          className="w-11 h-6 bg-slate-200 rounded-full relative data-[state=checked]:bg-indigo-600 transition-colors outline-none cursor-pointer"
                        >
                          <Switch.Thumb className="block w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-100 translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[22px]" />
                        </Switch.Root>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-700">ترتيب الخيارات عشوائياً</p>
                          <p className="text-xs text-slate-500">تغيير ترتيب خيارات الإجابة</p>
                        </div>
                        <Switch.Root 
                          checked={exam.settings.shuffle_options}
                          onCheckedChange={(val) => setExam({...exam, settings: {...exam.settings, shuffle_options: val}})}
                          className="w-11 h-6 bg-slate-200 rounded-full relative data-[state=checked]:bg-indigo-600 transition-colors outline-none cursor-pointer"
                        >
                          <Switch.Thumb className="block w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-100 translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[22px]" />
                        </Switch.Root>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-700">إظهار النتيجة فوراً</p>
                          <p className="text-xs text-slate-500">عرض الدرجة للطالب بعد الإرسال</p>
                        </div>
                        <Switch.Root 
                          checked={exam.settings.show_result_immediately}
                          onCheckedChange={(val) => setExam({...exam, settings: {...exam.settings, show_result_immediately: val}})}
                          className="w-11 h-6 bg-slate-200 rounded-full relative data-[state=checked]:bg-indigo-600 transition-colors outline-none cursor-pointer"
                        >
                          <Switch.Thumb className="block w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-100 translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[22px]" />
                        </Switch.Root>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500">مدة الاختبار (دقيقة)</label>
                        <input 
                          type="number" 
                          value={exam.duration}
                          onChange={(e) => setExam({...exam, duration: parseInt(e.target.value)})}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500">عدد المحاولات</label>
                        <input 
                          type="number" 
                          value={exam.max_attempts}
                          onChange={(e) => setExam({...exam, max_attempts: parseInt(e.target.value)})}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-xl hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200 font-medium disabled:opacity-50"
            >
              {saving ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <Save className="h-5 w-5" />
              )}
              <span>حفظ</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Quiz Header Info */}
        <div className="bg-white rounded-3xl border-t-[12px] border-t-indigo-600 border border-slate-200 shadow-sm p-6 space-y-4">
          <input 
            type="text"
            placeholder="عنوان الاختبار"
            value={exam.title}
            onChange={(e) => setExam({...exam, title: e.target.value})}
            className="w-full text-3xl font-bold text-slate-900 border-none focus:ring-0 placeholder:text-slate-300 p-0"
          />
          <textarea 
            placeholder="وصف الاختبار (اختياري)"
            value={exam.description}
            onChange={(e) => setExam({...exam, description: e.target.value})}
            className="w-full text-base text-slate-600 border-none focus:ring-0 placeholder:text-slate-300 p-0 resize-none h-12"
          />
          <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-100">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">المادة</label>
              <select 
                value={exam.subject_id}
                onChange={(e) => setExam({...exam, subject_id: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 outline-none bg-white text-sm"
              >
                <option value="">اختر المادة</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">الشعبة (اختياري)</label>
              <select 
                value={exam.section_id}
                onChange={(e) => setExam({...exam, section_id: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 outline-none bg-white text-sm"
              >
                <option value="">جميع الشعب</option>
                {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Questions List */}
        <Reorder.Group axis="y" values={questions} onReorder={setQuestions} className="space-y-6">
          <AnimatePresence initial={false}>
            {questions.map((q, index) => (
              <Reorder.Item 
                key={q.id} 
                value={q}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm group relative overflow-hidden"
              >
                {/* Drag Handle */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                  <GripVertical className="h-4 w-4 text-slate-300" />
                </div>

                <div className="p-6 space-y-6">
                  {/* Question Header */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <input 
                        type="text"
                        placeholder="السؤال"
                        value={q.content}
                        onChange={(e) => updateQuestion(q.id, { content: e.target.value })}
                        className="w-full bg-slate-50 px-4 py-3 rounded-xl border-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 font-medium placeholder:text-slate-400"
                      />
                    </div>
                    <div className="w-full sm:w-48">
                      <select 
                        value={q.type}
                        onChange={(e) => updateQuestion(q.id, { type: e.target.value as QuestionType })}
                        className="w-full px-3 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 outline-none bg-white text-sm font-medium"
                      >
                        <option value="multiple_choice">اختيار من متعدد</option>
                        <option value="true_false">صح أو خطأ</option>
                        <option value="multi_select">اختيار متعدد</option>
                        <option value="essay">سؤال مقالي</option>
                        <option value="fill_in_blank">ملء الفراغ</option>
                      </select>
                    </div>
                  </div>

                  {/* Options Area */}
                  <div className="space-y-3">
                    {q.type === 'multiple_choice' || q.type === 'multi_select' || q.type === 'true_false' ? (
                      <div className="space-y-2">
                        {q.options.map((opt, optIdx) => (
                          <div key={opt.id} className="flex items-center gap-3 group/opt">
                            <button 
                              onClick={() => updateOption(q.id, opt.id, { is_correct: !opt.is_correct })}
                              className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                opt.is_correct 
                                  ? 'bg-emerald-500 border-emerald-500 text-white' 
                                  : 'border-slate-200 hover:border-indigo-500'
                              }`}
                            >
                              {opt.is_correct && <Check className="h-4 w-4" />}
                            </button>
                            <input 
                              type="text"
                              value={opt.content}
                              onChange={(e) => updateOption(q.id, opt.id, { content: e.target.value })}
                              placeholder={`الخيار ${optIdx + 1}`}
                              className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-slate-700 p-0"
                            />
                            {q.options.length > 2 && q.type !== 'true_false' && (
                              <button 
                                onClick={() => deleteOption(q.id, opt.id)}
                                className="p-1.5 opacity-0 group-hover/opt:opacity-100 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-400 transition-all"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        {q.type !== 'true_false' && (
                          <button 
                            onClick={() => addOption(q.id)}
                            className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium pt-2"
                          >
                            <Plus className="h-4 w-4" />
                            <span>إضافة خيار</span>
                          </button>
                        )}
                      </div>
                    ) : q.type === 'essay' ? (
                      <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-sm italic">
                        سيقوم الطالب بكتابة إجابته هنا...
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-sm italic">
                        أدخل النص مع استخدام [____] لمكان الفراغ...
                      </div>
                    )}
                  </div>

                  {/* Question Footer Actions */}
                  <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                        <span className="text-xs font-bold text-slate-500">النقاط:</span>
                        <input 
                          type="number"
                          value={q.points}
                          onChange={(e) => updateQuestion(q.id, { points: parseFloat(e.target.value) })}
                          className="w-12 bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-900 p-0 text-center"
                        />
                      </div>
                      <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all">
                        <ImageIcon className="h-5 w-5" />
                      </button>
                      <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all">
                        <Video className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => duplicateQuestion(q.id)}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all"
                        title="تكرار السؤال"
                      >
                        <Copy className="h-5 w-5" />
                      </button>
                      <button 
                        onClick={() => deleteQuestion(q.id)}
                        className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-all"
                        title="حذف السؤال"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>

        {/* Add Question Button */}
        <div className="flex justify-center pt-4">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex items-center gap-2 bg-white border-2 border-dashed border-slate-300 text-slate-500 px-8 py-4 rounded-3xl hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all font-bold group">
                <Plus className="h-6 w-6 group-hover:scale-110 transition-transform" />
                <span>إضافة سؤال جديد</span>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 min-w-[220px] z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                {[
                  { type: 'multiple_choice', label: 'اختيار من متعدد', icon: List },
                  { type: 'true_false', label: 'صح أو خطأ', icon: CheckSquare },
                  { type: 'multi_select', label: 'اختيار متعدد', icon: CheckSquare },
                  { type: 'essay', label: 'سؤال مقالي', icon: AlignLeft },
                  { type: 'fill_in_blank', label: 'ملء الفراغ', icon: Type },
                ].map((item) => (
                  <DropdownMenu.Item 
                    key={item.type}
                    onClick={() => addQuestion(item.type as QuestionType)}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl outline-none cursor-pointer transition-colors"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </main>

      {/* Floating Bottom Bar for Mobile */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 sm:hidden flex items-center gap-2 bg-white/80 backdrop-blur-md border border-slate-200 p-2 rounded-2xl shadow-2xl z-40">
        <button onClick={() => addQuestion('multiple_choice')} className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200">
          <Plus className="h-6 w-6" />
        </button>
        <button onClick={handleSave} className="p-3 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-200">
          <Save className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}

// Radix Dropdown Components (Simplified import for this demo)
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
