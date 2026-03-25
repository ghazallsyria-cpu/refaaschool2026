'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Send } from 'lucide-react';
import { motion } from 'motion/react';
import { Question } from './assignment-builder';

interface AssignmentFormProps {
  questions: Question[];
  onSubmit: (answers: Record<string, any>) => void;
  isSubmitting?: boolean;
  initialAnswers?: Record<string, any>;
  readOnly?: boolean;
  children?: React.ReactNode;
}

export default function AssignmentForm({
  questions,
  onSubmit,
  isSubmitting,
  initialAnswers = {},
  readOnly = false,
  children
}: AssignmentFormProps) {
  const [answers, setAnswers] = useState<Record<string, any>>(initialAnswers);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // إصلاح: منع setState غير الضروري داخل useEffect
  useEffect(() => {
    if (!initialAnswers) return;

    setAnswers(prev => {
      const same =
        JSON.stringify(prev) === JSON.stringify(initialAnswers);
      return same ? prev : initialAnswers;
    });
  }, [initialAnswers]);

  const handleAnswerChange = (questionId: string, value: any) => {
    if (readOnly) return;

    setAnswers(prev => ({ ...prev, [questionId]: value }));

    if (errors[questionId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }
  };

  const handleCheckboxChange = (
    questionId: string,
    option: string,
    checked: boolean
  ) => {
    if (readOnly) return;

    const currentAnswers = (answers[questionId] as string[]) || [];
    let newAnswers: string[];

    if (checked) {
      newAnswers = [...currentAnswers, option];
    } else {
      newAnswers = currentAnswers.filter(a => a !== option);
    }

    handleAnswerChange(questionId, newAnswers);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    questions.forEach(q => {
      if (q.isRequired) {
        const answer = answers[q.id];

        if (!answer || (Array.isArray(answer) && answer.length === 0)) {
          newErrors[q.id] = 'هذا السؤال مطلوب';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;

    if (validate()) {
      onSubmit(answers);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {questions.map((question, index) => (
        <motion.div
          key={question.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="glass-card p-8 rounded-4xl border border-white/60 shadow-xl"
        >
          <div className="flex flex-col gap-6">

            {/* السؤال */}
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-xl font-black text-slate-900">
                {question.text}
                {question.isRequired && <span className="text-red-500 mr-1">*</span>}
              </h3>

              <div className="text-xs font-bold text-slate-400">
                {question.points} نقاط
              </div>
            </div>

            {/* عرض الصورة إن وجدت */}
            {question.file && (
              <div className="mt-2">
                <img
                  src={question.file}
                  alt="question"
                  className="max-w-full rounded-xl border"
                />
              </div>
            )}

            {/* الإدخالات */}
            <div className="space-y-4">

              {/* نص */}
              {question.type === 'text' && (
                <input
                  type="text"
                  className="w-full p-4 rounded-xl bg-slate-50"
                  value={answers[question.id] || ''}
                  onChange={(e) =>
                    handleAnswerChange(question.id, e.target.value)
                  }
                  disabled={readOnly}
                />
              )}

              {/* فقرة */}
              {question.type === 'paragraph' && (
                <textarea
                  rows={4}
                  className="w-full p-4 rounded-xl bg-slate-50"
                  value={answers[question.id] || ''}
                  onChange={(e) =>
                    handleAnswerChange(question.id, e.target.value)
                  }
                  disabled={readOnly}
                />
              )}

              {/* اختيار متعدد */}
              {question.type === 'multiple_choice' &&
                question.options?.map((option, i) => (
                  <label key={i} className="flex gap-3 items-center">
                    <input
                      type="radio"
                      name={question.id}
                      checked={answers[question.id] === option}
                      onChange={() =>
                        handleAnswerChange(question.id, option)
                      }
                      disabled={readOnly}
                    />
                    {option}
                  </label>
                ))}

              {/* checkbox */}
              {question.type === 'checkbox' &&
                question.options?.map((option, i) => {
                  const isChecked = (answers[question.id] || []).includes(option);

                  return (
                    <label key={i} className="flex gap-3 items-center">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) =>
                          handleCheckboxChange(
                            question.id,
                            option,
                            e.target.checked
                          )
                        }
                        disabled={readOnly}
                      />
                      {option}
                    </label>
                  );
                })}
            </div>

            {/* الخطأ */}
            {errors[question.id] && (
              <div className="text-red-500 text-sm">
                <AlertCircle className="inline w-4 h-4 mr-1" />
                {errors[question.id]}
              </div>
            )}
          </div>
        </motion.div>
      ))}

      {children}

      {!readOnly && (
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full p-5 bg-indigo-600 text-white rounded-2xl"
        >
          {isSubmitting ? 'جاري الإرسال...' : 'إرسال'}
        </button>
      )}
    </form>
  );
}
