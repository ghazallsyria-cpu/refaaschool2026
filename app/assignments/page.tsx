'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Search, Edit2, Trash2, FileText, Calendar, Clock, Link as LinkIcon, X, BookOpen, Users, User, AlertCircle, Share2, Eye, CheckCircle2, Sparkles } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import Link from 'next/link';
import AssignmentBuilder, { Question } from '@/components/assignment-builder';
import { deleteFromCloudinary } from '@/lib/cloudinary';

type Assignment = {
  id: string;
  title: string;
  description: string;
  subject_id: string;
  section_id: string;
  section_ids?: string[];
  teacher_id: string;
  due_date: string;
  created_at: string;
  file_url: string;
  submission_count?: number;
  graded_count?: number;
  subjects?: { name: string };
  sections?: { name: string; classes?: { name: string } };
  teachers?: { users?: { full_name: string } };
};

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);

  const [subjects, setSubjects] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAssignment, setCurrentAssignment] = useState<Partial<Assignment>>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentSubmissions, setStudentSubmissions] = useState<Record<string, boolean>>({});

  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<string | null>(null);

  const [originalFileUrl, setOriginalFileUrl] = useState<string | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      const role = userData?.role || 'student';
      setUserRole(role);

      let query = supabase
        .from('assignments')
        .select(`
          id,title,description,subject_id,section_id,teacher_id,due_date,created_at,file_url,
          subjects (name),
          sections (name, classes (name)),
          teachers (users (full_name))
        `)
        .order('due_date', { ascending: true });

      if (role === 'teacher') query = query.eq('teacher_id', user.id);

      const { data } = await query;

      setAssignments((data as Assignment[]) || []);
    } catch (error: any) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    try {
      const sectionIds = currentAssignment.section_ids || [];

      const basePayload = {
        title: currentAssignment.title,
        description: currentAssignment.description || null,
        subject_id: currentAssignment.subject_id,
        teacher_id: currentAssignment.teacher_id,
        due_date: new Date(currentAssignment.due_date!).toISOString(),
        total_marks: questions.reduce((sum, q) => sum + (q.points || 0), 0),
      };

      // ✅ التصحيح هنا
      const payload: {
        title: string;
        description: string | null;
        subject_id: string;
        teacher_id: string;
        due_date: string;
        total_marks: number;
        section_id: string;
        section_ids: string[];
        file_url?: string | null;
      } = {
        ...basePayload,
        section_id: sectionIds[0],
        section_ids: sectionIds
      };

      if (currentAssignment.id) {
        if (originalFileUrl && originalFileUrl !== (payload.file_url || null)) {
          await deleteFromCloudinary(originalFileUrl, 'raw');
        }

        await supabase
          .from('assignments')
          .update(payload)
          .eq('id', currentAssignment.id);

      } else {
        await supabase.from('assignments').insert([payload]);
      }

      await fetchAssignments();
      setIsModalOpen(false);
      setCurrentAssignment({});
    } catch (error: any) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return <div />;
}
