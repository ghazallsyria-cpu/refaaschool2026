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
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // تحميل الإجابات مرة واحدة فقط (بدون useEffect يسبب loop)
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
          className="p-8 rounded-2xl border shadow"
        >
          <h3 className="font-bold text-lg">
            {question.text}
            {question.isRequired && <span className="text-red-500">*</span>}
          </h3>

          {/* عرض الصورة */}
          {question.file && (
            <div className="mt-4">
              <img
                src={question.file}
                alt="question"
                className="max-w-full rounded-xl border"
              />
            </div>
          )}

          {/* نص */}
          {question.type === 'text' && (
            <input
              type="text"
              className="w-full p-3 border rounded mt-4"
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
              className="w-full p-3 border rounded mt-4"
              value={answers[question.id] || ''}
              onChange={(e) =>
                handleAnswerChange(question.id, e.target.value)
              }
              disabled={readOnly}
            />
          )}

          {/* خيارات */}
          {question.type === 'multiple_choice' &&
            question.options?.map((option, i) => (
              <label key={i} className="block mt-2">
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
              const isChecked =
                (answers[question.id] || []).includes(option);

              return (
                <label key={i} className="block mt-2">
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

          {/* خطأ */}
          {errors[question.id] && (
            <div className="text-red-500 text-sm mt-2 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors[question.id]}
            </div>
          )}
        </motion.div>
      ))}

      {children}

      {!readOnly && (
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full p-4 bg-indigo-600 text-white rounded-xl"
        >
          {isSubmitting ? 'جاري الإرسال...' : 'إرسال'}
        </button>
      )}
    </form>
  );
}
