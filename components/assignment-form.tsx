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

  useEffect(() => {
    if (initialAnswers && Object.keys(initialAnswers).length > 0) {
      setAnswers(initialAnswers);
    }
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

  const handleCheckboxChange = (questionId: string, option: string, checked: boolean) => {
    if (readOnly) return;

    const current = (answers[questionId] as string[]) || [];

    const updated = checked
      ? [...current, option]
      : current.filter(a => a !== option);

    handleAnswerChange(questionId, updated);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    questions.forEach(q => {
      if (q.isRequired) {
        const ans = answers[q.id];
        if (!ans || (Array.isArray(ans) && ans.length === 0)) {
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

      {questions.map((question, index) => {
        const answer = answers[question.id];

        return (
          <motion.div
            key={question.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="p-6 rounded-2xl border bg-white shadow space-y-4"
          >
            <div className="flex justify-between">
              <h3 className="font-black text-lg">
                {question.text}
              </h3>
              <span className="text-xs text-slate-400">
                {question.points} نقاط
              </span>
            </div>

            {/* TEXT */}
            {question.type === 'text' && (
              <input
                type="text"
                value={answer || ''}
                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                disabled={readOnly}
                className="w-full p-3 bg-slate-100 rounded-xl"
              />
            )}

            {/* PARAGRAPH */}
            {question.type === 'paragraph' && (
              <textarea
                rows={4}
                value={answer || ''}
                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                disabled={readOnly}
                className="w-full p-3 bg-slate-100 rounded-xl"
              />
            )}

            {/* MULTIPLE */}
            {question.type === 'multiple_choice' && question.options?.map((opt, i) => (
              <label key={i} className="flex gap-2 items-center">
                <input
                  type="radio"
                  checked={answer === opt}
                  onChange={() => handleAnswerChange(question.id, opt)}
                  disabled={readOnly}
                />
                {opt}
              </label>
            ))}

            {/* CHECKBOX */}
            {question.type === 'checkbox' && question.options?.map((opt, i) => {
              const isChecked = (answer || []).includes(opt);

              return (
                <label key={i} className="flex gap-2 items-center">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => handleCheckboxChange(question.id, opt, e.target.checked)}
                    disabled={readOnly}
                  />
                  {opt}
                </label>
              );
            })}

            {/* IMAGE (الحل الأساسي) */}
            {question.type === 'image' && answer && (
              <div>
                {typeof answer === 'string' ? (
                  <img src={answer} className="max-w-full rounded-xl" />
                ) : (
                  answer?.file && (
                    <img src={answer.file} className="max-w-full rounded-xl" />
                  )
                )}
              </div>
            )}

            {errors[question.id] && (
              <div className="text-red-500 text-sm">
                {errors[question.id]}
              </div>
            )}
          </motion.div>
        );
      })}

      {children}

      {!readOnly && (
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full p-4 bg-indigo-600 text-white rounded-xl font-black"
        >
          {isSubmitting ? '...' : 'إرسال'}
        </button>
      )}

    </form>
  );
}
