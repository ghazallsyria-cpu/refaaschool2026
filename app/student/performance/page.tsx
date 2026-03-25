'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { GraduationCap } from 'lucide-react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';

export default function StudentPerformancePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<any>(null);
  const [examAttempts, setExamAttempts] = useState<any[]>([]);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState<any[]>([]);
  const [stats, setStats] = useState({
    avgExamScore: 0,
    avgAssignmentScore: 0,
    completedExams: 0,
    completedAssignments: 0
  });

  const fetchPerformanceData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (userData?.role !== 'student') {
        router.push('/dashboard');
        return;
      }

      const { data: student } = await supabase
        .from('students')
        .select(`id, sections (name, classes (name))`)
        .eq('id', user.id)
        .single();

      setStudentData(student);

      const { data: attempts } = await supabase
        .from('exam_attempts')
        .select(`
          id,
          score,
          status,
          completed_at,
          exams!inner (title, total_marks, max_score, subjects!inner (name))
        `)
        .eq('student_id', user.id)
        .order('completed_at', { ascending: false });

      setExamAttempts(attempts || []);

      const { data: submissions } = await supabase
        .from('assignment_submissions')
        .select(`
          id,
          grade,
          feedback,
          submitted_at,
          status,
          assignments!inner (title, total_marks, subjects!inner (name))
        `)
        .eq('student_id', user.id)
        .order('submitted_at', { ascending: false });

      setAssignmentSubmissions(submissions || []);

      const gradedExams = (attempts || []).filter(a => a.status === 'graded' || a.status === 'completed');
      const totalExamScore = gradedExams.reduce((acc, curr) => acc + (curr.score || 0), 0);
      const totalExamMax = gradedExams.reduce(
        (acc, curr) => acc + (curr.exams?.[0]?.max_score || curr.exams?.[0]?.total_marks || 100),
        0
      );
      const avgExam = totalExamMax > 0 ? (totalExamScore / totalExamMax) * 100 : 0;

      const gradedAssignments = (submissions || []).filter(s => s.status === 'graded');
      const totalAssignScore = gradedAssignments.reduce((acc, curr) => acc + (curr.grade || 0), 0);
      const totalAssignMax = gradedAssignments.reduce(
        (acc, curr) => acc + (curr.assignments?.[0]?.total_marks || 100),
        0
      );
      const avgAssignment = totalAssignMax > 0 ? (totalAssignScore / totalAssignMax) * 100 : 0;

      setStats({
        avgExamScore: Math.round(avgExam),
        avgAssignmentScore: Math.round(avgAssignment),
        completedExams: attempts?.length || 0,
        completedAssignments: submissions?.length || 0
      });

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchPerformanceData();
  }, [fetchPerformanceData]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black">سجل الأداء الأكاديمي</h1>

        <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow">
          <GraduationCap className="h-5 w-5 text-indigo-600" />
          <span className="font-bold">
            {studentData?.sections?.classes?.name} - {studentData?.sections?.name}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'متوسط الامتحانات', value: stats.avgExamScore + '%' },
          { label: 'متوسط الواجبات', value: stats.avgAssignmentScore + '%' },
          { label: 'عدد الامتحانات', value: stats.completedExams },
          { label: 'عدد الواجبات', value: stats.completedAssignments }
        ].map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-5 rounded-2xl shadow"
          >
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="text-2xl font-black mt-2">{item.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-5 rounded-2xl shadow">
          <h2 className="font-bold mb-4">الامتحانات</h2>
          {examAttempts.map((attempt) => (
            <div key={attempt.id} className="border-b py-2">
              <p className="font-semibold">{attempt.exams?.[0]?.title}</p>
              <p className="text-sm text-slate-500">الدرجة: {attempt.score}</p>
            </div>
          ))}
        </div>

        <div className="bg-white p-5 rounded-2xl shadow">
          <h2 className="font-bold mb-4">الواجبات</h2>
          {assignmentSubmissions.map((submission) => (
            <div key={submission.id} className="border-b py-2">
              <p className="font-semibold">{submission.assignments?.[0]?.title}</p>
              <p className="text-sm text-slate-500">الدرجة: {submission.grade}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
