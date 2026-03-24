'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  FileText, 
  PenTool, 
  TrendingUp, 
  Award, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  BookOpen,
  Calendar,
  GraduationCap
} from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
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
        .select(`
          id,
          sections (name, classes (name))
        `)
        .eq('id', user.id)
        .single();
      
      setStudentData(student);

      const { data: attempts, error: attemptsError } = await supabase
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

      if (attemptsError) {
        console.error('Error fetching exam attempts:', attemptsError);
      }

      setExamAttempts(attempts || []);

      const { data: submissions, error: submissionsError } = await supabase
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

      if (submissionsError) {
        console.error('Error fetching assignment submissions:', submissionsError);
      }

      setAssignmentSubmissions(submissions || []);

      const gradedExams = attempts?.filter(a => a.status === 'graded' || a.status === 'completed') || [];
      const totalExamScore = gradedExams.reduce((acc, curr) => acc + (curr.score || 0), 0);

      const totalExamMax = gradedExams.reduce(
        (acc, curr) => acc + (curr.exams?.[0]?.max_score || curr.exams?.[0]?.total_marks || 100),
        0
      );

      const avgExam = totalExamMax > 0 ? (totalExamScore / totalExamMax) * 100 : 0;

      const gradedAssignments = submissions?.filter(s => s.status === 'graded') || [];
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
      console.error('Error fetching performance data:', error);
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
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-slate-500 font-bold animate-pulse">جاري تحميل سجل الأداء...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">سجل الأداء الأكاديمي</h1>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="flex flex-col pr-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">الصف الدراسي</span>
            <span className="text-sm font-black text-slate-900">
              {studentData?.sections?.classes?.name} - {studentData?.sections?.name}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div>{stats.avgExamScore}%</div>
        <div>{stats.avgAssignmentScore}%</div>
        <div>{stats.completedExams}</div>
        <div>{stats.completedAssignments}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          {examAttempts.map((attempt) => (
            <div key={attempt.id}>
              {attempt.exams?.[0]?.title}
              {attempt.score}
            </div>
          ))}
        </div>

        <div>
          {assignmentSubmissions.map((submission) => (
            <div key={submission.id}>
              {submission.assignments?.[0]?.title}
              {submission.grade}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
