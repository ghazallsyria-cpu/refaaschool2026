'use client';

import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
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
  const [answers, setAnswers] = useState<Record<string, any>>(() => {
    return initialAnswers && Object.keys(initialAnswers).length > 0
      ? initialAnswers
      : {};
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAnswerChange = (questionId: string, value: any) => {
    if (readOnly) return;
    setAnswers(prev => ({ ...prev, [questionId]: value }));
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
          className="p-6 border rounded-xl"
        >
          <h3 className="font-bold">
            {question.text}
          </h3>

          {/* عرض الصورة */}
          {question.file && (
            <img
              src={question.file}
              alt="question"
              className="mt-3 max-w-full rounded"
            />
          )}

          {/* نص */}
          {question.type === 'text' && (
            <input
              type="text"
              className="w-full p-3 border mt-3"
              value={answers[question.id] || ''}
              onChange={(e) =>
                handleAnswerChange(question.id, e.target.value)
              }
              disabled={readOnly}
            />
          )}

          {/* أخطاء */}
          {errors[question.id] && (
            <div className="text-red-500 text-sm mt-2 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors[question.id]}
            </div>
          )}
        </motion.div>
      ))}

      {!readOnly && (
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full p-4 bg-indigo-600 text-white rounded-xl"
        >
          إرسال
        </button>
      )}

      {children}
    </form>
  );
}
